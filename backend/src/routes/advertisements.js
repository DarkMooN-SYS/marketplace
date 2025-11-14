import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';
import { getCollection, handleFirestoreError } from '../utils/firestoreHelper.js';
import cache from '../utils/cache.js';

const router = express.Router();

// Get all advertisements (all statuses for home page display)
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    
    // Create cache key based on query parameters
    const cacheKey = `ads:${category || 'all'}:${search || 'none'}:${page}:${limit}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('📦 Ads Cache HIT:', cacheKey);
      return res.json(cachedData);
    }
    
    console.log('🔍 Ads Cache MISS:', cacheKey);
    
    // Fetch advertisements with retry logic
    const advertisements = await getCollection(
      db.collection('advertisements'),
      {
        timeoutMs: 8000,
        maxRetries: 3
      }
    );
    
    // Filter by category in memory to avoid compound index requirement
    let filtered = advertisements.filter(ad => {
      if (category && category !== 'all' && ad.category !== category) {
        return false;
      }
      
      // Filter by search term
      if (search && 
          !ad.title?.toLowerCase().includes(search.toLowerCase()) && 
          !ad.description?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    // Sort by createdAt in memory (newest first)
    filtered.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt?._seconds * 1000 || a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt?._seconds * 1000 || b.createdAt);
      return dateB - dateA;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedAdvertisements = filtered.slice(startIndex, endIndex);

    const responseData = {
      advertisements: paginatedAdvertisements,
      total: filtered.length,
      page: parseInt(page),
      totalPages: Math.ceil(filtered.length / limit)
    };
    
    // Cache for 60 seconds (ads change less frequently than products)
    cache.set(cacheKey, responseData, 60000);

    res.json(responseData);
  } catch (error) {
    handleFirestoreError(error, res, 'Fetch advertisements');
  }
});

// Get single advertisement
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('advertisements').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    const data = doc.data();
    if (data.status !== 'approved') {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    res.json({
      id: doc.id,
      ...data
    });
  } catch (error) {
    console.error('Get advertisement error:', error);
    res.status(500).json({ error: 'Failed to fetch advertisement' });
  }
});

// Submit advertisement (authenticated users)
router.post('/', verifyJWT, async (req, res) => {
  try {
    // Accept frontend status values: 'running', 'scheduled', 'draft', 'completed'
    // Convert all to 'approved' for backend consistency (auto-approve all ads)
    const frontendStatus = req.body.status;
    const backendStatus = 'approved'; // Auto-approve all ads
    
    const advertisementData = {
      ...req.body,
      authorId: req.user.uid,
      status: backendStatus, // Backend uses 'approved'
      frontendStatus: frontendStatus, // Store original frontend status for display
      impressions: 0,
      clicks: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('advertisements').add(advertisementData);

    // Clear only advertisements cache (keep products cache intact)
    const cleared = cache.clearByPrefix('ads:');
    console.log('🗑️ Ads cache cleared after creation:', cleared.length, 'entries');

    res.status(201).json({
      message: 'Advertisement submitted successfully',
      advertisementId: docRef.id
    });
  } catch (error) {
    console.error('Submit advertisement error:', error);
    res.status(500).json({ error: 'Failed to submit advertisement' });
  }
});

// Update advertisement (authenticated users - admin or owner)
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    const adRef = db.collection('advertisements').doc(req.params.id);
    const doc = await adRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    const existingData = doc.data();
    
    // Check if user is admin or owner
    if (req.user.role !== 'admin' && existingData.authorId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // Don't allow changing authorId or creation timestamp
    delete updateData.authorId;
    delete updateData.createdAt;
    delete updateData.impressions;
    delete updateData.clicks;

    await adRef.update(updateData);

    // Clear only advertisements cache (keep products cache intact)
    const cleared = cache.clearByPrefix('ads:');
    console.log('🗑️ Ads cache cleared after update:', cleared.length, 'entries');

    const updatedDoc = await adRef.get();
    res.json({
      message: 'Advertisement updated successfully',
      advertisement: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Update advertisement error:', error);
    res.status(500).json({ error: 'Failed to update advertisement' });
  }
});

// Delete advertisement (authenticated users - admin or owner)
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const adRef = db.collection('advertisements').doc(req.params.id);
    const doc = await adRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    const existingData = doc.data();
    
    // Check if user is admin or owner
    if (req.user.role !== 'admin' && existingData.authorId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await adRef.delete();

    // Clear only advertisements cache (keep products cache intact)
    const cleared = cache.clearByPrefix('ads:');
    console.log('🗑️ Ads cache cleared after deletion:', cleared.length, 'entries');

    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('Delete advertisement error:', error);
    res.status(500).json({ error: 'Failed to delete advertisement' });
  }
});

// Record impression
router.post('/:id/impression', async (req, res) => {
  try {
    const adRef = db.collection('advertisements').doc(req.params.id);
    const doc = await adRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    await adRef.update({
      impressions: (doc.data().impressions || 0) + 1,
      updatedAt: new Date()
    });

    res.json({ message: 'Impression recorded successfully' });
  } catch (error) {
    console.error('Record impression error:', error);
    res.status(500).json({ error: 'Failed to record impression' });
  }
});

// Record click
router.post('/:id/click', async (req, res) => {
  try {
    const adRef = db.collection('advertisements').doc(req.params.id);
    const doc = await adRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }

    await adRef.update({
      clicks: (doc.data().clicks || 0) + 1,
      updatedAt: new Date()
    });

    res.json({ message: 'Click recorded successfully' });
  } catch (error) {
    console.error('Record click error:', error);
    res.status(500).json({ error: 'Failed to record click' });
  }
});

export default router;