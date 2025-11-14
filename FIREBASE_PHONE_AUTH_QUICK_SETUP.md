# 🔥 Firebase Phone Authentication - Quick Setup

## ✅ Код бэлэн боллоо!

Firebase Phone Authentication ашиглан утасны дугаар руу OTP илгээх систем хэрэгжлээ.

---

## 🚀 Firebase Console Тохиргоо (5 минут)

### Алхам 1: Firebase Console руу орох
1. Браузер дээр орох: https://console.firebase.google.com/
2. **zaraa-8d3a9** project сонгох

### Алхам 2: Phone Authentication идэвхжүүлэх
1. Зүүн menu дээр **Build** → **Authentication** дарах
2. **Get Started** товч дарах (хэрвээ анх удаа бол)
3. **Sign-in method** tab дээр орох
4. **Phone** дээр дарах
5. **Enable** toggle-г асаах ✅
6. **Save** дарах

### Алхам 3: Authorized domains нэмэх
1. **Settings** → **Authorized domains** хэсэгт орох
2. Дараах domains байгаа эсэхийг шалгах:
   ```
   localhost
   zaraa-8d3a9.firebaseapp.com
   ```
3. **Add domain** дарж нэмэх:
   ```
   3say.vercel.app
   your-custom-domain.com (хэрвээ байвал)
   ```

### Алхам 4: Test phone numbers тохируулах (Заавал биш)
Development тестлэхэд:
1. **Phone numbers for testing** хэсэгт орох
2. **Add phone number** дарах
3. Жишээ:
   ```
   Phone: +976 9999 9999
   Code: 123456
   ```
4. **Add** дарах

---

## 📱 Хэрхэн ажилладаг

### User хувьд:
1. Утасны дугаараа оруулна (жишээ: 95279853)
2. **Батлах** товч дарна
3. Утас руу 6 оронтой код ирнэ (жишээ: 123456)
4. Кодыг оруулж баталгаажуулна

### Technical Flow:
```
[Frontend] → Initialize reCAPTCHA (invisible)
           → Firebase sends SMS via Google infrastructure
           → User receives 6-digit code
[User]     → Enters code
[Frontend] → Firebase verifies code
           → Returns user object (uid, phoneNumber)
```

---

## 🧪 Тестлэх

### Local Development (http://localhost:5173)
```bash
npm run dev
```

1. Браузер: http://localhost:5173
2. Нэвтрэх эсвэл бүртгүүлэх
3. Утасны дугаар оруулах (жишээ: 95279853)
4. Browser console шалгах:
   ```
   ✅ Firebase initialized successfully
   ✅ Firebase Auth initialized
   📱 Sending OTP via Firebase to: +97695279853
   ✅ OTP sent successfully via Firebase
   ```
5. Утас руу ирсэн кодыг оруулна
6. Амжилттай баталгаажина

### Production (https://3say.vercel.app)
1. Git push хийх (Vercel автоматаар deploy хийнэ)
2. Жинхэнэ утасны дугаараар тестлэх
3. SMS ирнэ (5-30 секунд)

---

## 💰 Firebase Phone Auth Pricing

### Free Tier (Spark Plan)
- **10 SMS/day** - Үнэгүй ✅
- **reCAPTCHA** - Үнэгүй
- Test phone numbers - Хязгааргүй

### Paid Tier (Blaze Plan)
- SMS үнэ: Улс орноос хамаарна
- **Монгол**: ~$0.02-0.05 USD/SMS
- **1000 SMS** ≈ $20-50 USD

### Quota тохируулга
Firebase Console → Authentication → Usage:
- Daily SMS quota шалгах
- Billing alerts тохируулах
- Usage history харах

---

## 🐛 Common Issues

### 1. "reCAPTCHA not initialized"
**Шалтгаан**: DOM element байхгүй  
**Шийдэл**: `<div id="recaptcha-container"></div>` байгаа эсэхийг шалгах

### 2. "auth/invalid-phone-number"
**Шалтгаан**: Дугаар буруу формат  
**Шийдэл**: E.164 формат ашиглах (+976XXXXXXXX)

### 3. "auth/too-many-requests"
**Шалтгаан**: Хэт олон оролдлого  
**Шийдэл**: Хэдэн минут хүлээх, IP солих

### 4. "auth/quota-exceeded"
**Шалтгаан**: Өдрийн хязгаар хэтэрсэн (10 SMS)  
**Шийдэл**: 
- Blaze plan руу шилжих
- Маргааш хүлээх
- Backend SMS fallback ашиглах

### 5. SMS ирэхгүй байна
**Шалтгаан**: Firebase алдаа, carrier асуудал  
**Шийдэл**:
- Firebase Console → Authentication → Usage шалгах
- Test phone number ашиглах
- 1-2 минут хүлээх
- Өөр дугаар туршиж үзэх

---

## 📊 Monitoring

### Browser Console
```javascript
// Success flow
✅ Firebase initialized successfully
✅ Firebase Auth initialized
📱 Sending OTP via Firebase to: +97695279853
✅ OTP sent successfully via Firebase
🔐 Verifying OTP code via Firebase
👤 Firebase user: { uid: "xxx", phoneNumber: "+97695279853" }
```

### Firebase Console
1. Authentication → Usage
   - SMS sent today
   - Success rate
   - Error codes

2. Authentication → Users
   - Phone-verified users
   - Last sign-in

---

## 🎯 Checklist

Бүх зүйл бэлэн эсэхийг шалгах:

- [x] ✅ Firebase initialized (`firebase.ts`)
- [x] ✅ Phone Auth service ready (`firebasePhoneAuth.ts`)
- [x] ✅ SMSVerification component updated
- [x] ✅ reCAPTCHA container added
- [x] ✅ Cleanup on unmount
- [ ] ⏳ Firebase Console → Phone Auth enabled
- [ ] ⏳ Authorized domains added (3say.vercel.app)
- [ ] ⏳ Test phone numbers added (optional)
- [ ] ⏳ Local testing done
- [ ] ⏳ Production deployment
- [ ] ⏳ Production testing with real phone

---

## 🔗 Resources

- [Firebase Phone Auth Docs](https://firebase.google.com/docs/auth/web/phone-auth)
- [reCAPTCHA Setup](https://firebase.google.com/docs/auth/web/phone-auth#use-invisible-recaptcha)
- [Error Codes](https://firebase.google.com/docs/reference/js/auth#autherrorcodes)
- [Pricing](https://firebase.google.com/pricing)
- [Console](https://console.firebase.google.com/project/zaraa-8d3a9)

---

## 🎉 Дараах Алхам

1. ✅ **Firebase Console тохируулах** (5 мин):
   - Phone Authentication идэвхжүүлэх
   - Domains нэмэх

2. ✅ **Local тестлэх** (2 мин):
   ```bash
   npm run dev
   ```

3. ✅ **Production deploy** (1 мин):
   ```bash
   git add .
   git commit -m "Add Firebase Phone Authentication"
   git push origin main
   # Vercel auto-deploys
   ```

4. ✅ **Production тестлэх**:
   - https://3say.vercel.app
   - Жинхэнэ дугаараар тестлэх

---

**Status**: 🟢 Ready for Firebase Console setup  
**Last Updated**: 2025-11-06  
**Project**: zaraa-8d3a9
