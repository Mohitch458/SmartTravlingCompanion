const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Promotion = require('../models/Promotion');

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  async createWallet(userId) {
    const wallet = new Wallet({ userId });
    return wallet.save();
  }

  async getWallet(userId) {
    const wallet = await Wallet.findOne({ userId })
      .populate({
        path: 'transactions',
        options: { sort: { createdAt: -1 }, limit: 10 }
      });
    
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    
    return wallet;
  }

  async addFunds(userId, amount, paymentMethod) {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Create payment intent based on gateway
    let paymentIntent;
    if (paymentMethod.type === 'card') {
      paymentIntent = await this.createStripePaymentIntent(amount, paymentMethod);
    } else {
      paymentIntent = await this.createRazorpayOrder(amount, paymentMethod);
    }

    // Create transaction
    const transaction = await Transaction.createTransaction({
      userId,
      amount,
      type: 'credit',
      category: 'wallet_load',
      paymentMethod,
      gateway: {
        name: paymentMethod.type === 'card' ? 'stripe' : 'razorpay',
        transactionId: paymentIntent.id
      }
    });

    return {
      transaction,
      paymentIntent
    };
  }

  async processPayment(transactionId, paymentResponse) {
    const transaction = await Transaction.findOne({ transactionId });
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      // Verify payment based on gateway
      if (transaction.gateway.name === 'stripe') {
        await this.verifyStripePayment(transaction.gateway.transactionId, paymentResponse);
      } else {
        await this.verifyRazorpayPayment(paymentResponse);
      }

      // Update transaction status
      await transaction.updateStatus('completed', paymentResponse);

      return transaction;
    } catch (error) {
      await transaction.updateStatus('failed', { error: error.message });
      throw error;
    }
  }

  async makePayment(userId, amount, purpose, paymentMethod, reference) {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check transaction limits
    await wallet.checkTransactionLimits(amount);

    // Create debit transaction
    const transaction = await Transaction.createTransaction({
      userId,
      amount,
      type: 'debit',
      category: purpose,
      paymentMethod,
      reference
    });

    return transaction;
  }

  async applyPromotion(code, userId, orderValue, type) {
    const promotion = await Promotion.findOne({ code });
    if (!promotion) {
      throw new Error('Invalid promotion code');
    }

    await promotion.canUserUse(userId);
    
    if (!promotion.applicableFor.includes(type)) {
      throw new Error('Promotion not applicable for this service');
    }

    const discount = promotion.calculateDiscount(orderValue);
    await promotion.use(userId);

    return {
      discount,
      finalAmount: orderValue - discount,
      promotion
    };
  }

  async processRefund(transactionId, amount, reason) {
    const transaction = await Transaction.findOne({ transactionId });
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Process refund with payment gateway
    if (transaction.gateway.name === 'stripe') {
      await this.processStripeRefund(transaction.gateway.transactionId, amount);
    } else {
      await this.processRazorpayRefund(transaction.gateway.transactionId, amount);
    }

    // Create refund in our system
    return transaction.processRefund(amount, reason);
  }

  // Private methods for payment gateway integration
  async createStripePaymentIntent(amount, paymentMethod) {
    return stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'inr',
      payment_method_types: ['card'],
      metadata: {
        integration_check: 'accept_a_payment'
      }
    });
  }

  async createRazorpayOrder(amount, paymentMethod) {
    return this.razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: 'order_' + Math.random().toString(36).substr(2, 9),
      payment_capture: 1
    });
  }

  async verifyStripePayment(paymentIntentId, paymentResponse) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment verification failed');
    }
    return true;
  }

  async verifyRazorpayPayment(paymentResponse) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = paymentResponse;

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      throw new Error('Payment verification failed');
    }

    return true;
  }

  async processStripeRefund(paymentIntentId, amount) {
    return stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount * 100
    });
  }

  async processRazorpayRefund(paymentId, amount) {
    return this.razorpay.payments.refund(paymentId, {
      amount: amount * 100
    });
  }
}

module.exports = new PaymentService();
