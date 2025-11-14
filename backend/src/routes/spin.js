import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Default wheel segments (used if no custom config exists)
const defaultSegments = [
  { id: 1, label: '5% хөнгөлөлт', icon: '🎁', color: '#7c3aed', type: 'discount', value: 5, weight: 15 },
  { id: 2, label: '10% бонус', icon: '💰', color: '#ec4899', type: 'bonus', value: 10, weight: 10 },
  { id: 3, label: '15% бонус', icon: '🎉', color: '#22c55e', type: 'bonus', value: 15, weight: 5 },
  { id: 4, label: 'Амжилтгүй', icon: '😢', color: '#94a3b8', type: 'none', value: 0, weight: 30 },
  { id: 5, label: '20% хөнгөлөлт', icon: '🏆', color: '#f97316', type: 'discount', value: 20, weight: 5 },
  { id: 6, label: 'Дахин оролд', icon: '🔄', color: '#eab308', type: 'retry', value: 0, weight: 15 },
  { id: 7, label: '5% бонус', icon: '🎈', color: '#0ea5e9', type: 'bonus', value: 5, weight: 15 },
  { id: 8, label: '10% хөнгөлөлт', icon: '🎊', color: '#ef4444', type: 'discount', value: 10, weight: 5 },
];

// Get current wheel configuration
async function getWheelSegments() {
  try {
    const configDoc = await db.collection('config').doc('spinWheel').get();
    if (configDoc.exists && configDoc.data().segments) {
      return configDoc.data().segments;
    }
    return defaultSegments;
  } catch (error) {
    console.error('Failed to load spin config:', error);
    return defaultSegments;
  }
}

// Get user's spin data (spins left, history)
router.get('/data', verifyJWT, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const today = new Date().toISOString().split('T')[0];
    const lastSpinDate = userData.lastSpinDate || '';
    
    // Reset spins if it's a new day
    let spinsLeft = userData.spinsLeft ?? 3;
    if (lastSpinDate !== today) {
      spinsLeft = 3;
    }

    // Get spin history
    const historySnapshot = await db.collection('spinHistory')
      .where('userId', '==', req.user.uid)
      .get();

    const history = [];
    historySnapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamp to ISO string
      let dateStr = new Date().toISOString();
      if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          dateStr = data.createdAt;
        } else if (data.createdAt.toDate) {
          dateStr = data.createdAt.toDate().toISOString();
        } else if (data.createdAt._seconds) {
          dateStr = new Date(data.createdAt._seconds * 1000).toISOString();
        }
      }
      
      history.push({
        id: doc.id,
        reward: data.reward,
        type: data.type,
        date: dateStr,
      });
    });

    // Sort by date and limit to 10
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentHistory = history.slice(0, 10);

    res.json({
      spinsLeft,
      history: recentHistory,
      totalSpins: userData.totalSpins || 0,
    });
  } catch (error) {
    console.error('Get spin data error:', error);
    res.status(500).json({ error: 'Failed to get spin data' });
  }
});

// Perform a spin
router.post('/spin', verifyJWT, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const today = new Date().toISOString().split('T')[0];
    const lastSpinDate = userData.lastSpinDate || '';
    
    // Check and reset spins if it's a new day
    let spinsLeft = userData.spinsLeft ?? 3;
    if (lastSpinDate !== today) {
      spinsLeft = 3;
    }

    if (spinsLeft <= 0) {
      return res.status(400).json({ error: 'No spins left for today' });
    }

    // Get current wheel segments configuration
    const segments = await getWheelSegments();

    // Weighted random selection
    const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedSegment = segments[0];

    for (const segment of segments) {
      random -= segment.weight;
      if (random <= 0) {
        selectedSegment = segment;
        break;
      }
    }

    // Calculate reward based on segment type
    let reward = selectedSegment.value;
    let rewardType = selectedSegment.type;
    let rewardAmount = 0;

    if (rewardType === 'bonus') {
      // Bonus gives points
      rewardAmount = Math.floor(reward * 10); // 10% bonus = 100 points
      await userRef.update({
        points: (userData.points || 0) + rewardAmount,
      });
    } else if (rewardType === 'discount') {
      // Discount gives balance
      rewardAmount = Math.floor(reward * 100); // 10% discount = 1000₮
      await userRef.update({
        balance: (userData.balance || 0) + rewardAmount,
      });
    }

    // Update user spin data
    const updates = {
      spinsLeft: rewardType === 'retry' ? spinsLeft : spinsLeft - 1,
      lastSpinDate: today,
      totalSpins: (userData.totalSpins || 0) + 1,
      updatedAt: new Date(),
    };

    await userRef.update(updates);

    // Save to history
    await db.collection('spinHistory').add({
      userId: req.user.uid,
      reward: selectedSegment.label,
      type: rewardType,
      rewardAmount,
      createdAt: new Date(),
    });

    res.json({
      segment: selectedSegment,
      rewardAmount,
      spinsLeft: updates.spinsLeft,
      message: rewardType === 'none' 
        ? 'Амжилтгүй боллоо' 
        : rewardType === 'retry' 
        ? 'Дахин оролдох боломж авлаа!'
        : `${selectedSegment.label} хүртлээ!`,
    });
  } catch (error) {
    console.error('Spin error:', error);
    res.status(500).json({ error: 'Failed to spin' });
  }
});

// Get spin segments configuration (Public - all authenticated users)
router.get('/segments', verifyJWT, async (req, res) => {
  try {
    const segments = await getWheelSegments();
    res.json({ segments });
  } catch (error) {
    console.error('Get spin segments error:', error);
    res.status(500).json({ error: 'Failed to get spin segments' });
  }
});

// Get spin rewards configuration (Admin only)
router.get('/rewards', verifyJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const segments = await getWheelSegments();
    res.json({ segments });
  } catch (error) {
    console.error('Get spin rewards error:', error);
    res.status(500).json({ error: 'Failed to get spin rewards' });
  }
});

// Update spin rewards configuration (Admin only)
router.put('/rewards', verifyJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { segments } = req.body;

    if (!segments || !Array.isArray(segments) || segments.length < 4) {
      return res.status(400).json({ error: 'At least 4 segments are required' });
    }

    // Validate segments
    for (const segment of segments) {
      if (!segment.label || !segment.icon || !segment.color || !segment.type) {
        return res.status(400).json({ error: 'Invalid segment data' });
      }
      if (segment.weight < 1) {
        return res.status(400).json({ error: 'Weight must be at least 1' });
      }
    }

    // Save to Firestore
    await db.collection('config').doc('spinWheel').set({
      segments,
      updatedAt: new Date(),
      updatedBy: req.user.uid
    });

    res.json({ 
      message: 'Spin rewards updated successfully',
      segments 
    });
  } catch (error) {
    console.error('Update spin rewards error:', error);
    res.status(500).json({ error: 'Failed to update spin rewards' });
  }
});

// Reset spin rewards to default (Admin only)
router.delete('/rewards', verifyJWT, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Delete the custom configuration to use defaults
    await db.collection('config').doc('spinWheel').delete();

    res.json({ 
      message: 'Spin rewards reset to default',
      segments: defaultSegments
    });
  } catch (error) {
    console.error('Reset spin rewards error:', error);
    res.status(500).json({ error: 'Failed to reset spin rewards' });
  }
});

export default router;
