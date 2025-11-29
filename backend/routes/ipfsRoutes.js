const express = require('express');
const router = express.Router();
const multer = require('multer');
const ipfsService = require('../services/ipfsService');

const upload = multer({ storage: multer.memoryStorage() });

// Upload file to IPFS
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const result = await ipfsService.uploadFile(
      req.file.buffer,
      req.file.originalname
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload JSON to IPFS
router.post('/upload-json', async (req, res) => {
  try {
    const result = await ipfsService.uploadJSON(req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('JSON upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get IPFS URL
router.get('/url/:hash', (req, res) => {
  res.json({ url: ipfsService.getUrl(req.params.hash) });
});

module.exports = router;
