# Backend Security Implementation

## Overview
This document describes the comprehensive security improvements implemented to protect against common web vulnerabilities, payment manipulation, and unauthorized access.

## Security Layers

### 1. HTTP Security Headers (`middleware/securityHeaders.js`)

#### Protection Against:
- **Clickjacking**: `X-Frame-Options: DENY` prevents the site from being embedded in iframes
- **MIME Sniffing**: `X-Content-Type-Options: nosniff` prevents browsers from guessing file types
- **XSS Attacks**: Content Security Policy (CSP) restricts resource loading
- **Information Leakage**: Removes `X-Powered-By` header
- **Man-in-the-Middle**: HSTS forces HTTPS in production

#### Headers Applied:
```javascript
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000 (production only)
```

### 2. Request Integrity Validation (`middleware/requestIntegrity.js`)

#### A. Amount Validation (`validateAmount`)
Protects wallet and payment operations from:
- **NaN/Infinity attacks**: Rejects non-numeric values
- **Negative amounts**: Prevents withdrawal exploits
- **Overflow attacks**: Limits maximum amount to 100,000,000₮
- **Precision exploits**: Rounds to 2 decimal places

**Usage:**
```javascript
router.post('/topup', verifyJWT, validateAmount, async (req, res) => {
  // Amount is already validated and sanitized
});
```

**Error Messages (Mongolian):**
- "Дүн буруу байна" - Invalid amount
- "Сөрөг дүн оруулах боломжгүй" - Negative amount not allowed
- "Дүн хэт их байна" - Amount too large

#### B. Wallet Ownership Validation (`validateWalletOwnership`)
Ensures users can only access their own wallet:
- Compares `userId` in request with authenticated user's UID
- Admin bypass: Admins can access any wallet
- Returns 403 Forbidden for unauthorized access

**Applied to:** All `/api/wallet/*` routes

#### C. Input Sanitization (`sanitizeInput`)
Protects against XSS and injection attacks:
- Removes `<script>` tags
- Removes `<iframe>` tags
- Removes `javascript:` protocol
- Removes inline event handlers (`onclick`, `onerror`, etc.)
- Recursively sanitizes objects and arrays

**Applied globally** to `req.body` and `req.query`

#### D. Transaction Validation (`validateTransaction`)
Validates transaction data integrity:
- Checks transaction type validity (deposit, withdrawal, purchase, refund, reward, transfer, reversal)
- Ensures amount > 0
- Limits description length to 500 characters

**Usage:**
```javascript
router.post('/withdraw', verifyJWT, validateTransaction, async (req, res) => {
  // Transaction data is validated
});
```

#### E. Double Submission Prevention (`preventDoubleSubmission`)
Prevents rapid repeated requests:
- 5-second window per user+endpoint+data combination
- In-memory cache with automatic cleanup
- Returns 429 Too Many Requests

**Applied to:**
- `/api/wallet/topup`
- `/api/wallet/withdraw`
- Other transaction endpoints

## Wallet Route Security

### POST /api/wallet/topup
**Middleware Stack:**
1. `verifyJWT` - Authentication required
2. `validateAmount` - Amount validation
3. `validateTransaction` - Transaction data validation
4. `preventDoubleSubmission` - Rate limiting

**Additional Validations:**
- Minimum top-up: 1,000₮
- Maximum top-up: 10,000,000₮

### POST /api/wallet/withdraw
**Middleware Stack:**
1. `verifyJWT` - Authentication required
2. `validateAmount` - Amount validation
3. `validateTransaction` - Transaction data validation
4. `preventDoubleSubmission` - Rate limiting

**Additional Validations:**
- Minimum withdrawal: 10,000₮
- Maximum withdrawal: 50,000,000₮
- Bank account required
- Sufficient balance check

## Global Security Configuration

### Applied in `src/index.js`:
```javascript
// Security headers (first in middleware chain)
app.use(securityHeaders);
app.use(hstsHeader);

// Standard middleware
app.use(helmet());
app.use(cors(...));
app.use(express.json({ limit: '10mb' }));

// Input sanitization (after body parsing)
app.use(sanitizeInput);
```

## Browser Console Protection

### Server-Side Validation
All critical operations are validated on the server:
- ✅ Amount validation (cannot be bypassed via console)
- ✅ Wallet ownership (enforced server-side)
- ✅ Transaction integrity (checked server-side)
- ✅ Balance checks (performed server-side)

### Input Sanitization
All user input is sanitized to prevent:
- XSS attacks via console injection
- Script tag injection
- Iframe embedding
- JavaScript protocol execution

**Note:** Even if a user modifies values in the browser console, the server will reject invalid data.

## Attack Prevention Summary

| Attack Type | Protection Mechanism |
|-------------|---------------------|
| **Clickjacking** | X-Frame-Options: DENY |
| **XSS** | CSP + Input Sanitization |
| **CSRF** | CORS + JWT Authentication |
| **MIME Sniffing** | X-Content-Type-Options |
| **Payment Manipulation** | Server-side amount validation |
| **Wallet Theft** | Ownership validation |
| **Double Submission** | 5-second rate limiting |
| **Negative Amounts** | Amount validation middleware |
| **Overflow Attacks** | Maximum amount limits |
| **Precision Exploits** | 2-decimal rounding |
| **Console Tampering** | Server-side validation (never trust client) |

## Testing Security

### Test Cases:

#### 1. Amount Validation
```bash
# Should reject negative amount
curl -X POST http://localhost:5001/api/wallet/topup \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": -1000}'
# Expected: 400 "Сөрөг дүн оруулах боломжгүй"

# Should reject NaN
curl -X POST http://localhost:5001/api/wallet/topup \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": "abc"}'
# Expected: 400 "Дүн буруу байна"

# Should reject overflow
curl -X POST http://localhost:5001/api/wallet/topup \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": 999999999999}'
# Expected: 400 "Дүн хэт их байна"
```

#### 2. Wallet Ownership
```bash
# Should reject accessing other user's wallet
curl -X GET http://localhost:5001/api/wallet?userId=<other_user_id> \
  -H "Authorization: Bearer <your_token>"
# Expected: 403 "Танд энэ wallet-д хандах эрх байхгүй байна"
```

#### 3. Double Submission
```bash
# Rapid repeated requests (within 5 seconds)
curl -X POST http://localhost:5001/api/wallet/topup \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": 1000}' &
curl -X POST http://localhost:5001/api/wallet/topup \
  -H "Authorization: Bearer <token>" \
  -d '{"amount": 1000}'
# Expected: Second request returns 429 "Хэт олон хүсэлт илгээж байна"
```

#### 4. XSS Prevention
```bash
# Should sanitize script tags
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "<script>alert(1)</script>Test"}'
# Expected: Script tags removed from name
```

## Best Practices

1. **Never Trust Client Data**: All validation must happen on the server
2. **Validate Early**: Middleware validates before business logic
3. **Fail Securely**: Return appropriate error codes (400, 403, 429)
4. **Log Security Events**: Monitor for attack patterns
5. **Use HTTPS in Production**: Enable HSTS header
6. **Regular Updates**: Keep dependencies updated
7. **Rate Limiting**: Consider adding express-rate-limit for global protection

## Future Enhancements

1. **Redis for Double-Submission Cache**: Persist cache across server restarts
2. **IP-Based Rate Limiting**: Prevent brute force attacks
3. **Anomaly Detection**: Monitor for unusual transaction patterns
4. **Two-Factor Authentication**: For large withdrawals
5. **Transaction Confirmation**: Email/SMS verification for withdrawals
6. **Audit Logging**: Track all security-related events

## Configuration

### Environment Variables
```env
NODE_ENV=production  # Enables HSTS
ALLOWED_ORIGINS=https://yourdomain.com
```

## Maintenance

### Regular Tasks:
- Review security logs weekly
- Update dependencies monthly
- Audit transaction patterns
- Review failed authentication attempts
- Monitor for new vulnerabilities

## Contact

For security concerns or vulnerability reports, contact the development team immediately.

---

**Last Updated:** 2025-10-27
**Version:** 1.0.0
