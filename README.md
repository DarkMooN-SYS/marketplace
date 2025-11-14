
# Vite React TypeScript Вэбсайтын README

Энэ бол React, TypeScript, Vite, Tailwind CSS ашигласан орчин үеийн, модульчлагдсан вэб апп юм. Хэрэглэгчийн самбар, профайл засвар, marketplace, судалгаа, wallet болон бусад боломжуудтай. UI нь dark/light mode-г глобал дэмждэг, бүх төхөөрөмжид responsive.

## Гол боломжууд
- Модульчлагдсан React компонентууд (Профайл, Marketplace, Судалгаа, Wallet гэх мэт)
- Глобал theme (dark/light mode) — CSS хувьсагч, ThemeContext ашиглана
- Бүх төхөөрөмжид responsive дизайн
- Sidebar болон tab navigation
- Профайл edit — avatar upload, шууд хадгалах
- Wishlist, захиалга, сэтгэгдэл зэрэг хэрэглэгчийн модуль
- Admin dashboard-оор дамжуулан судалгаа, веб холбоос, зар сурталчилгаа, мэдээ нийтлэл зэрэг контентыг дотоодоос удирдах
- Marketplace-ийн барааны дэлгэрэнгүй хуудсанд галерей, ижил барааны санал, борлуулагчийн мэдээллийг нэг ижил харьцаатайгаар харуулна
- Шинэ сэтгэгдлийн систем — Product Detail хуудаснаас үлдээсэн review нь LocalStorage-д хадгалагдаж, Profile > Reviews табтай бодитоор синк хийнэ
- Dark mode дахь товч, картуудын өнгө, градиентүүд сайжирсан
- Framer Motion — анимэйшн
- Lucide icon — орчин үеийн дизайн
- Supabase интеграци (backend-д бэлэн)

## Сүүлийн үеийн сайжруулалт
- Барааны дэлгэрэнгүй хуудсанд 4:3 харьцаатай галерей нэвтрүүлж, бүх зураг жигд харагддаг болсон.
- Сэтгэгдэл нэмэх үед хэрэглэгчийн нэр, avatar автоматаар авч, Profile-ийн сэтгэгдлийн жагсаалттай бодитоор холбогддог боллоо.
- Dark mode орчинд товч, карточ, чипүүдийн өнгөний ялгаралт, hover эффектүүдийг шинэчилж уншигдах чадварыг сайжруулсан.
- Marketplace-ийн "Ижил бараанууд" хэсгийг категориор эрэмбэлж илүү холбогдолтой санал харуулдаг болгосон.
- NavigationContext болон ProductContext-ийг цэгцэлж hash navigation-оор Product Detail руу шилжихийг хурдан болгосон.

## Төслийн бүтэц
```
project/
  src/
    components/      # Layout, Sidebar, Header гэх мэт
    contexts/        # Theme, Auth, Navigation context
    pages/           # Үндсэн хуудсууд (Profile, Marketplace, ...)
    ...
  public/
  index.html
  package.json
  tailwind.config.js
  vite.config.ts
```

## Эхлэх заавар
1. Хамааралтай package-уудыг суулгана:
   ```bash
   npm install
   ```
2. Хөгжүүлэлтийн серверийг асаана:
   ```bash
   npm run dev
   ```
3. Production build:
   ```bash
   npm run build
   ```
   4. Mock backend (json-server) асаах:
      ```bash
      npm run mock:server
      ```

   Mock сервер нь `http://localhost:4000` дээр ажиллаж, `db.json` файлын `users`, `products`, `reviews` өгөгдлийг REST API байдлаар хангана. Admin dashboard дээрх хүснэгтүүд энэ серверээс өгөгдөл авна.
   Админаас нэмсэн судалгаа, веб холбоос, зар сурталчилгаа, мэдээ нийтлэл зэрэг контент нь `localStorage`-д хадгалагдаж, хэрэглэгчийн талын хуудсуудтай `admin:*` эвентүүдээр real-time синк хийгддэг (`admin:survey-added`, `admin:links-sync`, `admin:news-added` гэх мэт).

## Firebase Backend-ийн дэлгэрэнгүй гарын авлага

### 1. Одоогийн архитектур
- **Frontend** — React + TypeScript + Vite (`src/` хавтас)
- **Backend** — Node.js + Express + Firebase (`backend/` хавтас)
- **Database** — Firebase Firestore (NoSQL document database)
- **Authentication** — Firebase Auth + JWT tokens
- **File Storage** — Firebase Storage

### Backend суулгах болон ажиллуулах:

1. **Backend хавтас руу шилжих:**
   ```bash
   cd backend
   npm install
   ```

2. **Environment тохируулах:**
   ```bash
   cp .env.example .env
   # .env файлд Firebase Service Account мэдээлэл бөглөх
   ```

3. **Backend server эхлүүлэх:**
   ```bash
   npm run dev
   ```
   Backend `http://localhost:5000` дээр ажиллана.

4. **Frontend тохируулах:**
   Frontend-ийн API холболтыг backend server лүү чиглүүлэхийн тулд `src/api/adminApi.ts` файлд `VITE_ADMIN_API_URL=http://localhost:5000` тохируулна.

### 2. Firebase тохиргоо
Backend хавтсанд Firebase Admin SDK болон бүх шаардлагатай тохиргоо бэлэн байгаа:
- **Firebase Admin SDK** — Server-side Firebase operations
- **Firestore Database** — NoSQL document database
- **Firebase Auth** — User authentication
- **Firebase Storage** — File storage (avatar, product images)

Firebase Service Account Key авах:
1. [Firebase Console](https://console.firebase.google.com/) руу орно
2. Project Settings > Service Accounts
3. "Generate new private key" товчийг дарна
4. JSON файлаас мэдээллийг `backend/.env` файлд хуулна

### 3. API Endpoints
Backend дараах REST API endpoints-уудыг хангана:

**Authentication:**
- `POST /api/auth/register` — Хэрэглэгч бүртгэх
- `POST /api/auth/login` — Нэвтрэх
- `GET /api/auth/verify` — Token баталгаажуулах

**Products:**
- `GET /api/products` — Бүх бүтээгдэхүүн
- `POST /api/products` — Шинэ бүтээгдэхүүн нэмэх
- `PUT /api/products/:id` — Засах
- `DELETE /api/products/:id` — Устгах

**Reviews:**
- `GET /api/reviews/product/:productId` — Бүтээгдэхүүний сэтгэгдлүүд
- `POST /api/reviews` — Сэтгэгдэл нэмэх

**Orders:**
- `GET /api/orders/my-orders` — Хэрэглэгчийн захиалгууд
- `POST /api/orders` — Захиалга үүсгэх

**Admin:**
- `GET /api/admin/products/pending` — Хүлээлгэдэж буй бүтээгдэхүүнүүд
- `PUT /api/admin/products/:id/status` — Зөвшөөрөх/татгалзах
- `GET /api/admin/dashboard/stats` — Dashboard статистик

Дэлгэрэнгүй API documentation `backend/README.md` файлд байна.

### 4. Frontend-Backend интеграци
Frontend-ийг Firebase backend-тай холбохын тулд дараах өөрчлөлтүүд хийгдэнэ:

**1. Firebase Client SDK нэмэх:**
Frontend хавтсанд Firebase client SDK суулгаж, authentication болон real-time updates хийх.

**2. API Client шинэчлэх:**
`src/api/adminApi.ts` файлыг backend API endpoints-тай холбох.

**3. Authentication Context:**
`src/contexts/AuthContext.tsx`-г Firebase Auth-тай интеграци хийх.

**4. Real-time updates:**
Firestore real-time listeners ашиглан UI автоматаар шинэчлэгддэг болгох.

**5. State management:**
LocalStorage stores-уудыг Firebase Firestore-тай орлуулах.

### 5. Database Schema
Firebase Firestore дараах collections-уудтай:

**Users:**
```json
{
  "id": "user_id",
  "name": "User Name",
  "email": "user@example.com", 
  "phone": "+976-88888888",
  "avatar": "image_url",
  "role": "user", // or "admin"
  "balance": 50000,
  "membershipLevel": "bronze",
  "createdAt": "timestamp"
}
```

**Products:**
```json
{
  "id": "product_id",
  "name": "Product Name",
  "description": "Description",
  "price": 50000,
  "category": "electronics", 
  "images": ["image1.jpg"],
  "stock": 10,
  "sellerId": "user_id",
  "status": "pending", // "approved", "rejected"
  "rating": 4.5,
  "reviewCount": 10
}
```

**Reviews, Orders, Surveys** болон бусад collections-ын дэлгэрэнгүй schema `backend/README.md` файлд байна.

### 6. Security & Deployment
**Security Features:**
- Firebase Authentication
- Firestore Security Rules 
- JWT token verification
- Role-based access control (Admin/User)

**Deployment options:**
1. **Firebase Hosting** — Static frontend + Cloud Functions
2. **Custom Server** — Deploy backend to Heroku, DigitalOcean гэх мэт
3. **Hybrid** — Frontend Firebase Hosting, Backend custom server

**Development workflow:**
```bash
# Backend development
cd backend
npm run dev

# Frontend development  
npm run dev

# Production build
npm run build
npm run firebase:deploy
```

### 7. Migration Plan (Mock-аас Firebase руу)
LocalStorage болон mock data-гаас Firebase руу шилжих алхмууд:

**Phase 1: Backend Setup**
- ✅ Firebase backend бүтэц үүсгэсэн  
- ✅ API endpoints бэлэн
- ⏳ Firebase Service Account тохируулах

**Phase 2: Frontend Integration**
- Firebase Client SDK нэмэх
- AuthContext-г Firebase Auth-тай холбох
- API calls-г backend endpoints лүү чиглүүлэх

**Phase 3: Data Migration**
- Mock data-г Firestore руу import хийх
- LocalStorage stores-г Firebase real-time listeners-ээр орлуулах
- Testing болон bug fixes

**Phase 4: Production Deploy**
- Environment variables тохируулах
- Security rules нарийвчлах 
- Production deployment

### 8. Дараагийн алхмууд
Firebase backend бэлэн болсон. Одоо дараах ажлуудыг хийх хэрэгтэй:

1. **Firebase Service Account тохируулах:**
   - Firebase Console-аас Service Account Key татаж авах
   - `backend/.env` файлд Firebase мэдээлэл оруулах

2. **Frontend Firebase Client нэмэх:**
   ```bash
   npm install firebase
   ```

3. **API Integration:**
   - `src/api/adminApi.ts`-г backend endpoints-тай холбох
   - `src/contexts/AuthContext.tsx`-г Firebase Auth-тай интеграци хийх

4. **Testing:**
   - Backend API endpoints тест хийх
   - Frontend-Backend холболт шалгах

Дэлгэрэнгүй заавар `backend/README.md` файлд байна.

## Theme систем
- Theme-г глобал ThemeContext болон `index.css`-д CSS хувьсагчаар удирдана.
- Хэрэглэгч dark, light, эсвэл system theme-г сонгох боломжтой.
- Бүх өнгө (background, text, border, button) нь хувьсагчаар шууд солигдоно.

## Хувьсгалт
- Шинэ page/component-уудыг `src/pages` эсвэл `src/components`-д нэмнэ.
- Theme хувьсагчийг `index.css`-д өөрчилж брэндийн өнгө тохируулна.
- Backend (Supabase гэх мэт)-тай интеграци хийх боломжтой.

## Лиценз
MIT


martketplace hudaldan avah button bolon heseg
spin wheel zasah
text/button size responsive zasah, bas admin hesgiig
ui/ux zasan geed baisan ongo zorood baina geed baisan shu
profile iin ayuulgui baidliin hesegdeer gmail verify nemeh, Нэвтэрсэн төхөөрөмжүүд ene hesgiig zasah
header hesgiin wallet iin tsenegleh bolon tatah ruu orood haragdah baidliig zasaarai
teged bugdiin test hiiged attack hiih geed uzeerei#   t e n g i s  
 