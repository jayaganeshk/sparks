const express = require('express');
const router = express.Router();
const axios = require('axios');

// Proxy route for downloading images from CloudFront
router.get('/image', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  try {
    console.log('Proxying download for URL:', url);
    
    // Download the image using the signed URL directly
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      // Add headers to help with CloudFront access
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'Sparks-API-Proxy'
      }
    });
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
    
    // Pipe the image data to the response
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying image download:', error);
    console.error('Error details:', error.response ? error.response.status : 'No response');
    res.status(500).json({ error: 'Failed to download image' });
  }
});

module.exports = router;
