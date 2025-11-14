import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT, requireAdmin } from '../middleware/auth.js';
import cache from '../utils/cache.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyJWT);
router.use(requireAdmin);

// Get all pending products
router.get('/products/pending', async (req, res) => {
  try {
    const snapshot = await db.collection('products')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    const products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(products);
  } catch (error) {
    console.error('Get pending products error:', error);
    res.status(500).json({ error: 'Failed to fetch pending products' });
  }
});

// Approve/reject product
router.put('/products/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body; // status: 'approved' or 'rejected'
    
    const updateData = {
      status,
      reviewedAt: new Date(),
      reviewedBy: req.user.uid,
      updatedAt: new Date()
    };
    
    if (reason) {
      updateData.rejectionReason = reason;
    }

    await db.collection('products').doc(req.params.id).update(updateData);

    res.json({ message: `Product ${status} successfully` });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({ error: 'Failed to update product status' });
  }
});

// Get all pending surveys
router.get('/surveys/pending', async (req, res) => {
  try {
    const snapshot = await db.collection('surveys')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    const surveys = [];
    snapshot.forEach(doc => {
      surveys.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(surveys);
  } catch (error) {
    console.error('Get pending surveys error:', error);
    res.status(500).json({ error: 'Failed to fetch pending surveys' });
  }
});

// Approve/reject survey
router.put('/surveys/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const updateData = {
      status,
      reviewedAt: new Date(),
      reviewedBy: req.user.uid,
      updatedAt: new Date()
    };
    
    if (reason) {
      updateData.rejectionReason = reason;
    }

    await db.collection('surveys').doc(req.params.id).update(updateData);

    res.json({ message: `Survey ${status} successfully` });
  } catch (error) {
    console.error('Update survey status error:', error);
    res.status(500).json({ error: 'Failed to update survey status' });
  }
});

// Get all pending news
router.get('/news/pending', async (req, res) => {
  try {
    const snapshot = await db.collection('news')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    const news = [];
    snapshot.forEach(doc => {
      news.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(news);
  } catch (error) {
    console.error('Get pending news error:', error);
    res.status(500).json({ error: 'Failed to fetch pending news' });
  }
});

// Approve/reject news
router.put('/news/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const updateData = {
      status,
      reviewedAt: new Date(),
      reviewedBy: req.user.uid,
      updatedAt: new Date()
    };
    
    if (reason) {
      updateData.rejectionReason = reason;
    }

    await db.collection('news').doc(req.params.id).update(updateData);

    // Clear news cache
    const clearedEntries = cache.clearByPrefix('news:');
    console.log(`🗑️ News cache cleared (status update): ${clearedEntries} entries`);

    res.json({ message: `News ${status} successfully` });
  } catch (error) {
    console.error('Update news status error:', error);
    res.status(500).json({ error: 'Failed to update news status' });
  }
});

// Get all pending weblinks
router.get('/weblinks/pending', async (req, res) => {
  try {
    const snapshot = await db.collection('weblinks')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    const weblinks = [];
    snapshot.forEach(doc => {
      weblinks.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(weblinks);
  } catch (error) {
    console.error('Get pending weblinks error:', error);
    res.status(500).json({ error: 'Failed to fetch pending weblinks' });
  }
});

// Approve/reject weblink
router.put('/weblinks/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const updateData = {
      status,
      reviewedAt: new Date(),
      reviewedBy: req.user.uid,
      updatedAt: new Date()
    };
    
    if (reason) {
      updateData.rejectionReason = reason;
    }

    await db.collection('weblinks').doc(req.params.id).update(updateData);

    res.json({ message: `Weblink ${status} successfully` });
  } catch (error) {
    console.error('Update weblink status error:', error);
    res.status(500).json({ error: 'Failed to update weblink status' });
  }
});

// Get all pending advertisements
router.get('/advertisements/pending', async (req, res) => {
  try {
    const snapshot = await db.collection('advertisements')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    const advertisements = [];
    snapshot.forEach(doc => {
      advertisements.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(advertisements);
  } catch (error) {
    console.error('Get pending advertisements error:', error);
    res.status(500).json({ error: 'Failed to fetch pending advertisements' });
  }
});

// Approve/reject advertisement
router.put('/advertisements/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const updateData = {
      status,
      reviewedAt: new Date(),
      reviewedBy: req.user.uid,
      updatedAt: new Date()
    };
    
    if (reason) {
      updateData.rejectionReason = reason;
    }

    await db.collection('advertisements').doc(req.params.id).update(updateData);

    res.json({ message: `Advertisement ${status} successfully` });
  } catch (error) {
    console.error('Update advertisement status error:', error);
    res.status(500).json({ error: 'Failed to update advertisement status' });
  }
});

// Get dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [usersSnapshot, productsSnapshot, ordersSnapshot, reviewsSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('products').get(),
      db.collection('orders').get(),
      db.collection('reviews').get()
    ]);

    const stats = {
      totalUsers: usersSnapshot.size,
      totalProducts: productsSnapshot.size,
      totalOrders: ordersSnapshot.size,
      totalReviews: reviewsSnapshot.size,
      pendingProducts: 0,
      pendingSurveys: 0,
      pendingNews: 0,
      pendingWeblinks: 0,
      pendingAdvertisements: 0
    };

    // Count pending items
    productsSnapshot.forEach(doc => {
      if (doc.data().status === 'pending') stats.pendingProducts++;
    });

    const [surveysSnapshot, newsSnapshot, weblinksSnapshot, advertisementsSnapshot] = await Promise.all([
      db.collection('surveys').where('status', '==', 'pending').get(),
      db.collection('news').where('status', '==', 'pending').get(),
      db.collection('weblinks').where('status', '==', 'pending').get(),
      db.collection('advertisements').where('status', '==', 'pending').get()
    ]);
    
    stats.pendingSurveys = surveysSnapshot.size;
    stats.pendingNews = newsSnapshot.size;
    stats.pendingWeblinks = weblinksSnapshot.size;
    stats.pendingAdvertisements = advertisementsSnapshot.size;

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;