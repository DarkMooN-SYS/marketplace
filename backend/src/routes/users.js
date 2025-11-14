import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/firebase.js';
import { verifyJWT } from '../middleware/auth.js';
import { 
  sanitizeRequest, 
  validateRequestSize 
} from '../middleware/security.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', verifyJWT, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const snapshot = await db.collection('users').get();
    const users = [];
    
    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user profile
router.get('/profile', verifyJWT, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    // Convert Firestore Timestamp to ISO string if needed
    let createdAt = userData.createdAt;
    if (createdAt && typeof createdAt.toDate === 'function') {
      // Firestore Timestamp
      createdAt = createdAt.toDate().toISOString();
    } else if (createdAt && typeof createdAt === 'object' && createdAt._seconds) {
      // Firestore Timestamp object format
      createdAt = new Date(createdAt._seconds * 1000).toISOString();
    } else if (!createdAt) {
      // No createdAt, use current date
      createdAt = new Date().toISOString();
    }
    
    res.json({
      id: userDoc.id,
      ...userData,
      createdAt
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile (🔒 SECURITY: XSS sanitization)
router.put('/profile', verifyJWT, sanitizeRequest, validateRequestSize(50), async (req, res) => {
  try {
    const { 
      name, phone, avatar,
      // Personal details
      email, dateOfBirth, gender,
      // Location
      city, district, address,
      // Professional
      occupation, company, education, monthlyIncome,
      // Interests & Lifestyle
      interests, maritalStatus, hasChildren, childrenCount,
      // Marketing preferences
      acceptMarketing, preferredContactMethod
    } = req.body;
    
    const updateData = {
      updatedAt: new Date()
    };

    // Basic info
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatar) updateData.avatar = avatar;
    
    // Personal details
    if (email !== undefined) updateData.email = email;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;
    
    // Location
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;
    if (address !== undefined) updateData.address = address;
    
    // Professional
    if (occupation !== undefined) updateData.occupation = occupation;
    if (company !== undefined) updateData.company = company;
    if (education !== undefined) updateData.education = education;
    if (monthlyIncome !== undefined) updateData.monthlyIncome = monthlyIncome;
    
    // Interests & Lifestyle
    if (interests !== undefined) updateData.interests = interests;
    if (maritalStatus !== undefined) updateData.maritalStatus = maritalStatus;
    if (hasChildren !== undefined) updateData.hasChildren = hasChildren;
    if (childrenCount !== undefined) updateData.childrenCount = childrenCount;
    
    // Marketing preferences
    if (acceptMarketing !== undefined) updateData.acceptMarketing = acceptMarketing;
    if (preferredContactMethod !== undefined) updateData.preferredContactMethod = preferredContactMethod;
    
    // Mark profile as completed if detailed info is provided
    const hasDetailedInfo = email || city || occupation || interests?.length > 0;
    if (hasDetailedInfo) {
      updateData.profileCompleted = true;
      updateData.profileCompletedAt = new Date();
    }

    await db.collection('users').doc(req.user.uid).update(updateData);

    res.json({ message: 'Profile updated successfully', profileCompleted: updateData.profileCompleted });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update user balance (🔒 SECURITY: Admin-only + sanitization)
router.post('/balance', verifyJWT, sanitizeRequest, validateRequestSize(10), async (req, res) => {
  try {
    // 🔒 SECURITY: Only admins can modify balance directly
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Only administrators can modify user balance directly'
      });
    }
    
    const { amount, type } = req.body; // type: 'add' or 'subtract'
    
    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = userDoc.data().balance || 0;
    let newBalance;

    if (type === 'add') {
      newBalance = currentBalance + amount;
    } else if (type === 'subtract') {
      newBalance = Math.max(0, currentBalance - amount);
    } else {
      return res.status(400).json({ error: 'Invalid type. Use "add" or "subtract"' });
    }

    await userRef.update({
      balance: newBalance,
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Balance updated successfully',
      newBalance 
    });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Change password
router.put('/change-password', verifyJWT, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, userData.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRef.update({
      password: hashedPassword,
      updatedAt: new Date()
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update user points (🔒 SECURITY: Admin-only + sanitization)
router.post('/points', verifyJWT, sanitizeRequest, validateRequestSize(10), async (req, res) => {
  try {
    // 🔒 SECURITY: Only admins can modify points directly
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Only administrators can modify user points directly'
      });
    }
    
    const { amount, type } = req.body; // type: 'add' or 'subtract'
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPoints = userDoc.data().points || 0;
    let newPoints;

    if (type === 'add') {
      newPoints = currentPoints + amount;
    } else if (type === 'subtract') {
      newPoints = Math.max(0, currentPoints - amount);
    } else {
      return res.status(400).json({ error: 'Invalid type. Use "add" or "subtract"' });
    }

    await userRef.update({
      points: newPoints,
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Points updated successfully',
      newPoints 
    });
  } catch (error) {
    console.error('Update points error:', error);
    res.status(500).json({ error: 'Failed to update points' });
  }
});

// Get user's seller rating (from reviews on their products)
router.get('/seller-rating', verifyJWT, async (req, res) => {
  try {
    // Get all products by this seller
    const productsSnapshot = await db.collection('products')
      .where('sellerId', '==', req.user.uid)
      .get();
    
    if (productsSnapshot.empty) {
      return res.json({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    const productIds = [];
    productsSnapshot.forEach(doc => {
      productIds.push(doc.id);
    });

    // Get all reviews for these products in parallel
    const reviewPromises = productIds.map(productId => 
      db.collection('reviews')
        .where('productId', '==', productId)
        .get()
    );
    
    const reviewSnapshots = await Promise.all(reviewPromises);
    
    let allReviews = [];
    reviewSnapshots.forEach(snapshot => {
      snapshot.forEach(doc => {
        const reviewData = doc.data();
        allReviews.push({
          id: doc.id,
          rating: reviewData.rating,
          comment: reviewData.comment,
          userName: reviewData.userName,
          productId: reviewData.productId,
          createdAt: reviewData.createdAt
        });
      });
    });

    // Calculate statistics
    const totalReviews = allReviews.length;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    allReviews.forEach(review => {
      totalRating += review.rating;
      ratingDistribution[review.rating]++;
    });

    const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

    res.json({
      averageRating: parseFloat(averageRating),
      totalReviews,
      ratingDistribution,
      recentReviews: allReviews.slice(0, 5) // Return 5 most recent
    });
  } catch (error) {
    console.error('Get seller rating error:', error);
    res.status(500).json({ error: 'Failed to fetch seller rating' });
  }
});

export default router;