const paymentService = require('../services/payment.service');
const { validationResult } = require('express-validator');

exports.getWallet = async (req, res) => {
  try {
    const wallet = await paymentService.getWallet(req.user.id);
    
    res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.addFunds = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, paymentMethod } = req.body;
    const result = await paymentService.addFunds(req.user.id, amount, paymentMethod);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId, paymentResponse } = req.body;
    const transaction = await paymentService.processPayment(transactionId, paymentResponse);
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.makePayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, purpose, paymentMethod, reference } = req.body;
    const transaction = await paymentService.makePayment(
      req.user.id,
      amount,
      purpose,
      paymentMethod,
      reference
    );
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.applyPromotion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, orderValue, type } = req.body;
    const result = await paymentService.applyPromotion(
      code,
      req.user.id,
      orderValue,
      type
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.requestRefund = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId, amount, reason } = req.body;
    const refund = await paymentService.processRefund(transactionId, amount, reason);
    
    res.status(200).json({
      success: true,
      data: refund
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    
    const query = { userId: req.user.id };
    if (type) query.type = type;
    if (status) query.status = status;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reference.id');
      
    const total = await Transaction.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const wallet = await paymentService.getWallet(req.user.id);
    
    res.status(200).json({
      success: true,
      data: wallet.paymentMethods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const wallet = await paymentService.getWallet(req.user.id);
    await wallet.addPaymentMethod(req.body);
    
    res.status(200).json({
      success: true,
      data: wallet.paymentMethods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.removePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const wallet = await paymentService.getWallet(req.user.id);
    await wallet.removePaymentMethod(paymentMethodId);
    
    res.status(200).json({
      success: true,
      data: wallet.paymentMethods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    const wallet = await paymentService.getWallet(req.user.id);
    await wallet.setDefaultPaymentMethod(paymentMethodId);
    
    res.status(200).json({
      success: true,
      data: wallet.paymentMethods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
