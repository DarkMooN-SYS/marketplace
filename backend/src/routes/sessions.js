import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/sessions
 * Create a new session (called on login)
 */
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { deviceType, deviceName, location } = req.body;
    
    const session = {
      userId: req.user.uid,
      deviceType: deviceType || 'Desktop',
      deviceName: deviceName || 'Unknown Device',
      location: location || 'Unknown',
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || '',
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('sessions').add(session);
    
    res.json({
      success: true,
      session: {
        id: docRef.id,
        ...session
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /api/sessions
 * Get all active sessions for the current user
 */
router.get('/', verifyJWT, async (req, res) => {
  try {
    const snapshot = await db
      .collection('sessions')
      .where('userId', '==', req.user.uid)
      .get();

    const sessions = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        id: doc.id,
        type: data.deviceType || 'Desktop',
        lastLogin: data.lastActivity || data.createdAt,
        location: data.location || 'Unknown',
        deviceName: data.deviceName || 'Unknown Device',
        userAgent: data.userAgent || '',
        ip: data.ip || ''
      });
    });

    // Sort by lastLogin in memory instead of in query
    sessions.sort((a, b) => {
      const dateA = new Date(a.lastLogin);
      const dateB = new Date(b.lastLogin);
      return dateB.getTime() - dateA.getTime();
    });

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * PUT /api/sessions/:id/activity
 * Update last activity time for a session
 */
router.put('/:id/activity', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the session belongs to the user
    const sessionDoc = await db.collection('sessions').doc(id).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    if (sessionData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.collection('sessions').doc(id).update({
      lastActivity: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating session activity:', error);
    res.status(500).json({ error: 'Failed to update session activity' });
  }
});

/**
 * DELETE /api/sessions/:id
 * Logout from a specific device/session
 */
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the session belongs to the user
    const sessionDoc = await db.collection('sessions').doc(id).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    if (sessionData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.collection('sessions').doc(id).delete();

    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

/**
 * DELETE /api/sessions
 * Logout from all devices except current (optional)
 */
router.delete('/', verifyJWT, async (req, res) => {
  try {
    const { exceptCurrentSession } = req.query;
    const currentSessionId = req.body.currentSessionId;

    const snapshot = await db
      .collection('sessions')
      .where('userId', '==', req.user.uid)
      .get();

    const batch = db.batch();
    let deletedCount = 0;

    snapshot.forEach((doc) => {
      // Skip current session if requested
      if (exceptCurrentSession === 'true' && doc.id === currentSessionId) {
        return;
      }
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    res.json({
      success: true,
      message: `${deletedCount} session(s) terminated successfully`,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting sessions:', error);
    res.status(500).json({ error: 'Failed to delete sessions' });
  }
});

/**
 * POST /api/sessions/cleanup
 * Remove inactive sessions (older than 30 days)
 * This can be called periodically or manually
 */
router.post('/cleanup', verifyJWT, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    const snapshot = await db
      .collection('sessions')
      .where('userId', '==', req.user.uid)
      .where('lastActivity', '<', cutoffDate)
      .get();

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.json({
      success: true,
      message: `Cleaned up ${snapshot.size} inactive session(s)`,
      deletedCount: snapshot.size
    });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({ error: 'Failed to cleanup sessions' });
  }
});

export default router;
