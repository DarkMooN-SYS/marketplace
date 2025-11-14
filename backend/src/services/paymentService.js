/**
 * Payment Service - Bank API Integration
 * Supports: QPay, SocialPay, Golomt, Khan Bank, etc.
 */

import { db } from '../config/firebase.js';

/**
 * Generate idempotency key for payment requests
 * Prevents duplicate charges on retry
 */
export function generateIdempotencyKey(userId, amount, timestamp) {
  const data = `${userId}-${amount}-${timestamp}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * QPay Integration
 * https://developer.qpay.mn/
 */
export class QPayService {
  constructor() {
    this.baseURL = process.env.QPAY_API_URL || 'https://merchant.qpay.mn/v2';
    this.username = process.env.QPAY_USERNAME;
    this.password = process.env.QPAY_PASSWORD;
    this.invoiceCode = process.env.QPAY_INVOICE_CODE;
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth token
   */
  async getToken() {
    // Return cached token if valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseURL}/auth/token`,
        {},
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.token = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer
      
      return this.token;
    } catch (error) {
      console.error('QPay token error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with QPay');
    }
  }

  /**
   * Create invoice for payment
   */
  async createInvoice({ userId, amount, description, callbackUrl }) {
    try {
      const token = await this.getToken();
      const idempotencyKey = generateIdempotencyKey(userId, amount, Date.now());

      const response = await axios.post(
        `${this.baseURL}/invoice`,
        {
          invoice_code: this.invoiceCode,
          sender_invoice_no: idempotencyKey,
          invoice_receiver_code: userId,
          invoice_description: description || 'Wallet топ-ап',
          amount: amount,
          callback_url: callbackUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          }
        }
      );

      // Store invoice in database
      await db.collection('payment_invoices').add({
        userId,
        amount,
        provider: 'qpay',
        invoiceId: response.data.invoice_id,
        qrText: response.data.qr_text,
        qrImage: response.data.qr_image,
        urls: response.data.urls || [],
        status: 'pending',
        idempotencyKey,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        invoiceId: response.data.invoice_id,
        qrText: response.data.qr_text,
        qrImage: response.data.qr_image,
        urls: response.data.urls,
        idempotencyKey
      };
    } catch (error) {
      console.error('QPay create invoice error:', error.response?.data || error.message);
      throw new Error('Failed to create QPay invoice');
    }
  }

  /**
   * Check payment status
   */
  async checkPayment(invoiceId) {
    try {
      const token = await this.getToken();

      const response = await axios.post(
        `${this.baseURL}/payment/check`,
        {
          object_type: 'INVOICE',
          object_id: invoiceId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        paid: response.data.paid_amount > 0,
        amount: response.data.paid_amount,
        status: response.data.payment_status
      };
    } catch (error) {
      console.error('QPay check payment error:', error.response?.data || error.message);
      return { paid: false, amount: 0, status: 'failed' };
    }
  }
}

/**
 * Golomt Bank E-Commerce Integration
 * https://dev.golomtbank.com:7443/docs/ecommerce_api_invoice_en/
 */
export class GolomtBankService {
  constructor() {
    this.baseURL = process.env.GOLOMT_API_URL || 'https://ecommerce.golomtbank.com';
    this.merchantKey = process.env.GOLOMT_MERCHANT_KEY;
    this.callbackUrl = process.env.GOLOMT_CALLBACK_URL;
  }

  /**
   * Generate HMAC-SHA256 checksum
   * @param {string} message - Data to hash
   * @returns {string} Hex string in lowercase
   */
  generateChecksum(message) {
    return crypto
      .createHmac('sha256', this.merchantKey)
      .update(message)
      .digest('hex')
      .toLowerCase();
  }

  /**
   * Create invoice
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {number} params.amount - Payment amount
   * @param {string} params.description - Payment description
   * @returns {Promise<Object>} Invoice details
   */
  async createInvoice({ userId, amount, description }) {
    try {
      if (!this.merchantKey || this.merchantKey === 'your_merchant_key_here') {
        console.log('⚠️ Golomt Bank: No merchant key configured, using mock response');
        // Return mock response for development
        const mockInvoiceId = `MOCK-${Date.now()}`;
        return {
          success: true,
          invoiceId: mockInvoiceId,
          transactionId: `TXN-${userId.slice(0, 8)}-${Date.now()}`,
          paymentUrl: `${this.baseURL}/payment/mn/${mockInvoiceId}`,
          socialPayUrl: `${this.baseURL}/socialpay/mn/${mockInvoiceId}`,
          socialDeeplink: 'socialpay-payment://mock',
          idempotencyKey: generateIdempotencyKey(userId, amount, Date.now()),
          isMock: true
        };
      }

      const transactionId = `TXN-${userId.slice(0, 8)}-${Date.now()}`.slice(0, 16);
      const returnType = 'GET';
      const genToken = 'N';
      const socialDeeplink = 'Y';

      // checksum = transactionId + amount + returnType + callback
      const checksumData = `${transactionId}${amount}${returnType}${this.callbackUrl}`;
      const checksum = this.generateChecksum(checksumData);

      const requestBody = {
        amount: amount.toString(),
        callback: this.callbackUrl,
        checksum: checksum,
        genToken: genToken,
        returnType: returnType,
        transactionId: transactionId,
        socialDeeplink: socialDeeplink
      };

      console.log('🏦 [Golomt] Creating invoice:', {
        transactionId,
        amount,
        checksumData: checksumData.slice(0, 50) + '...'
      });

      const response = await axios.post(
        `${this.baseURL}/api/invoice`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Verify response checksum
      // checksum = invoice + transactionId
      const responseChecksumData = `${response.data.invoice}${response.data.transactionId}`;
      const expectedChecksum = this.generateChecksum(responseChecksumData);

      if (response.data.checksum !== expectedChecksum) {
        console.error('❌ [Golomt] Checksum mismatch!', {
          received: response.data.checksum,
          expected: expectedChecksum
        });
        throw new Error('Response checksum verification failed');
      }

      const idempotencyKey = generateIdempotencyKey(userId, amount, Date.now());

      // Store invoice in database
      await db.collection('payment_invoices').add({
        userId,
        amount,
        provider: 'golomt',
        invoiceId: response.data.invoice,
        transactionId: response.data.transactionId,
        socialDeeplink: response.data.socialDeeplink,
        status: 'pending',
        idempotencyKey,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        invoiceId: response.data.invoice,
        transactionId: response.data.transactionId,
        paymentUrl: `${this.baseURL}/payment/mn/${response.data.invoice}`,
        socialPayUrl: `${this.baseURL}/socialpay/mn/${response.data.invoice}`,
        socialDeeplink: response.data.socialDeeplink,
        idempotencyKey
      };
    } catch (error) {
      console.error('❌ [Golomt] Create invoice error:', error.response?.data || error.message);
      throw new Error('Failed to create Golomt Bank invoice');
    }
  }

  /**
   * Check payment status
   * @param {string} invoiceId - Invoice ID to check
   * @returns {Promise<Object>} Payment status
   */
  async checkPayment(invoiceId) {
    try {
      // checksum = invoice
      const checksum = this.generateChecksum(invoiceId);

      const response = await axios.post(
        `${this.baseURL}/api/inquiry`,
        {
          checksum: checksum,
          invoice: invoiceId
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Verify response checksum
      // checksum = invoice + errorCode + amount
      const responseChecksumData = `${response.data.invoice}${response.data.errorCode}${response.data.amount}`;
      const expectedChecksum = this.generateChecksum(responseChecksumData);

      if (response.data.checksum !== expectedChecksum) {
        console.error('❌ [Golomt] Check payment checksum mismatch!');
        return { paid: false, amount: 0, status: 'failed' };
      }

      const isPaid = response.data.errorCode === '000'; // Success code

      return {
        paid: isPaid,
        amount: parseFloat(response.data.amount || 0),
        status: isPaid ? 'paid' : 'pending',
        errorCode: response.data.errorCode,
        errorDesc: response.data.errorDesc
      };
    } catch (error) {
      console.error('❌ [Golomt] Check payment error:', error.response?.data || error.message);
      return { paid: false, amount: 0, status: 'failed' };
    }
  }
}

/**
 * SocialPay Integration
 * https://developer.socialpay.mn/
 */
export class SocialPayService {
  constructor() {
    this.baseURL = process.env.SOCIALPAY_API_URL || 'https://ecommerce.golomtbank.com/api';
    this.merchantId = process.env.SOCIALPAY_MERCHANT_ID;
    this.apiKey = process.env.SOCIALPAY_API_KEY;
  }

  /**
   * Create payment request
   */
  async createPayment({ userId, amount, description, callbackUrl }) {
    try {
      const idempotencyKey = generateIdempotencyKey(userId, amount, Date.now());
      const orderId = `ORDER-${Date.now()}-${userId.slice(0, 8)}`;

      const response = await axios.post(
        `${this.baseURL}/invoice`,
        {
          merchant_id: this.merchantId,
          order_id: orderId,
          amount: amount,
          currency: 'MNT',
          description: description || 'Wallet топ-ап',
          callback_url: callbackUrl,
          return_url: callbackUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          }
        }
      );

      // Store payment in database
      await db.collection('payment_invoices').add({
        userId,
        amount,
        provider: 'socialpay',
        orderId,
        invoiceId: response.data.invoice_id,
        paymentUrl: response.data.payment_url,
        status: 'pending',
        idempotencyKey,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        invoiceId: response.data.invoice_id,
        paymentUrl: response.data.payment_url,
        orderId,
        idempotencyKey
      };
    } catch (error) {
      console.error('SocialPay error:', error.response?.data || error.message);
      throw new Error('Failed to create SocialPay payment');
    }
  }

  /**
   * Verify payment signature
   */
  verifySignature(data, signature) {
    const hash = crypto
      .createHmac('sha256', this.apiKey)
      .update(JSON.stringify(data))
      .digest('hex');
    
    return hash === signature;
  }
}

/**
 * Generic Payment Service (wrapper for all providers)
 */
export class PaymentService {
  constructor() {
    this.qpay = new QPayService();
    this.socialPay = new SocialPayService();
    this.golomt = new GolomtBankService();
  }

  /**
   * Create payment based on provider
   */
  async createPayment(provider, options) {
    switch (provider.toLowerCase()) {
      case 'qpay':
        return await this.qpay.createInvoice(options);
      case 'socialpay':
        return await this.socialPay.createPayment(options);
      case 'golomt':
        return await this.golomt.createInvoice(options);
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }

  /**
   * Check payment status
   */
  async checkPayment(provider, invoiceId) {
    switch (provider.toLowerCase()) {
      case 'qpay':
        return await this.qpay.checkPayment(invoiceId);
      case 'socialpay':
        // Implement SocialPay check if needed
        throw new Error('SocialPay status check not implemented');
      case 'golomt':
        return await this.golomt.checkPayment(invoiceId);
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }

  /**
   * Process payment webhook
   */
  async processWebhook(provider, data, signature) {
    // Verify signature first
    let isValid = false;
    
    switch (provider.toLowerCase()) {
      case 'qpay':
        // QPay webhook verification
        isValid = true; // Implement QPay signature verification
        break;
      case 'socialpay':
      case 'golomt':
        isValid = this.socialPay.verifySignature(data, signature);
        break;
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Process payment
    return {
      success: true,
      invoiceId: data.invoice_id,
      status: data.status,
      amount: data.amount
    };
  }
}

export default new PaymentService();
