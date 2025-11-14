# 3say Backend API

Firebase болон Express.js ашигласан 3say marketplace-ийн backend сервис.

## Төслийн бүтэц

```
backend/
├── src/
│   ├── config/
│   │   └── firebase.js          # Firebase Admin SDK тохиргоо
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── users.js             # User management routes
│   │   ├── products.js          # Product CRUD routes
│   │   ├── reviews.js           # Review system routes
│   │   ├── surveys.js           # Survey system routes
│   │   ├── orders.js            # Order management routes
│   │   └── admin.js             # Admin dashboard routes
│   └── index.js                 # Main server file
├── .env.example                 # Environment variables template
├── .firebaserc                  # Firebase project config
├── firebase.json                # Firebase hosting/emulator config
├── firestore.rules              # Firestore security rules
└── package.json
```

## Суулгах заавар

1. **Dependencies суулгах:**
   ```bash
   cd backend
   npm install
   ```

2. **Environment variables тохируулах:**
   ```bash
   cp .env.example .env
   ```
   
   `.env` файлд дараах мэдээллийг бөглөнө:
   ```
   FIREBASE_PROJECT_ID=zaraa-8d3a9
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@zaraa-8d3a9.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n"
   JWT_SECRET=your-super-secret-jwt-key-here
   ```

3. **Firebase Service Account Key авах:**
   - Firebase Console руу орно
   - Project Settings > Service Accounts
   - "Generate new private key" товчийг дарна
   - JSON файлаас мэдээллийг `.env` файлд хуулна

## Серверийг ажиллуулах

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

### Firebase emulator:
```bash
npm run firebase:emulator
```

Сервер `http://localhost:5000` дээр ажиллана.

## API Documentation

### Authentication

#### POST `/api/auth/register`
Шинэ хэрэглэгч бүртгэх
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "phone": "+976-88888888"
}
```

#### POST `/api/auth/login`
Хэрэглэгч нэвтрэх
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### GET `/api/auth/verify`
Token баталгаажуулах
Headers: `Authorization: Bearer <token>`

### Users

#### GET `/api/users/profile`
Хэрэглэгчийн профайл авах
Headers: `Authorization: Bearer <token>`

#### PUT `/api/users/profile`
Профайл засах
```json
{
  "name": "New Name",
  "phone": "+976-99999999",
  "avatar": "base64_image_string"
}
```

#### POST `/api/users/balance`
Дансны үлдэгдэл өөрчлөх
```json
{
  "amount": 10000,
  "type": "add" // or "subtract"
}
```

### Products

#### GET `/api/products`
Бүх бүтээгдэхүүн авах
Query params: `category`, `search`, `page`, `limit`

#### POST `/api/products`
Шинэ бүтээгдэхүүн нэмэх
```json
{
  "name": "Product Name",
  "description": "Product Description",
  "price": 50000,
  "category": "electronics",
  "images": ["image1.jpg", "image2.jpg"],
  "stock": 10
}
```

#### PUT `/api/products/:id`
Бүтээгдэхүүн засах

#### DELETE `/api/products/:id`
Бүтээгдэхүүн устгах

### Reviews

#### GET `/api/reviews/product/:productId`
Бүтээгдэхүүний сэтгэгдлүүд авах

#### POST `/api/reviews`
Сэтгэгдэл нэмэх
```json
{
  "productId": "product_id",
  "rating": 5,
  "comment": "Great product!"
}
```

### Orders

#### GET `/api/orders/my-orders`
Хэрэглэгчийн захиалгууд авах

#### POST `/api/orders`
Захиалга үүсгэх
```json
{
  "productId": "product_id",
  "quantity": 2,
  "totalAmount": 100000
}
```

### Admin Routes

Бүх admin route-д admin эрх шаардлагатай.

#### GET `/api/admin/products/pending`
Хүлээлгэдэж буй бүтээгдэхүүнүүд

#### PUT `/api/admin/products/:id/status`
Бүтээгдэхүүн зөвшөөрөх/татгалзах
```json
{
  "status": "approved", // or "rejected"
  "reason": "Rejection reason (optional)"
}
```

#### GET `/api/admin/dashboard/stats`
Dashboard статистик

## Database Schema

### Users Collection
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
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Products Collection
```json
{
  "id": "product_id",
  "name": "Product Name",
  "description": "Product Description",
  "price": 50000,
  "category": "electronics",
  "images": ["image1.jpg"],
  "stock": 10,
  "sellerId": "user_id",
  "status": "pending", // "approved", "rejected"
  "rating": 4.5,
  "reviewCount": 10,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Reviews Collection
```json
{
  "id": "review_id",
  "productId": "product_id",
  "userId": "user_id",
  "userName": "User Name",
  "userAvatar": "image_url",
  "rating": 5,
  "comment": "Great product!",
  "createdAt": "timestamp"
}
```

## Security

- Firebase Authentication ашиглана
- Firestore Security Rules-ээр хандалтыг хязгаарлана
- JWT token-ээр API эрх тодорхойлно
- Admin эрхийг `role` field-ээр шалгана

## Deployment

### Firebase Hosting:
```bash
npm run firebase:deploy
```

### Custom Server:
1. Production environment variables тохируулах
2. Server deploy хийх (Heroku, DigitalOcean гэх мэт)
3. Firebase Service Account мэдээллийг тохируулах

## Development Tips

1. **Firebase Emulator Suite ашиглах:**
   - Local дээр Firestore, Auth emulator ажиллуулж development хийх
   
2. **Environment Variables:**
   - Production болон development орчинд тус тусын Firebase project ашиглах
   
3. **Security:**
   - Service Account Private Key-г git-д оруулахгүй
   - JWT Secret-ыг random string хийх