const express = require('express');
const router = express.Router();

router.get('/bnpl/:userAddress', async (req, res) => {
  try {
    // Fetch BNPL plans from database or blockchain
    res.json({ plans: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch BNPL plans' });
  }
});

router.get('/snpl/:userAddress', async (req, res) => {
  try {
    // Fetch SNPL plans from database or blockchain
    res.json({ plans: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch SNPL plans' });
  }
});

module.exports = router;
