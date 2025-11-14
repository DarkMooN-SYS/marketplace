import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get all active banks
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('banks')
      .where('isActive', '==', true)
      .get();
    
    const banks = [];
    snapshot.forEach(doc => {
      banks.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by order field (if exists) or by name
    banks.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name, 'mn');
    });

    res.json(banks);
  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ error: 'Failed to fetch banks' });
  }
});

// Get bank by ID
router.get('/:id', async (req, res) => {
  try {
    const bankDoc = await db.collection('banks').doc(req.params.id).get();
    
    if (!bankDoc.exists) {
      return res.status(404).json({ error: 'Bank not found' });
    }

    res.json({
      id: bankDoc.id,
      ...bankDoc.data()
    });
  } catch (error) {
    console.error('Get bank error:', error);
    res.status(500).json({ error: 'Failed to fetch bank' });
  }
});

// Admin: Create new bank
router.post('/', verifyJWT, async (req, res) => {
  try {
    // Check if user is admin
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, short, description, gradient, logo, isActive, order } = req.body;

    const bankData = {
      name,
      short: short || name.substring(0, 4).toUpperCase(),
      description: description || '',
      gradient: gradient || 'from-blue-500 via-indigo-500 to-blue-700',
      logo: logo || null,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 999,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('banks').add(bankData);

    res.status(201).json({
      message: 'Bank created successfully',
      bankId: docRef.id,
      bank: {
        id: docRef.id,
        ...bankData
      }
    });
  } catch (error) {
    console.error('Create bank error:', error);
    res.status(500).json({ error: 'Failed to create bank' });
  }
});

// Admin: Update bank
router.put('/:id', verifyJWT, async (req, res) => {
  try {
    // Check if user is admin
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const bankRef = db.collection('banks').doc(req.params.id);
    const bankDoc = await bankRef.get();

    if (!bankDoc.exists) {
      return res.status(404).json({ error: 'Bank not found' });
    }

    const { name, short, description, gradient, logo, isActive, order } = req.body;

    const updateData = {
      ...(name !== undefined && { name }),
      ...(short !== undefined && { short }),
      ...(description !== undefined && { description }),
      ...(gradient !== undefined && { gradient }),
      ...(logo !== undefined && { logo }),
      ...(isActive !== undefined && { isActive }),
      ...(order !== undefined && { order }),
      updatedAt: new Date()
    };

    await bankRef.update(updateData);

    const updatedDoc = await bankRef.get();

    res.json({
      message: 'Bank updated successfully',
      bank: {
        id: updatedDoc.id,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Update bank error:', error);
    res.status(500).json({ error: 'Failed to update bank' });
  }
});

// Admin: Delete bank
router.delete('/:id', verifyJWT, async (req, res) => {
  try {
    // Check if user is admin
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const bankRef = db.collection('banks').doc(req.params.id);
    const bankDoc = await bankRef.get();

    if (!bankDoc.exists) {
      return res.status(404).json({ error: 'Bank not found' });
    }

    // Soft delete - just mark as inactive
    await bankRef.update({
      isActive: false,
      deletedAt: new Date()
    });

    res.json({ message: 'Bank deleted successfully' });
  } catch (error) {
    console.error('Delete bank error:', error);
    res.status(500).json({ error: 'Failed to delete bank' });
  }
});

export default router;
