const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');

class NotificationService {
  constructor() {
    // Initialize email transport
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }
    this.fcm = admin.messaging();
  }

  async send(userId, data) {
    const { title, message, type, priority = 'medium', reference, metadata } = data;

    // Create notification record
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      priority,
      reference,
      metadata
    });

    // Get user preferences
    const preferences = await this.getUserPreferences(userId);
    if (!preferences) return notification;

    // Check if notification type is enabled
    if (!preferences.preferences[type]?.enabled) return notification;

    // Send through enabled channels
    const deliveryPromises = [];

    // In-app notification is already created
    notification.deliveryStatus.inApp = {
      delivered: true,
      deliveredAt: new Date()
    };

    // Send push notification if enabled
    if (preferences.isTypeEnabled(type, 'push') && !preferences.isInQuietHours()) {
      deliveryPromises.push(this.sendPushNotification(notification, preferences));
    }

    // Send email if enabled
    if (preferences.isTypeEnabled(type, 'email')) {
      deliveryPromises.push(this.sendEmailNotification(notification, preferences));
    }

    // Wait for all notifications to be sent
    await Promise.allSettled(deliveryPromises);
    await notification.save();

    return notification;
  }

  async sendBookingConfirmation(booking, user) {
    const notification = await this.send(user._id, {
      title: `Booking Confirmed - ${booking.bookingId}`,
      message: `Your ${booking.bookingType} booking has been confirmed.`,
      type: 'booking_confirmation',
      priority: 'high',
      reference: {
        type: 'booking',
        id: booking._id
      },
      metadata: {
        actionUrl: `/bookings/${booking._id}`,
        additionalData: {
          bookingType: booking.bookingType,
          bookingDetails: booking.bookingDetails
        }
      }
    });

    return notification;
  }

  async sendBookingReminder(booking, user) {
    const notification = await this.send(user._id, {
      title: `Upcoming Booking Reminder - ${booking.bookingId}`,
      message: `Your ${booking.bookingType} booking is coming up soon.`,
      type: 'booking_reminder',
      priority: 'medium',
      reference: {
        type: 'booking',
        id: booking._id
      },
      metadata: {
        actionUrl: `/bookings/${booking._id}`,
        additionalData: {
          bookingType: booking.bookingType,
          bookingDetails: booking.bookingDetails
        }
      }
    });

    return notification;
  }

  async sendCancellationConfirmation(booking, user) {
    const notification = await this.send(user._id, {
      title: `Booking Cancelled - ${booking.bookingId}`,
      message: `Your ${booking.bookingType} booking has been cancelled.`,
      type: 'booking_update',
      priority: 'high',
      reference: {
        type: 'booking',
        id: booking._id
      },
      metadata: {
        actionUrl: `/bookings/${booking._id}`,
        additionalData: {
          bookingType: booking.bookingType,
          bookingDetails: booking.bookingDetails,
          cancellationReason: booking.cancellationReason
        }
      }
    });

    return notification;
  }

  async getUserPreferences(userId) {
    let preferences = await NotificationPreference.findOne({ userId });
    
    if (!preferences) {
      preferences = await NotificationPreference.create({ userId });
    }
    
    return preferences;
  }

  async sendPushNotification(notification, preferences) {
    const tokens = preferences.channels.push.tokens.map(t => t.token);
    if (!tokens.length) return;

    const message = {
      notification: {
        title: notification.title,
        body: notification.message
      },
      data: {
        type: notification.type,
        referenceType: notification.reference?.type,
        referenceId: notification.reference?.id?.toString(),
        actionUrl: notification.metadata?.actionUrl
      },
      tokens
    };

    try {
      const response = await this.fcm.sendMulticast(message);
      notification.deliveryStatus.push = {
        delivered: true,
        deliveredAt: new Date(),
        deviceToken: tokens.join(',')
      };
      
      // Remove invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            invalidTokens.push(tokens[idx]);
          }
        });
        
        if (invalidTokens.length) {
          await Promise.all(
            invalidTokens.map(token => preferences.removePushToken(token))
          );
        }
      }
    } catch (error) {
      console.error('Push notification failed:', error);
    }
  }

  async sendEmailNotification(notification, preferences) {
    if (!preferences.channels.email.enabled) return;

    const template = this.getEmailTemplate(notification);
    
    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: preferences.email,
        subject: notification.title,
        html: template
      });

      notification.deliveryStatus.email = {
        delivered: true,
        deliveredAt: new Date(),
        emailId: preferences.email
      };
    } catch (error) {
      console.error('Email notification failed:', error);
    }
  }

  getEmailTemplate(notification) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">${notification.title}</h1>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
          <p>${notification.message}</p>
          ${notification.metadata?.actionUrl ? 
            `<p style="margin-top: 20px;">
              <a href="${notification.metadata.actionUrl}" 
                 style="background-color: #007bff; color: white; padding: 10px 20px; 
                         text-decoration: none; border-radius: 5px;">
                View Details
              </a>
            </p>` : ''
          }
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          You received this email because you subscribed to ${notification.type} notifications.
          <br>
          To update your preferences, visit your notification settings.
        </p>
      </div>
    `;
  }

  getBookingReminderTemplate(booking) {
    // Similar to confirmation template but with reminder-specific content
    // Implementation details...
    return '';
  }

  getCancellationTemplate(booking) {
    // Cancellation email template
    // Implementation details...
    return '';
  }
}

module.exports = new NotificationService();
