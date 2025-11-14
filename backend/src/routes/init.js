import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

// Initialize database with sample data
router.post('/init', async (req, res) => {
  try {
    // Sample products data
    const sampleProducts = [
      {
        name: "Premium Wireless Headphones",
        description: "High-quality wireless headphones with noise cancellation",
        price: 299000,
        category: "electronics",
        images: ["https://via.placeholder.com/300x300?text=Headphones"],
        seller: {
          id: "seller1",
          name: "Tech Store",
          email: "tech@store.com"
        },
        status: "approved",
        stock: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Stylish Winter Jacket",
        description: "Modern stylish jacket perfect for winter weather",
        price: 150000,
        category: "clothing",
        images: ["https://via.placeholder.com/300x300?text=Jacket"],
        seller: {
          id: "seller2",
          name: "Fashion Hub",
          email: "fashion@hub.com"
        },
        status: "approved",
        stock: 8,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Organic Coffee Beans",
        description: "Premium organic coffee beans from Mongolia",
        price: 25000,
        category: "food",
        images: ["https://via.placeholder.com/300x300?text=Coffee"],
        seller: {
          id: "seller3",
          name: "Local Roasters",
          email: "roasters@local.mn"
        },
        status: "approved",
        stock: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Gaming Mouse",
        description: "High precision gaming mouse with RGB lighting",
        price: 85000,
        category: "electronics",
        images: ["https://via.placeholder.com/300x300?text=Mouse"],
        seller: {
          id: "seller1",
          name: "Tech Store",
          email: "tech@store.com"
        },
        status: "approved",
        stock: 25,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Traditional Mongolian Boots",
        description: "Authentic handmade Mongolian leather boots",
        price: 180000,
        category: "clothing",
        images: ["https://via.placeholder.com/300x300?text=Boots"],
        seller: {
          id: "seller4",
          name: "Traditional Crafts",
          email: "crafts@traditional.mn"
        },
        status: "approved",
        stock: 12,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Sample surveys data
    const sampleSurveys = [
      {
        id: "survey1",
        title: "Product Quality Survey",
        description: "Tell us about your experience with our products",
        questions: [
          {
            id: "q1",
            type: "rating",
            question: "How would you rate our product quality?",
            required: true
          },
          {
            id: "q2", 
            type: "text",
            question: "What improvements would you suggest?",
            required: false
          }
        ],
        reward: 50,
        timeLimit: 5,
        status: "approved",
        responses: 0,
        maxResponses: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "survey2",
        title: "User Experience Survey",
        description: "Help us improve our platform",
        questions: [
          {
            id: "q1",
            type: "rating",
            question: "How easy is it to navigate our website?",
            required: true
          }
        ],
        reward: 30,
        timeLimit: 3,
        status: "approved", 
        responses: 0,
        maxResponses: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Sample weblinks data
    const sampleWeblinks = [
      {
        id: "link1",
        title: "Tech News Mongolia",
        url: "https://technews.mn",
        description: "Latest technology news in Mongolia",
        category: "Technology",
        votes: 15,
        hasVoted: false,
        status: "approved",
        submittedBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "link2", 
        title: "Business Portal",
        url: "https://business.mn",
        description: "Business news and updates",
        category: "Business",
        votes: 8,
        hasVoted: false,
        status: "approved",
        submittedBy: "user2", 
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Add all data to Firestore
    const batch = db.batch();
    
    // Add products
    for (const product of sampleProducts) {
      const productRef = db.collection('products').doc();
      batch.set(productRef, product);
    }

    // Add surveys
    for (const survey of sampleSurveys) {
      const surveyRef = db.collection('surveys').doc();
      batch.set(surveyRef, survey);
    }

    // Add weblinks
    for (const weblink of sampleWeblinks) {
      const weblinkRef = db.collection('weblinks').doc();
      batch.set(weblinkRef, weblink);
    }

    await batch.commit();

    res.json({ 
      message: 'Database initialized successfully',
      productsAdded: sampleProducts.length,
      surveysAdded: sampleSurveys.length,
      weblinksAdded: sampleWeblinks.length
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize database' });
  }
});

// Clear all data (for testing)
router.delete('/clear', async (req, res) => {
  try {
    const batch = db.batch();
    
    // Clear products
    const productsSnapshot = await db.collection('products').get();
    productsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Clear surveys
    const surveysSnapshot = await db.collection('surveys').get();
    surveysSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Clear weblinks
    const weblinksSnapshot = await db.collection('weblinks').get();
    weblinksSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    res.json({ message: 'All data cleared successfully' });
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

export default router;