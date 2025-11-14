import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';
import { logActivity } from './activities.js';
import cache from '../utils/cache.js';
import { 
  sanitizeRequest, 
  validateRequestSize 
} from '../middleware/security.js';

const router = express.Router();

// Get all approved news
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    
    // Create cache key based on query parameters
    const cacheKey = `news:${category || 'all'}:${search || 'none'}:${page}:${limit}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('📦 News Cache HIT:', cacheKey);
      return res.json(cachedData);
    }
    
    console.log('🔍 News Cache MISS:', cacheKey);
    
    let query = db.collection('news');
    
    // Filter by status (only approved news for public)
    query = query.where('status', '==', 'approved');
    
    const snapshot = await query.get();
    let news = [];
    
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
      
      news.push({
        id: doc.id,
        ...data
      });
    });
    
    // Sort by createdAt in memory (newest first)
    news.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt?._seconds * 1000 || a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt?._seconds * 1000 || b.createdAt);
      return dateB - dateA;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedNews = news.slice(startIndex, endIndex);

    const responseData = {
      news: paginatedNews,
      total: news.length,
      page: parseInt(page),
      totalPages: Math.ceil(news.length / limit)
    };
    
    // Cache for 60 seconds (news change less frequently)
    cache.set(cacheKey, responseData, 60000);

    res.json(responseData);
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Get single news article
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('news').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'News article not found' });
    }

    const data = doc.data();
    if (data.status !== 'approved') {
      return res.status(404).json({ error: 'News article not found' });
    }

    res.json({
      id: doc.id,
      ...data
    });
  } catch (error) {
    console.error('Get news article error:', error);
    res.status(500).json({ error: 'Failed to fetch news article' });
  }
});

// Submit news (🔒 SECURITY: XSS sanitization + request validation)
router.post('/', verifyJWT, sanitizeRequest, validateRequestSize(100), async (req, res) => {
  try {
    const newsData = {
      ...req.body,
      authorId: req.user.uid,
      status: 'approved', // Auto-approved - no admin review needed
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      likes: 0
    };

    const docRef = await db.collection('news').add(newsData);

    // Clear news cache
    const clearedEntries = cache.clearByPrefix('news:');
    console.log(`🗑️ News cache cleared: ${clearedEntries} entries`);

    // Auto-log activity when news is created
    try {
      await logActivity(
        'Шинэ мэдээ нийтлэгдлээ',
        newsData.title || 'Нэр байхгүй мэдээ',
        'news'
      );
    } catch (activityError) {
      console.error('Failed to log news activity:', activityError);
      // Don't fail the request if activity logging fails
    }

    res.status(201).json({
      message: 'News article submitted successfully',
      articleId: docRef.id
    });
  } catch (error) {
    console.error('Submit news error:', error);
    res.status(500).json({ error: 'Failed to submit news article' });
  }
});

// Like/Unlike news article
router.post('/:id/like', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const newsRef = db.collection('news').doc(id);
    const newsDoc = await newsRef.get();
    
    if (!newsDoc.exists) {
      return res.status(404).json({ error: 'News article not found' });
    }
    
    const newsData = newsDoc.data();
    const likedBy = newsData.likedBy || [];
    const isLiked = likedBy.includes(userId);
    
    // Toggle like
    let newLikes = newsData.likes || 0;
    let newLikedBy = [...likedBy];
    
    if (isLiked) {
      // Unlike
      newLikes = Math.max(0, newLikes - 1);
      newLikedBy = newLikedBy.filter(id => id !== userId);
    } else {
      // Like
      newLikes += 1;
      newLikedBy.push(userId);
    }
    
    await newsRef.update({
      likes: newLikes,
      likedBy: newLikedBy,
      updatedAt: new Date()
    });
    
    // Clear news cache since likes count changed
    const clearedEntries = cache.clearByPrefix('news:');
    console.log(`🗑️ News cache cleared (like): ${clearedEntries} entries`);
    
    res.json({
      likes: newLikes,
      isLiked: !isLiked
    });
  } catch (error) {
    console.error('Like news error:', error);
    res.status(500).json({ error: 'Failed to like news article' });
  }
});

// Increment view count
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    const newsRef = db.collection('news').doc(id);
    const newsDoc = await newsRef.get();
    
    if (!newsDoc.exists) {
      return res.status(404).json({ error: 'News article not found' });
    }
    
    const newsData = newsDoc.data();
    const newViews = (newsData.views || 0) + 1;
    
    await newsRef.update({
      views: newViews,
      updatedAt: new Date()
    });
    
    res.json({
      views: newViews
    });
  } catch (error) {
    console.error('View news error:', error);
    res.status(500).json({ error: 'Failed to increment view count' });
  }
});

export default router;