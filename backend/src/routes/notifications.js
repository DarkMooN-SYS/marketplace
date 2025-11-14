import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';
import { 
  sanitizeRequest, 
  validateRequestSize 
} from '../middleware/security.js';

const router = express.Router();

// Get user notifications
router.get('/', verifyJWT, async (req, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', req.user.uid)
      .get();
    
    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamp to ISO string
      let timestamp = new Date().toISOString();
      if (data.timestamp) {
        if (typeof data.timestamp === 'string') {
          timestamp = data.timestamp;
        } else if (data.timestamp.toDate) {
          timestamp = data.timestamp.toDate().toISOString();
        } else if (data.timestamp._seconds) {
          timestamp = new Date(data.timestamp._seconds * 1000).toISOString();
        }
      }
      
      notifications.push({
        id: doc.id,
        type: data.type || 'info',
        title: data.title,
        message: data.message,
        timestamp,
        read: data.read || false,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
      });
    });
    
    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', verifyJWT, async (req, res) => {
  try {
    const notificationRef = db.collection('notifications').doc(req.params.id);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const notificationData = notificationDoc.data();
    
    // Check if notification belongs to user
    if (notificationData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await notificationRef.update({
      read: true,
      updatedAt: new Date().toISOString(),
    });
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', verifyJWT, async (req, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', req.user.uid)
      .where('read', '==', false)
      .get();
    
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        updatedAt: new Date().toISOString(),
      });
    });
    
    await batch.commit();
    
    res.json({ message: 'All notifications marked as read', count: snapshot.size });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    const notificationRef = db.collection('notifications').doc(req.params.id);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const notificationData = notificationDoc.data();
    
    // Check if notification belongs to user
    if (notificationData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await notificationRef.delete();
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Clear all notifications
router.delete('/', verifyJWT, async (req, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', req.user.uid)
      .get();
    
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    res.json({ message: 'All notifications cleared', count: snapshot.size });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Create notification (🔒 SECURITY: XSS sanitization + request validation)
router.post('/', verifyJWT, sanitizeRequest, validateRequestSize(20), async (req, res) => {
  try {
    const { userId: targetUserId, type, title, message, actionUrl, actionLabel } = req.body;
    
    // Default to current user if no userId provided
    const userId = targetUserId || req.user.uid;
    
    // Only admin can create notifications for other users
    if (req.user.role !== 'admin' && userId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const notificationData = {
      userId,
      type: type || 'info',
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: actionUrl || null,
      actionLabel: actionLabel || null,
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('notifications').add(notificationData);
    
    res.status(201).json({
      message: 'Notification created',
      notificationId: docRef.id,
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

export default router;
