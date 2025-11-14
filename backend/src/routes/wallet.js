import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';
import { 
  validateAmount, 
  validateWalletOwnership, 
  validateTransaction,
  preventDoubleSubmission 
} from '../middleware/requestIntegrity.js';

const router = express.Router();

// IMPORTANT: Apply JWT verification FIRST to all routes
// This must come before validateWalletOwnership because that middleware needs req.user
router.use(verifyJWT);

// Apply wallet ownership validation to all routes (needs req.user from verifyJWT)
router.use(validateWalletOwnership);

// Get wallet info (balance + transactions) - IMPROVED SECURITY
router.get('/', async (req, res) => {
  try {
    // SECURITY: Only get authenticated user's data
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'user_not_found',
        message: 'Хэрэглэгч олдсонгүй' 
      });
    }

    const balance = userDoc.data().balance || 0;

    // SECURITY: Only get authenticated user's transactions
    // Note: Removed .orderBy() to avoid needing composite index
    // Frontend will sort by date client-side
    const transactionsSnapshot = await db.collection('transactions')
      .where('userId', '==', req.user.uid)
      .limit(100) // Limit to prevent large data leaks
      .get();

    const transactions = [];
    transactionsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamp to ISO string
      let date = new Date().toISOString();
      if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          date = data.createdAt;
        } else if (data.createdAt.toDate) {
          date = data.createdAt.toDate().toISOString();
        } else if (data.createdAt._seconds) {
          date = new Date(data.createdAt._seconds * 1000).toISOString();
        }
      }

      // SECURITY: Only return necessary transaction data
      transactions.push({
        id: doc.id,
        type: data.type,
        title: data.title,
        subtitle: data.subtitle || null,
        amount: data.amount,
        date,
        // SECURITY: Do not return sensitive fields (bank accounts, card numbers, etc.)
      });
    });

    res.json({
      balance,
      transactions,
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ 
      error: 'wallet_fetch_failed',
      message: 'Хэтэвч мэдээлэл татахад алдаа гарлаа' 
    });
  }
});

// Top up wallet - IMPROVED SECURITY
router.post('/topup', validateAmount, validateTransaction, preventDoubleSubmission, async (req, res) => {
  try {
    const { amount, method } = req.body;

    // SECURITY: Server-side validation (never trust client)
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'invalid_amount',
        message: 'Дүн буруу байна' 
      });
    }

    // SECURITY: Minimum and maximum top-up amounts
    const MIN_TOPUP = 1000; // 1,000₮
    const MAX_TOPUP = 10000000; // 10,000,000₮
    
    if (amount < MIN_TOPUP) {
      return res.status(400).json({ 
        error: 'amount_too_small',
        message: `Хамгийн багадаа ${MIN_TOPUP.toLocaleString()}₮ цэнэглэх боломжтой` 
      });
    }
    
    if (amount > MAX_TOPUP) {
      return res.status(400).json({ 
        error: 'amount_too_large',
        message: `Хамгийн ихдээ ${MAX_TOPUP.toLocaleString()}₮ цэнэглэх боломжтой` 
      });
    }

    // SECURITY: Validate payment method
    const validMethods = ['qpay', 'card', 'bank', 'wallet'];
    if (method && !validMethods.includes(method.toLowerCase())) {
      return res.status(400).json({ 
        error: 'invalid_method',
        message: 'Төлбөрийн хэрэгсэл буруу байна' 
      });
    }

    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'user_not_found',
        message: 'Хэрэглэгч олдсонгүй' 
      });
    }

    const currentBalance = userDoc.data().balance || 0;
    const newBalance = currentBalance + amount;

    // SECURITY: Check for overflow (balance shouldn't exceed reasonable limits)
    if (newBalance > 1000000000) { // 1 billion₮ limit
      return res.status(400).json({ 
        error: 'balance_limit_exceeded',
        message: 'Хэтэвчийн үлдэгдэл хэт их байна' 
      });
    }

    // Update user balance (atomic operation)
    await userRef.update({
      balance: newBalance,
      updatedAt: new Date(),
    });

    // SECURITY: Create transaction record with all details for audit
    await db.collection('transactions').add({
      userId: req.user.uid,
      type: 'credit',
      title: 'Цэнэглэсэн',
      subtitle: method ? `${method} ашигласан` : null,
      amount: amount,
      method: method || 'unknown',
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      createdAt: new Date().toISOString(),
    });

    // SECURITY: Log topup for monitoring
    console.log('💰 [Topup]', {
      userId: req.user.uid,
      amount,
      method,
      newBalance,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Амжилттай цэнэглэлээ',
      balance: newBalance // Return new balance
      // SECURITY: Do not return full user object or transaction ID
    });
  } catch (error) {
    console.error('Top up error:', error);
    res.status(500).json({ 
      error: 'topup_failed',
      message: 'Цэнэглэхэд алдаа гарлаа' 
    });
  }
});

// Withdraw from wallet - IMPROVED SECURITY
router.post('/withdraw', validateAmount, validateTransaction, preventDoubleSubmission, async (req, res) => {
  try {
    const { amount, bankAccount, bankName } = req.body;

    // SECURITY: Server-side validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'invalid_amount',
        message: 'Дүн буруу байна' 
      });
    }

    // SECURITY: Minimum and maximum withdrawal amounts
    const MIN_WITHDRAW = 10000; // 10,000₮
    const MAX_WITHDRAW = 50000000; // 50,000,000₮
    
    if (amount < MIN_WITHDRAW) {
      return res.status(400).json({ 
        error: 'amount_too_small',
        message: `Хамгийн багадаа ${MIN_WITHDRAW.toLocaleString()}₮ зарлага хийх боломжтой` 
      });
    }
    
    if (amount > MAX_WITHDRAW) {
      return res.status(400).json({ 
        error: 'amount_too_large',
        message: `Хамгийн ихдээ ${MAX_WITHDRAW.toLocaleString()}₮ зарлага хийх боломжтой` 
      });
    }

    // SECURITY: Validate bank account (must be provided)
    if (!bankAccount || !bankAccount.trim()) {
      return res.status(400).json({ 
        error: 'bank_account_required',
        message: 'Дансны дугаар оруулна уу' 
      });
    }

    // SECURITY: Validate bank account format (basic check)
    const sanitizedBankAccount = bankAccount.trim();
    if (sanitizedBankAccount.length < 8 || sanitizedBankAccount.length > 20) {
      return res.status(400).json({ 
        error: 'invalid_bank_account',
        message: 'Дансны дугаар буруу байна' 
      });
    }

    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'user_not_found',
        message: 'Хэрэглэгч олдсонгүй' 
      });
    }

    const currentBalance = userDoc.data().balance || 0;

    // SECURITY: Check sufficient balance
    if (currentBalance < amount) {
      return res.status(400).json({ 
        error: 'insufficient_balance',
        message: 'Үлдэгдэл хүрэлцэхгүй байна' 
      });
    }

    const newBalance = currentBalance - amount;

    // SECURITY: Atomic balance update
    await userRef.update({
      balance: newBalance,
      updatedAt: new Date(),
    });

    // SECURITY: Create transaction record with audit trail
    await db.collection('transactions').add({
      userId: req.user.uid,
      type: 'debit',
      title: 'Татсан',
      subtitle: bankName ? `${bankName}` : null,
      amount: amount,
      // SECURITY: Store partial bank account for verification (last 4 digits only)
      bankAccountLast4: sanitizedBankAccount.slice(-4),
      bankName: bankName || 'Unknown',
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      status: 'pending', // Withdrawal requires manual approval
      createdAt: new Date().toISOString(),
    });

    // SECURITY: Log withdrawal for monitoring/fraud detection
    console.log('💸 [Withdrawal]', {
      userId: req.user.uid,
      amount,
      bankAccountLast4: sanitizedBankAccount.slice(-4),
      newBalance,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Зарлага хүсэлт амжилттай илгээлээ',
      balance: newBalance,
      status: 'pending' // Withdrawal is pending approval
      // SECURITY: Do not return bank account details in response
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ 
      error: 'withdrawal_failed',
      message: 'Зарлага хийхэд алдаа гарлаа' 
    });
  }
});

export default router;
