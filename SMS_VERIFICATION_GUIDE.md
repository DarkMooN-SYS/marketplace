# 📱 SMS Verification System

## 🔄 System Overview

**Current Implementation**: Backend SMS Service  
**Alternative**: Firebase Phone Auth (currently disabled due to configuration issues)

---

## ✅ Backend SMS Verification

### How It Works

1. **Frontend** (`SMSVerification.tsx`) sends phone number to backend
2. **Backend** (`/api/auth/send-verification`) generates 6-digit OTP code
3. **SMS Provider** sends OTP to user's phone
4. **User** enters OTP code in frontend
5. **Backend** (`/api/auth/verify-code`) verifies the code

### API Endpoints

#### 1. Send Verification Code
```
POST /api/auth/send-verification
Content-Type: application/json

{
  "phone": "99112233"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Баталгаажуулах код илгээгдлээ"
}
```

#### 2. Verify Code
```
POST /api/auth/verify-code
Content-Type: application/json

{
  "phone": "99112233",
  "code": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Утасны дугаар амжилттай баталгаажлаа"
}
```

---

## 🔧 Configuration

### Frontend Environment Variables

**.env.production**:
```env
VITE_API_URL=https://threesay-1.onrender.com/api
```

**.env.development**:
```env
VITE_API_URL=http://localhost:10000/api
```

### Backend Configuration

**backend/.env**:
```env
# SMS Provider (Twilio, AWS SNS, etc.)
SMS_API_KEY=your_sms_api_key
SMS_SECRET=your_sms_secret

# CORS Origins
ALLOWED_ORIGINS=http://localhost:5173,https://3say.vercel.app

# Rate Limiting
AUTH_RATE_LIMIT=5
AUTH_RATE_WINDOW=15
```

---

## 🧪 Testing

### Development Testing

1. **Local Backend** (Port 10000):
```bash
cd backend
npm run dev
```

2. **Local Frontend** (Port 5173):
```bash
npm run dev
```

3. **Test Flow**:
   - Enter phone: `99112233`
   - Click "Илгээх"
   - Check backend console for OTP code
   - Enter OTP code
   - Verify success message

### Production Testing

1. **Production URLs**:
   - Frontend: https://3say.vercel.app
   - Backend: https://threesay-1.onrender.com

2. **Real Phone Testing**:
   - Enter real Mongolia phone number (8 digits)
   - Receive SMS with OTP
   - Verify within 5 minutes

---

## 🐛 Common Issues & Solutions

### Issue 1: "Сервертэй холбогдох боломжгүй байна"

**Причина**: Backend offline or CORS error  
**Шийдэл**:
```bash
# Check backend status
curl https://threesay-1.onrender.com/api/health

# Check CORS settings in backend/.env
ALLOWED_ORIGINS=https://3say.vercel.app
```

### Issue 2: "Код илгээхэд алдаа гарлаа"

**Причина**: SMS provider API error  
**Шийдэл**:
- Check SMS provider credentials
- Check SMS quota/balance
- Check backend logs

### Issue 3: "Баталгаажуулах код буруу байна"

**Причина**: Wrong code or expired  
**Шийдэл**:
- OTP expires after 5 minutes
- Request new code
- Check backend verification logic

### Issue 4: Rate Limiting

**Причина**: Too many requests  
**Шийдэл**:
```javascript
// backend/src/routes/auth.js
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});
```

---

## 🔐 Security Features

### 1. Rate Limiting
- 5 attempts per 15 minutes per IP
- Prevents brute force attacks

### 2. App Check Verification
```javascript
router.post('/send-verification', verifyAppCheck, ...);
```

### 3. Input Validation
```javascript
const validatePhoneVerification = [
  body('phone')
    .trim()
    .matches(/^[0-9]{8}$/)
    .withMessage('8 оронтой дугаар оруулна уу')
];
```

### 4. Code Expiration
- OTP codes expire after 5 minutes
- Stored in memory/Redis with TTL

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
git add .
git commit -m "Update SMS verification to use backend API"
git push origin main
# Vercel auto-deploys from GitHub
```

### Backend (Render)
1. Push changes to GitHub
2. Render auto-deploys
3. Check logs: https://dashboard.render.com

### Environment Variables (Vercel)
```
VITE_API_URL=https://threesay-1.onrender.com/api
```

---

## 📊 Monitoring

### Backend Logs
```bash
# Check OTP sending
[INFO] OTP sent to 99112233: 123456

# Check verification
[INFO] OTP verified for 99112233
```

### Frontend Console
```javascript
// Sending OTP
📱 Sending OTP via backend to: 99112233
✅ OTP sent successfully via backend

// Verifying OTP
🔐 Verifying OTP code via backend
✅ Phone verified via backend
```

---

## 🔄 Future: Firebase Phone Auth Migration

### Why Firebase?
- ✅ No SMS costs (uses Firebase quota)
- ✅ Built-in reCAPTCHA
- ✅ Global delivery
- ❌ More complex setup
- ❌ Requires Firebase project configuration

### Migration Steps (When Ready)
1. Fix Firebase initialization issue
2. Enable Phone Auth in Firebase Console
3. Update `SMSVerification.tsx` to use Firebase
4. Test thoroughly
5. Deploy

### Current Firebase Issue
```
Error: INTERNAL ASSERTION FAILED: Expected a class definition
    at getAuth (index.ts:83:16)
```

**Root Cause**: Firebase SDK version mismatch or incorrect initialization

**Solution** (for future):
```typescript
// Correct initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Must be synchronous
```

---

## ✅ Current Status

- ✅ Backend SMS verification working
- ✅ Frontend integrated with backend API
- ✅ Production deployed (Vercel + Render)
- ✅ Rate limiting enabled
- ✅ Input validation enabled
- ✅ Error handling implemented
- ⏸️ Firebase Phone Auth disabled (config issue)

---

## 📞 Support

**Backend API**: https://threesay-1.onrender.com/api  
**Frontend**: https://3say.vercel.app  
**Documentation**: See backend/README.md

---

**Last Updated**: 2025-11-06  
**Version**: 1.0.0  
**Status**: 🟢 Production Ready
