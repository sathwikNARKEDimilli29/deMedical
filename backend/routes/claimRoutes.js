const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');

router.get('/', async (req, res) => {
  try {
    const { poolId, claimant } = req.query;
    let query = {};
    if (poolId) query.poolId = poolId;
    if (claimant) query.claimant = claimant.toLowerCase();
    
    const claims = await Claim.find(query).sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

router.post('/', async (req, res) => {
  try {
    const claim = new Claim(req.body);
    await claim.save();
    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create claim' });
  }
});

router.put('/:claimId', async (req, res) => {
  try {
    const claim = await Claim.findOneAndUpdate(
      { claimId: req.params.claimId },
      req.body,
      { new: true }
    );
    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update claim' });
  }
});

module.exports = router;
