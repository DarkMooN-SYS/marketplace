// Script to initialize default banks in Firestore
// Run with: node src/scripts/initBanks.js

import { db } from '../config/firebase.js';

const defaultBanks = [
  {
    name: 'ХААН Банк',
    short: 'KHAN',
    description: '24/7 дигитал банкны үйлчилгээ',
    gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
    logo: null,
    isActive: true,
    order: 1
  },
  {
    name: 'TDB Online',
    short: 'TDB',
    description: 'Олон улсын гүйлгээний дэмжлэгтэй',
    gradient: 'from-blue-500 via-indigo-500 to-blue-700',
    logo: null,
    isActive: true,
    order: 2
  },
  {
    name: 'Social Pay',
    short: 'SOCIAL',
    description: 'Хэтэвч ба QR төлбөрийн экосистем',
    gradient: 'from-purple-500 via-fuchsia-500 to-purple-600',
    logo: null,
    isActive: true,
    order: 3
  },
  {
    name: 'Төрийн банк 3.0',
    short: 'STATE',
    description: 'Төрийн үйлчилгээний нэгдсэн төлбөр',
    gradient: 'from-sky-500 via-cyan-500 to-sky-600',
    logo: null,
    isActive: true,
    order: 4
  },
  {
    name: 'ХасБанк',
    short: 'XAC',
    description: 'Ногоон санхүүжилт, картын үйлчилгээ',
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    logo: null,
    isActive: true,
    order: 5
  },
  {
    name: 'Капитрон Банк',
    short: 'CAP',
    description: 'Смарт банкны шинэчлэл, картаар төлбөр',
    gradient: 'from-rose-500 via-pink-500 to-rose-600',
    logo: null,
    isActive: true,
    order: 6
  },
  {
    name: 'Богд Банк',
    short: 'BOGD',
    description: 'Корпорейт үйлчилгээ болон зээл',
    gradient: 'from-violet-500 via-purple-500 to-violet-600',
    logo: null,
    isActive: true,
    order: 7
  },
  {
    name: 'Голомт Банк',
    short: 'GOLOMT',
    description: 'Хамгийн том арилжааны банк',
    gradient: 'from-green-500 via-emerald-500 to-green-600',
    logo: null,
    isActive: true,
    order: 8
  },
  {
    name: 'Худалдаа Хөгжлийн Банк',
    short: 'TDB',
    description: 'Бизнесийн санхүүжилт',
    gradient: 'from-indigo-500 via-blue-500 to-indigo-600',
    logo: null,
    isActive: true,
    order: 9
  },
  {
    name: 'M Bank',
    short: 'MBANK',
    description: 'Модерн дижитал банк',
    gradient: 'from-cyan-500 via-teal-500 to-cyan-600',
    logo: null,
    isActive: true,
    order: 10
  }
];

async function initBanks() {
  try {
    console.log('🏦 Initializing banks...');

    // Check if banks already exist
    const existingBanks = await db.collection('banks').limit(1).get();
    
    if (!existingBanks.empty) {
      console.log('⚠️  Banks already exist in database. Skipping initialization.');
      console.log('💡 To re-initialize, delete the banks collection first.');
      return;
    }

    // Add all banks
    let count = 0;
    for (const bank of defaultBanks) {
      const bankData = {
        ...bank,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('banks').add(bankData);
      count++;
      console.log(`✅ Added: ${bank.name} (${bank.short})`);
    }

    console.log(`\n🎉 Successfully initialized ${count} banks!`);
    console.log('📡 Banks are now available at: GET /api/banks\n');

  } catch (error) {
    console.error('❌ Error initializing banks:', error);
    throw error;
  }
}

// Run the initialization
initBanks()
  .then(() => {
    console.log('✨ Bank initialization complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Bank initialization failed:', error);
    process.exit(1);
  });
