const express = require('express');
const router = express.Router();
const CreditHistory = require('../models/CreditHistory');

router.get('/:userAddress', async (req, res) => {
  try {
    let credit = await CreditHistory.findOne({ 
      userAddress: req.params.userAddress.toLowerCase() 
    });
    
    if (!credit) {
      credit = new CreditHistory({
        userAddress: req.params.userAddress.toLowerCase(),
        currentScore: 450,
        tier: 'Fair',
        factors: {
          totalLoans: 0,
          repaidLoans: 0,
          defaultedLoans: 0,
          totalPayments: 0,
          latePayments: 0,
          accountAge: 0
        },
        scoreHistory: [{ score: 450, timestamp: new Date(), reason: 'Initial score' }]
      });
      await credit.save();
    }
    
    res.json(credit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credit score' });
  }
});

router.put('/:userAddress', async (req, res) => {
  try {
    const credit = await CreditHistory.findOneAndUpdate(
      { userAddress: req.params.userAddress.toLowerCase() },
      req.body,
      { new: true, upsert: true }
    );
    res.json(credit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update credit score' });
  }
});

module.exports = router;
