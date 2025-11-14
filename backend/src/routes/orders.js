import express from 'express';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get user orders
router.get('/my-orders', verifyJWT, async (req, res) => {
  try {
    // Remove orderBy to avoid composite index requirement
    const snapshot = await db.collection('orders')
      .where('buyerId', '==', req.user.uid)
      .get();
    
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by createdAt in JavaScript (newest first)
    orders.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt?._seconds * 1000 || a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt?._seconds * 1000 || b.createdAt);
      return dateB - dateA;
    });

    res.json(orders);
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { productId, quantity, totalAmount } = req.body;
    
    // Get product details
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const productData = productDoc.data();
    
    // Check stock
    if (productData.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    // Create order
    const orderData = {
      buyerId: req.user.uid,
      sellerId: productData.sellerId,
      productId,
      productName: productData.name,
      productPrice: productData.price,
      quantity,
      totalAmount,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('orders').add(orderData);
    
    // Update product stock
    await db.collection('products').doc(productId).update({
      stock: productData.stock - quantity,
      updatedAt: new Date()
    });

    res.status(201).json({
      message: 'Order created successfully',
      orderId: docRef.id
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.put('/:id/status', verifyJWT, async (req, res) => {
  try {
    const { status } = req.body;
    
    const orderRef = db.collection('orders').doc(req.params.id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();
    
    // Check if user is buyer or seller
    if (orderData.buyerId !== req.user.uid && orderData.sellerId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await orderRef.update({
      status,
      updatedAt: new Date()
    });

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;