const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  email: {
    type: String,
    sparse: true,
    lowercase: true
  },
  password: {
    type: String
  },
  fullName: String,
  phone: String,
  dateOfBirth: Date,
  isKYCVerified: {
    type: Boolean,
    default: false
  },
  kycDocuments: {
    type: String, // IPFS hash
  },
  profileImage: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
