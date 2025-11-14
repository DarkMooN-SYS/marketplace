import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';
import { 
  sanitizeRequest, 
  validateRequestSize 
} from '../middleware/security.js';

const router = express.Router();

// Helper function to convert Firestore Timestamp to ISO string
function convertTimestamp(timestamp) {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return new Date(timestamp).toISOString();
}

// Get user's own reviews (must be before '/' route)
router.get('/my-reviews', verifyJWT, async (req, res) => {
  try {
    // Fetch reviews without orderBy to avoid composite index requirement
    const snapshot = await db.collection('reviews')
      .where('userId', '==', req.user.uid)
      .get();
    
    // Get all unique product IDs
    const productIds = [...new Set(snapshot.docs.map(doc => doc.data().productId))];
    
    // Fetch all products in parallel
    const productPromises = productIds.map(id => 
      db.collection('products').doc(id).get().catch(err => {
        console.warn(`Failed to get product ${id}:`, err);
        return null;
      })
    );
    
    const productDocs = await Promise.all(productPromises);
    
    // Create product name map
    const productNames = {};
    productDocs.forEach((doc, index) => {
      if (doc && doc.exists) {
        productNames[productIds[index]] = doc.data().name;
      }
    });
    
    // Build reviews array
    const reviews = [];
    snapshot.docs.forEach(doc => {
      const reviewData = doc.data();
      reviews.push({
        id: doc.id,
        ...reviewData,
        productName: productNames[reviewData.productId] || 'Unknown Product',
        createdAt: convertTimestamp(reviewData.createdAt),
        updatedAt: convertTimestamp(reviewData.updatedAt)
      });
    });

    // Sort in memory by createdAt descending
    reviews.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    res.json(reviews);
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get all reviews for a product (must be before '/' route)
router.get('/product/:productId', async (req, res) => {
  try {
    // Fetch reviews without orderBy to avoid composite index requirement
    const snapshot = await db.collection('reviews')
      .where('productId', '==', req.params.productId)
      .get();
    
    const reviews = [];
    snapshot.forEach(doc => {
      const reviewData = doc.data();
      reviews.push({
        id: doc.id,
        ...reviewData,
        createdAt: convertTimestamp(reviewData.createdAt),
        updatedAt: convertTimestamp(reviewData.updatedAt)
      });
    });

    // Sort in memory by createdAt descending
    reviews.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    res.json(reviews);
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get all reviews - public access (no auth required)
// Supports query params: ?productId=xxx&status=visible
router.get('/', async (req, res) => {
  try {
    const { productId, status } = req.query;
    
    let query = db.collection('reviews');
    
    // Filter by productId if provided
    if (productId) {
      query = query.where('productId', '==', productId);
    }
    
    // Filter by status if provided
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Fetch without orderBy to avoid composite index requirement
    const snapshot = await query.get();
    
    const reviews = [];
    snapshot.forEach(doc => {
      const reviewData = doc.data();
      reviews.push({
        id: doc.id,
        ...reviewData,
        createdAt: convertTimestamp(reviewData.createdAt),
        updatedAt: convertTimestamp(reviewData.updatedAt)
      });
    });

    // Sort in memory by createdAt descending
    reviews.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create review (🔒 SECURITY: XSS sanitization + request validation)
router.post('/', verifyJWT, sanitizeRequest, validateRequestSize(50), async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    // NOTE: Removed restriction - users can now leave multiple reviews per product
    // This allows users to update their experience or add follow-up reviews

    // Get user data for the review
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userData = userDoc.data();

    const reviewData = {
      productId,
      userId: req.user.uid,
      userName: userData?.name || 'Anonymous',
      userAvatar: userData?.avatar || null,
      rating: parseInt(rating),
      comment,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('reviews').add(reviewData);

    // Update product's average rating
    await updateProductRating(productId);

    res.status(201).json({
      message: 'Review created successfully',
      reviewId: docRef.id
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    const reviewRef = db.collection('reviews').doc(req.params.id);
    const reviewDoc = await reviewRef.get();
    
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const reviewData = reviewDoc.data();
    
    // Check if user owns the review
    if (reviewData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    await reviewRef.update(updateData);

    // Update product's average rating
    await updateProductRating(reviewData.productId);

    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete review
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const reviewRef = db.collection('reviews').doc(req.params.id);
    const reviewDoc = await reviewRef.get();
    
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const reviewData = reviewDoc.data();
    
    // Check if user owns the review or is admin
    if (reviewData.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await reviewRef.delete();

    // Update product's average rating
    await updateProductRating(reviewData.productId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Helper function to update product rating
async function updateProductRating(productId) {
  try {
    // First check if product exists
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      console.warn(`Product ${productId} not found. Skipping rating update.`);
      return;
    }

    const reviewsSnapshot = await db.collection('reviews')
      .where('productId', '==', productId)
      .get();
    
    if (reviewsSnapshot.empty) {
      // No reviews, set rating to 0
      await db.collection('products').doc(productId).update({
        rating: 0,
        reviewCount: 0
      });
      return;
    }

    let totalRating = 0;
    let reviewCount = 0;

    reviewsSnapshot.forEach(doc => {
      const review = doc.data();
      totalRating += review.rating;
      reviewCount++;
    });

    const averageRating = totalRating / reviewCount;

    await db.collection('products').doc(productId).update({
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount
    });
  } catch (error) {
    console.error('Update product rating error:', error);
  }
}

export default router;