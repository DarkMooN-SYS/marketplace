import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

// Import security middleware
import { securityHeaders, hstsHeader } from './middleware/securityHeaders.js';
import { sanitizeInput } from './middleware/requestIntegrity.js';
import { 
  globalRateLimiter, 
  strictRateLimiter 
} from './middleware/security.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import reviewRoutes from './routes/reviews.js';
import surveyRoutes from './routes/surveys.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import initRoutes from './routes/init.js';
import newsRoutes from './routes/news.js';
import weblinkRoutes from './routes/weblinks.js';
import advertisementRoutes from './routes/advertisements.js';
import spinRoutes from './routes/spin.js';
import notificationRoutes from './routes/notifications.js';
import walletRoutes from './routes/wallet.js';
import sessionRoutes from './routes/sessions.js';
import bankRoutes from './routes/banks.js';
import activityRoutes from './routes/activities.js';
import paymentRoutes from './routes/payments.js';

// Import cleanup utilities
import { cleanupOldAdvertisements } from './scripts/cleanup-old-ads.js';

dotenv.config();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Promise Rejection:', reason);
  // Don't exit process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit process in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware (applied first)
app.use(securityHeaders);
app.use(hstsHeader);

// Middleware
app.use(helmet());

// SECURITY: CORS - strict origin validation (never use wildcard *)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy: This origin is not allowed';
      console.warn(`🚫 CORS blocked: ${origin}`);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

// 🔒 Cookie Security Settings
app.use((req, res, next) => {
  // Set secure cookie defaults
  res.cookie = function(name, value, options = {}) {
    const secureOptions = {
      httpOnly: true, // Prevents JavaScript access to cookies
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      ...options
    };
    return this.cookie.apply(this, [name, value, secureOptions]);
  };
  next();
});

// 🔒 SECURITY: Request size limits (anti-DDoS)
app.use(express.json({ limit: '100kb' })); // Reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Input sanitization middleware (after body parsing)
app.use(sanitizeInput);

// 🔒 SECURITY: Global rate limiting (anti-DDoS)
app.use('/api/', globalRateLimiter);

// Routes (strict rate limiting for sensitive endpoints)
app.use('/api/auth', strictRateLimiter, authRoutes); // 🔒 Strict: Auth endpoints
app.use('/api/wallet', strictRateLimiter, walletRoutes); // 🔒 Strict: Financial operations
app.use('/api/payments', strictRateLimiter, paymentRoutes); // 🔒 Strict: Payment operations
app.use('/api/admin', strictRateLimiter, adminRoutes); // 🔒 Strict: Admin operations
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/init', initRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/weblinks', weblinkRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/spin', spinRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/activities', activityRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '3say Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Global error handling middleware - IMPROVED: hide stack traces in production
app.use((err, req, res, next) => {
  // Log full error server-side (in production, send to monitoring service like Sentry)
  console.error('❌ Server Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.uid,
    timestamp: new Date().toISOString()
  });
  
  // Determine error status
  const status = err.status || err.statusCode || 500;
  
  // Send sanitized error to client
  const response = {
    error: status === 500 ? 'Серверийн алдаа гарлаа' : err.message,
    status: status
  };
  
  // Only include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  
  res.status(status).json(response);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Хуудас олдсонгүй',
    path: req.originalUrl 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  
  // Run cleanup on startup
  cleanupOldAdvertisements()
    .then(result => {
      console.log(`✅ Initial cleanup: ${result.deleted} old ads deleted (${result.checked} checked)`);
    })
    .catch(error => {
      console.error('❌ Initial cleanup failed:', error);
    });
  
  // Schedule cleanup to run every 24 hours (86400000 ms)
  setInterval(() => {
    console.log('🧹 Running scheduled cleanup of old advertisements...');
    cleanupOldAdvertisements()
      .then(result => {
        console.log(`✅ Scheduled cleanup: ${result.deleted} old ads deleted (${result.checked} checked)`);
      })
      .catch(error => {
        console.error('❌ Scheduled cleanup failed:', error);
      });
  }, 24 * 60 * 60 * 1000); // 24 hours
});