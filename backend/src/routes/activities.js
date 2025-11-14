import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';
import { getCollection, handleFirestoreError } from '../utils/firestoreHelper.js';

const router = express.Router();

/**
 * GET /api/activities
 * Get recent platform activities
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    console.log(`📋 [Activities API] Fetching ${limit} activities...`);
    
    const activities = await getCollection(
      db.collection('activities'),
      {
        limit: limit * 2, // Get more to sort in JS
        timeoutMs: 8000,
        maxRetries: 3
      }
    );

    console.log(`📋 [Activities API] Found ${activities.length} documents`);

    // Sort by timestamp in JavaScript (temporary until Firestore index is created)
    activities.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA; // Descending order (newest first)
    });

    // Limit after sorting
    const limitedActivities = activities.slice(0, limit);

    console.log(`✅ [Activities API] Returning ${limitedActivities.length} activities`);

    res.json({ activities: limitedActivities });
  } catch (error) {
    handleFirestoreError(error, res, 'Fetch activities');
  }
});

/**
 * POST /api/activities
 * Create a new activity log (admin only)
 */
router.post('/', verifyJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { action, item, type } = req.body;

    if (!action || !item || !type) {
      return res.status(400).json({ error: 'Missing required fields: action, item, type' });
    }

    const activityData = {
      action,
      item,
      type, // 'survey', 'product', 'ui_update', 'rank', 'news', etc.
      timestamp: new Date().toISOString(),
      createdBy: req.user.uid
    };

    const docRef = await db.collection('activities').add(activityData);

    res.status(201).json({
      message: 'Activity created successfully',
      activity: {
        id: docRef.id,
        ...activityData
      }
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

/**
 * GET /api/activities/upcoming
 * Get upcoming events/announcements
 */
router.get('/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const events = await getCollection(
      db.collection('upcoming_events'),
      {
        limit: limit * 2, // Get more than needed to filter in JS
        timeoutMs: 8000,
        maxRetries: 3
      }
    );

    const now = new Date();
    
    // Filter future events
    const futureEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= now;
    });

    // Sort by date in JavaScript (ascending - earliest first)
    futureEvents.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateA - dateB;
    });

    // Limit results
    const limitedEvents = futureEvents.slice(0, limit);

    res.json({ events: limitedEvents });
  } catch (error) {
    handleFirestoreError(error, res, 'Fetch upcoming events');
  }
});

/**
 * POST /api/activities/upcoming
 * Create a new upcoming event (admin only)
 */
router.post('/upcoming', verifyJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, subtitle, date } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'Missing required fields: title, date' });
    }

    const eventData = {
      title,
      subtitle: subtitle || '',
      date,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid
    };

    const docRef = await db.collection('upcoming_events').add(eventData);

    res.status(201).json({
      message: 'Upcoming event created successfully',
      event: {
        id: docRef.id,
        ...eventData
      }
    });
  } catch (error) {
    console.error('Error creating upcoming event:', error);
    res.status(500).json({ error: 'Failed to create upcoming event' });
  }
});

/**
 * Automatically log activity when certain events occur
 * This function can be called from other routes
 */
export async function logActivity(action, item, type) {
  try {
    await db.collection('activities').add({
      action,
      item,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export default router;

