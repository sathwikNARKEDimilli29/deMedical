const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    const { walletAddress, email, password, fullName, phone } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (user) {
      return res.status(400).json({ error: 'User already registered' });
    }
    
    // Hash password if provided
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    // Create user
    user = new User({
      walletAddress: walletAddress.toLowerCase(),
      email,
      password: hashedPassword,
      fullName,
      phone
    });
    
    await user.save();
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        fullName: user.fullName,
        email: user.email,
        isKYCVerified: user.isKYCVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login with wallet
router.post('/login/wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const token = jwt.sign(
      { userId: user._id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        fullName: user.fullName,
        email: user.email,
        isKYCVerified: user.isKYCVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile
router.get('/profile/:walletAddress', async (req, res) => {
  try {
    const user = await User.findOne({ 
      walletAddress: req.params.walletAddress.toLowerCase() 
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile/:walletAddress', async (req, res) => {
  try {
    const { fullName, email, phone, dateOfBirth, kycDocuments } = req.body;
    
    const user = await User.findOneAndUpdate(
      { walletAddress: req.params.walletAddress.toLowerCase() },
      {
        fullName,
        email,
        phone,
        dateOfBirth,
        kycDocuments
      },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
