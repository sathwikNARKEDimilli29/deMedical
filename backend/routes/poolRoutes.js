const express = require('express');
const router = express.Router();
const Pool = require('../models/Pool');

router.get('/', async (req, res) => {
  try {
    const pools = await Pool.find().sort({ createdAt: -1 });
    res.json(pools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pools' });
  }
});

router.get('/:poolId', async (req, res) => {
  try {
    const pool = await Pool.findOne({ poolId: req.params.poolId });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });
    res.json(pool);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pool' });
  }
});

router.post('/', async (req, res) => {
  try {
    const pool = new Pool(req.body);
    await pool.save();
    res.json(pool);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create pool' });
  }
});

router.put('/:poolId', async (req, res) => {
  try {
    const pool = await Pool.findOneAndUpdate(
      { poolId: req.params.poolId },
      req.body,
      { new: true }
    );
    res.json(pool);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update pool' });
  }
});

module.exports = router;
