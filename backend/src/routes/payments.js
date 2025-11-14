import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { strictLimiter } from '../middleware/rateLimit.js';
import paymentService from '../services/paymentService.js';
import { db } from '../config/firebase.js';
import { 
  verifyPaymentSignature, 
  validatePaymentAmount 
} from '../middleware/security.js';

const router = express.Router();

/**
 * Create payment invoice (QPay, SocialPay, etc.)
 * POST /api/payments/create
 */
router.post('/create', verifyJWT, strictLimiter, async (req, res) => {
  try {
    const { provider, amount, method } = req.body;

    // Validate provider
    const validProviders = ['qpay', 'socialpay', 'golomt', 'khan'];
    if (!provider || !validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({
        error: 'invalid_provider',
        message: 'Төлбөрийн хэрэгсэл буруу байна'
      });
    }

    // Validate amount
    if (!amount || amount < 1000 || amount > 10000000) {
      return res.status(400).json({
        error: 'invalid_amount',
        message: 'Дүн 1,000₮ - 10,000,000₮ хооронд байх ёстой'
      });
    }

    // Create payment invoice
    const callbackUrl = `${process.env.API_URL || 'http://localhost:5001'}/api/payments/webhook/${provider}`;
    
    const result = await paymentService.createPayment(provider, {
      userId: req.user.uid,
      amount,
      description: `3say Wallet топ-ап - ${amount.toLocaleString()}₮`,
      callbackUrl
    });

    // Log payment creation
    console.log('💳 [Payment Created]', {
      userId: req.user.uid,
      provider,
      amount,
      invoiceId: result.invoiceId,
      isMock: result.isMock,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      provider,
      invoiceId: result.invoiceId,
      qrText: result.qrText,
      qrImage: result.qrImage,
      paymentUrl: result.paymentUrl,
      socialPayUrl: result.socialPayUrl,
      deeplink: result.socialDeeplink || result.deeplink,
      urls: result.urls,
      isMock: result.isMock,
      message: 'Төлбөрийн нэхэмжлэл үүслээ'
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      error: 'payment_creation_failed',
      message: 'Төлбөрийн нэхэмжлэл үүсгэхэд алдаа гарлаа'
    });
  }
});

/**
 * Check payment status
 * GET /api/payments/check/:invoiceId
 */
router.get('/check/:invoiceId', verifyJWT, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { provider } = req.query;

    if (!provider) {
      return res.status(400).json({
        error: 'provider_required',
        message: 'Төлбөрийн хэрэгсэл заана уу'
      });
    }

    // Check payment status
    const status = await paymentService.checkPayment(provider, invoiceId);

    // If paid, update user balance
    if (status.paid) {
      const invoiceDoc = await db.collection('payment_invoices')
        .where('invoiceId', '==', invoiceId)
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();

      if (!invoiceDoc.empty) {
        const invoice = invoiceDoc.docs[0];
        const invoiceData = invoice.data();

        // Check if already processed
        if (invoiceData.status === 'completed') {
          return res.json({
            success: true,
            paid: true,
            alreadyProcessed: true,
            message: 'Төлбөр аль хэдийн боловсруулагдсан байна'
          });
        }

        // Update user balance
        const userRef = db.collection('users').doc(req.user.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const currentBalance = userDoc.data().balance || 0;
          const newBalance = currentBalance + status.amount;

          await userRef.update({
            balance: newBalance,
            updatedAt: new Date()
          });

          // Create transaction record
          await db.collection('transactions').add({
            userId: req.user.uid,
            type: 'credit',
            title: 'Цэнэглэсэн',
            subtitle: `${provider} ашигласан`,
            amount: status.amount,
            provider: provider,
            invoiceId: invoiceId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            createdAt: new Date().toISOString()
          });

          // Mark invoice as completed
          await invoice.ref.update({
            status: 'completed',
            paidAt: new Date().toISOString(),
            paidAmount: status.amount
          });

          console.log('✅ [Payment Completed]', {
            userId: req.user.uid,
            provider,
            amount: status.amount,
            invoiceId,
            newBalance,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    res.json({
      success: true,
      paid: status.paid,
      amount: status.amount,
      status: status.status
    });

  } catch (error) {
    console.error('Payment check error:', error);
    res.status(500).json({
      error: 'payment_check_failed',
      message: 'Төлбөр шалгахад алдаа гарлаа'
    });
  }
});

/**
 * Payment webhook handler (QPay)
 * POST /api/payments/webhook/qpay
 * 🔒 SECURITY: Webhook signature verification
 */
router.post('/webhook/qpay', async (req, res) => {
  try {
    const webhookData = req.body;

    console.log('🔔 [QPay Webhook]', webhookData);

    // 🔒 SECURITY: Verify webhook signature
    const signature = req.headers['x-qpay-signature'] || req.headers['x-signature'];
    const secret = process.env.QPAY_WEBHOOK_SECRET;
    
    if (secret && signature) {
      const isValid = verifyPaymentSignature(webhookData, signature, secret);
      if (!isValid) {
        console.warn('⚠️ Invalid QPay webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else if (process.env.NODE_ENV === 'production' && secret) {
      // In production, require signature if secret is configured
      console.warn('⚠️ QPay webhook missing signature');
      return res.status(401).json({ error: 'Missing signature' });
    }

    const { object_id, payment_status, payment_amount } = webhookData;

    if (payment_status === 'PAID') {
      // Find invoice
      const invoiceQuery = await db.collection('payment_invoices')
        .where('invoiceId', '==', object_id)
        .where('provider', '==', 'qpay')
        .limit(1)
        .get();

      if (!invoiceQuery.empty) {
        const invoiceDoc = invoiceQuery.docs[0];
        const invoiceData = invoiceDoc.data();

        // Skip if already processed
        if (invoiceData.status === 'completed') {
          return res.json({ success: true, message: 'Already processed' });
        }

        // Update user balance
        const userRef = db.collection('users').doc(invoiceData.userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const currentBalance = userDoc.data().balance || 0;
          const newBalance = currentBalance + payment_amount;

          await userRef.update({
            balance: newBalance,
            updatedAt: new Date()
          });

          // Create transaction
          await db.collection('transactions').add({
            userId: invoiceData.userId,
            type: 'credit',
            title: 'Цэнэглэсэн',
            subtitle: 'QPay ашигласан',
            amount: payment_amount,
            provider: 'qpay',
            invoiceId: object_id,
            createdAt: new Date().toISOString()
          });

          // Mark invoice as completed
          await invoiceDoc.ref.update({
            status: 'completed',
            paidAt: new Date().toISOString(),
            paidAmount: payment_amount
          });

          console.log('✅ [QPay Webhook Processed]', {
            userId: invoiceData.userId,
            amount: payment_amount,
            invoiceId: object_id,
            newBalance
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('QPay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Payment webhook handler (SocialPay/Golomt)
 * POST /api/payments/webhook/socialpay
 */
router.post('/webhook/socialpay', async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers['x-signature'];

    console.log('🔔 [SocialPay Webhook]', webhookData);

    // Verify signature
    const isValid = paymentService.socialPay.verifySignature(webhookData, signature);
    if (!isValid) {
      console.warn('⚠️ Invalid SocialPay webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { invoice_id, status, amount } = webhookData;

    if (status === 'PAID' || status === 'SUCCESS') {
      // Find invoice
      const invoiceQuery = await db.collection('payment_invoices')
        .where('invoiceId', '==', invoice_id)
        .where('provider', '==', 'socialpay')
        .limit(1)
        .get();

      if (!invoiceQuery.empty) {
        const invoiceDoc = invoiceQuery.docs[0];
        const invoiceData = invoiceDoc.data();

        // Skip if already processed
        if (invoiceData.status === 'completed') {
          return res.json({ success: true, message: 'Already processed' });
        }

        // Update user balance
        const userRef = db.collection('users').doc(invoiceData.userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const currentBalance = userDoc.data().balance || 0;
          const newBalance = currentBalance + amount;

          await userRef.update({
            balance: newBalance,
            updatedAt: new Date()
          });

          // Create transaction
          await db.collection('transactions').add({
            userId: invoiceData.userId,
            type: 'credit',
            title: 'Цэнэглэсэн',
            subtitle: 'SocialPay ашигласан',
            amount: amount,
            provider: 'socialpay',
            invoiceId: invoice_id,
            createdAt: new Date().toISOString()
          });

          // Mark invoice as completed
          await invoiceDoc.ref.update({
            status: 'completed',
            paidAt: new Date().toISOString(),
            paidAmount: amount
          });

          console.log('✅ [SocialPay Webhook Processed]', {
            userId: invoiceData.userId,
            amount,
            invoiceId: invoice_id,
            newBalance
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('SocialPay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Get user's payment history
 * GET /api/payments/history
 */
router.get('/history', verifyJWT, async (req, res) => {
  try {
    const invoicesSnapshot = await db.collection('payment_invoices')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const invoices = [];
    invoicesSnapshot.forEach(doc => {
      const data = doc.data();
      invoices.push({
        id: doc.id,
        provider: data.provider,
        amount: data.amount,
        status: data.status,
        createdAt: data.createdAt,
        paidAt: data.paidAt || null
      });
    });

    res.json({
      success: true,
      invoices
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      error: 'history_fetch_failed',
      message: 'Төлбөрийн түүх татахад алдаа гарлаа'
    });
  }
});

export default router;
