import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';
import cache from '../utils/cache.js';
import { 
  sanitizeRequest, 
  validateRequestSize, 
  validateArraySize 
} from '../middleware/security.js';

const router = express.Router();

// Helper function to calculate seller rating
async function calculateSellerRating(sellerId) {
  try {
    // Get all products by this seller
    const productsSnapshot = await db.collection('products')
      .where('sellerId', '==', sellerId)
      .get();
    
    if (productsSnapshot.empty) {
      return 0; // Default rating if no products
    }

    const productIds = [];
    productsSnapshot.forEach(doc => {
      productIds.push(doc.id);
    });

    // Get all reviews for these products
    let totalRating = 0;
    let reviewCount = 0;

    for (const productId of productIds) {
      const reviewsSnapshot = await db.collection('reviews')
        .where('productId', '==', productId)
        .get();
      
      reviewsSnapshot.forEach(doc => {
        const reviewData = doc.data();
        totalRating += reviewData.rating;
        reviewCount++;
      });
    }

    if (reviewCount === 0) {
      return 0; // Default rating if no reviews
    }

    return parseFloat((totalRating / reviewCount).toFixed(1));
  } catch (error) {
    console.error('Calculate seller rating error:', error);
    return 0; // Fallback to default
  }
}

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    
    // Create cache key based on query parameters
    const cacheKey = `products:${category || 'all'}:${search || 'none'}:${page}:${limit}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('📦 Cache HIT:', cacheKey);
      return res.json(cachedData);
    }
    
    console.log('🔍 Cache MISS:', cacheKey);
    
    let query = db.collection('products');
    
    // Filter by category
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }
    
    // Filter by status (only approved products for public)
    query = query.where('status', '==', 'approved');
    
    const snapshot = await query.get();
    let products = [];
    
    // Fetch seller information for each product
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!search || data.title?.toLowerCase().includes(search.toLowerCase())) {
        let productData = {
          id: doc.id,
          ...data
        };

        // If product has sellerId, fetch real seller info from users collection
        if (data.sellerId) {
          try {
            const userDoc = await db.collection('users').doc(data.sellerId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              
              // Use default rating (5.0) or user's stored rating for better performance
              // Instead of calculating from reviews which causes N+1 query problem
              const sellerRating = userData.sellerRating || 5.0;
              
              // Update seller info with real user data
              productData.seller = {
                ...productData.seller,
                name: userData.name || productData.seller?.name || 'Борлуулагч',
                avatar: userData.avatar || productData.seller?.avatar || '/img/human.png',
                rating: sellerRating,
                contact: productData.seller?.contact || userData.phone || ''
              };
            }
          } catch (userError) {
            console.warn('Failed to fetch seller info for product', doc.id, userError);
            // Keep original seller data if fetch fails
          }
        }

        products.push(productData);
      }
    }

    // Sort by createdAt in memory (newest first - шинэ зүйлс эхэнд)
    products.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt?._seconds * 1000 || a.createdAt || 0);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt?._seconds * 1000 || b.createdAt || 0);
      return dateB - dateA; // Буурах дараалал (newest first)
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedProducts = products.slice(startIndex, endIndex);

    const responseData = {
      products: paginatedProducts,
      total: products.length,
      page: parseInt(page),
      totalPages: Math.ceil(products.length / limit)
    };
    
    // Cache for 30 seconds (products change frequently)
    cache.set(cacheKey, responseData, 30000);
    
    res.json(responseData);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let productData = {
      id: doc.id,
      ...doc.data()
    };

    // If product has sellerId, fetch real seller info from users collection
    if (productData.sellerId) {
      try {
        const userDoc = await db.collection('users').doc(productData.sellerId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          
          // Use default rating (5.0) or user's stored rating for better performance
          // Instead of calculating from reviews which causes N+1 query problem
          const sellerRating = userData.sellerRating || 5.0;
          
          // Update seller info with real user data
          productData.seller = {
            ...productData.seller,
            name: userData.name || productData.seller?.name || 'Борлуулагч',
            avatar: userData.avatar || productData.seller?.avatar || '/img/human.png',
            rating: sellerRating,
            contact: productData.seller?.contact || userData.phone || ''
          };
        }
      } catch (userError) {
        console.warn('Failed to fetch seller info for product', doc.id, userError);
        // Keep original seller data if fetch fails
      }
    }

    res.json(productData);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (🔒 SECURITY: XSS sanitization + request validation)
router.post('/', verifyJWT, sanitizeRequest, validateRequestSize(100), validateArraySize(20), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      sellerId: req.user.uid,
      status: 'approved', // Auto-approved - no admin review needed
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('products').add(productData);

    // Clear products cache when new product is created
    cache.clear();
    console.log('🗑️ Cache cleared after product creation');

    res.status(201).json({
      message: 'Product created successfully',
      productId: docRef.id
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    const productRef = db.collection('products').doc(req.params.id);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = productDoc.data();
    
    // Check if user owns the product or is admin
    if (productData.sellerId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    await productRef.update(updateData);

    // Clear products cache when product is updated
    cache.clear();
    console.log('🗑️ Cache cleared after product update');

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const productRef = db.collection('products').doc(req.params.id);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = productDoc.data();
    
    // Check if user owns the product or is admin
    if (productData.sellerId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await productRef.delete();

    // Clear products cache when product is deleted
    cache.clear();
    console.log('🗑️ Cache cleared after product deletion');

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get user's products
router.get('/user/my-products', verifyJWT, async (req, res) => {
  try {
    const snapshot = await db.collection('products')
      .where('sellerId', '==', req.user.uid)
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
    console.error('Get user products error:', error);
    res.status(500).json({ error: 'Failed to fetch user products' });
  }
});

// Wishlist/Save product (toggle)
router.post('/:id/wishlist', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const productRef = db.collection('products').doc(id);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const productData = productDoc.data();
    const savedBy = productData.savedBy || [];
    const isSaved = savedBy.includes(userId);
    
    // Toggle wishlist
    let newSaves = productData.saves || 0;
    let newSavedBy = [...savedBy];
    
    if (isSaved) {
      // Remove from wishlist
      newSaves = Math.max(0, newSaves - 1);
      newSavedBy = newSavedBy.filter(id => id !== userId);
    } else {
      // Add to wishlist
      newSaves += 1;
      newSavedBy.push(userId);
    }
    
    await productRef.update({
      saves: newSaves,
      savedBy: newSavedBy,
      updatedAt: new Date()
    });
    
    res.json({
      saves: newSaves,
      isSaved: !isSaved
    });
  } catch (error) {
    console.error('Wishlist product error:', error);
    res.status(500).json({ error: 'Failed to update wishlist' });
  }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    const productRef = db.collection('products').doc(id);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const productData = productDoc.data();
    const newViews = (productData.views || 0) + 1;
    
    await productRef.update({
      views: newViews,
      updatedAt: new Date()
    });
    
    res.json({
      views: newViews
    });
  } catch (error) {
    console.error('View product error:', error);
    res.status(500).json({ error: 'Failed to increment view' });
  }
});

// Get user's wishlist
router.get('/user/wishlist', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const snapshot = await db.collection('products')
      .where('savedBy', 'array-contains', userId)
      .where('status', '==', 'approved')
      .get();
    
    const wishlist = [];
    snapshot.forEach(doc => {
      wishlist.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(wishlist);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

export default router;