import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';
import { logActivity } from './activities.js';
import { 
  sanitizeRequest, 
  validateRequestSize 
} from '../middleware/security.js';

const router = express.Router();

// Get all approved weblinks
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    
    let query = db.collection('weblinks');
    
    // Filter by status (only approved weblinks for public)
    query = query.where('status', '==', 'approved');
    
    const snapshot = await query.get();
    let weblinks = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Filter by category in memory to avoid compound index requirement
      if (category && category !== 'all' && data.category !== category) {
        return;
      }
      
      // Filter by search term
      if (search && 
          !data.title?.toLowerCase().includes(search.toLowerCase()) && 
          !data.description?.toLowerCase().includes(search.toLowerCase())) {
        return;
      }
      
      weblinks.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      });
    });
    
    // Sort by createdAt in memory (newest first)
    weblinks.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt?._seconds * 1000 || a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt?._seconds * 1000 || b.createdAt);
      return dateB - dateA;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedWeblinks = weblinks.slice(startIndex, endIndex);

    res.json({
      weblinks: paginatedWeblinks,
      total: weblinks.length,
      page: parseInt(page),
      totalPages: Math.ceil(weblinks.length / limit)
    });
  } catch (error) {
    console.error('Get weblinks error:', error);
    res.status(500).json({ error: 'Failed to fetch weblinks' });
  }
});

// Get single weblink
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('weblinks').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Weblink not found' });
    }

    const data = doc.data();
    if (data.status !== 'approved') {
      return res.status(404).json({ error: 'Weblink not found' });
    }

    res.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt
    });
  } catch (error) {
    console.error('Get weblink error:', error);
    res.status(500).json({ error: 'Failed to fetch weblink' });
  }
});

// Submit weblink (🔒 SECURITY: XSS sanitization + request validation)
router.post('/', verifyJWT, sanitizeRequest, validateRequestSize(50), async (req, res) => {
  try {
    const { title, url, description, category, logo, isOfficial, featured } = req.body;
    
    if (!title || !url || !description || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const weblinkData = {
      title,
      url,
      description,
      category,
      logo: logo || null,
      isOfficial: isOfficial || false,
      featured: featured || false,
      votes: 0,
      submittedBy: req.user.uid,
      status: 'approved', // Auto-approved - no admin review needed
      dateAdded: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('weblinks').add(weblinkData);

    // Log activity for new weblink
    try {
      await logActivity(
        'Шинэ линк нэмэгдлээ',
        weblinkData.title || 'Вэб линк',
        'weblink'
      );
    } catch (activityError) {
      console.error('Failed to log weblink activity:', activityError);
      // Don't fail the request if activity logging fails
    }

    res.status(201).json({
      message: 'Weblink submitted successfully',
      weblinkId: docRef.id
    });
  } catch (error) {
    console.error('Submit weblink error:', error);
    res.status(500).json({ error: 'Failed to submit weblink' });
  }
});

// Vote on weblink
router.post('/:id/vote', verifyJWT, async (req, res) => {
  try {
    const weblinkRef = db.collection('weblinks').doc(req.params.id);
    const doc = await weblinkRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Weblink not found' });
    }

    const data = doc.data();
    await weblinkRef.update({
      votes: (data.votes || 0) + 1,
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Vote recorded successfully',
      votes: (data.votes || 0) + 1
    });
  } catch (error) {
    console.error('Vote weblink error:', error);
    res.status(500).json({ error: 'Failed to vote on weblink' });
  }
});

export default router;