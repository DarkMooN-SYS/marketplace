import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT, requireAdmin } from '../middleware/auth.js';
import { logActivity } from './activities.js';
import { 
  sanitizeRequest, 
  validateRequestSize, 
  validateArraySize,
  surveySubmissionLimiter,
  preventDuplicateSubmission 
} from '../middleware/security.js';

const router = express.Router();

// Get all surveys
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    
    let query = db.collection('surveys');
    
    // Filter by status (only approved surveys for public)
    query = query.where('status', '==', 'approved');
    
    const snapshot = await query.get();
    let surveys = [];
    
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
      
      surveys.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      });
    });
    
    // Sort by createdAt in memory (newest first)
    surveys.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB - dateA;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedSurveys = surveys.slice(startIndex, endIndex);

    res.json({
      surveys: paginatedSurveys,
      total: surveys.length,
      page: parseInt(page),
      totalPages: Math.ceil(surveys.length / limit),
      status: 'success'
    });
  } catch (error) {
    console.error('Get surveys error:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Get single survey
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('surveys').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const data = doc.data();
    if (data.status !== 'approved') {
      return res.status(404).json({ error: 'Survey not found' });
    }

    res.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt
    });
  } catch (error) {
    console.error('Get survey error:', error);
    res.status(500).json({ error: 'Failed to fetch survey' });
  }
});

// Submit survey (🔒 SECURITY: XSS sanitization + request size validation)
router.post('/', verifyJWT, sanitizeRequest, validateRequestSize(50), validateArraySize(50), async (req, res) => {
  try {
    const surveyData = {
      ...req.body,
      submitterId: req.user.uid,
      status: 'approved', // Auto-approved - no admin review needed
      responses: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('surveys').add(surveyData);

    // Log activity for new survey
    try {
      await logActivity(
        'Шинэ судалгаа эхэллээ',
        surveyData.title || 'Судалгаа',
        'survey'
      );
    } catch (activityError) {
      console.error('Failed to log survey activity:', activityError);
      // Don't fail the request if activity logging fails
    }

    res.status(201).json({
      message: 'Survey submitted successfully',
      surveyId: docRef.id
    });
  } catch (error) {
    console.error('Submit survey error:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

// Submit survey response (🔒 SECURITY: XSS + rate limiting + duplicate prevention)
router.post('/:id/responses', verifyJWT, sanitizeRequest, surveySubmissionLimiter, validateRequestSize(100), validateArraySize(100), async (req, res) => {
  try {
    const { answers } = req.body;
    const surveyId = req.params.id;
    const userId = req.user.uid;
    
    // 🔒 SECURITY: Prevent duplicate submissions (double rewards)
    // Check if user has already submitted this survey
    const existingResponse = await db.collection('surveyResponses')
      .where('surveyId', '==', surveyId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (!existingResponse.empty) {
      return res.status(409).json({ 
        error: 'already_submitted',
        message: 'You have already submitted this survey'
      });
    }
    
    // Get survey data
    const surveyDoc = await db.collection('surveys').doc(surveyId).get();
    if (!surveyDoc.exists) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    const surveyData = surveyDoc.data();
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const responseData = {
      surveyId: req.params.id,
      userId: req.user.uid,
      userName: userData?.name || 'Anonymous',
      answers,
      submittedAt: new Date()
    };

    const docRef = await db.collection('surveyResponses').add(responseData);

    // Update survey response count
    await db.collection('surveys').doc(req.params.id).update({
      responses: (surveyData.responses || 0) + 1,
      updatedAt: new Date()
    });

    // Award points or cash to user
    const reward = surveyData.reward || 0;
    const rewardType = surveyData.rewardType || 'points';
    
    if (reward > 0) {
      const userRef = db.collection('users').doc(req.user.uid);
      if (rewardType === 'cash') {
        await userRef.update({
          balance: (userData?.balance || 0) + reward
        });
      } else {
        await userRef.update({
          points: (userData?.points || 0) + reward
        });
      }
    }

    res.status(201).json({
      message: 'Survey response submitted successfully',
      responseId: docRef.id,
      reward: reward,
      rewardType: rewardType
    });
  } catch (error) {
    console.error('Submit survey response error:', error);
    res.status(500).json({ error: 'Failed to submit survey response' });
  }
});

export default router;