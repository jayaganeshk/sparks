const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/auth');

// Import PowerTools utilities
const { 
  logger, 
  tracer, 
  createRouteSegment, 
  addCustomMetric, 
  MetricUnit 
} = require('../utils/powertools');

// Proxy route for downloading images from CloudFront
router.get('/image', authMiddleware, async (req, res) => {
  const subsegment = createRouteSegment('proxy', 'downloadImage');
  
  try {
    const { url } = req.query;
    const { email } = req.user;
    
    logger.info('Proxying image download', {
      operation: 'downloadImage',
      userEmail: email,
      hasUrl: !!url,
      urlDomain: url ? new URL(url).hostname : null
    });

    if (!url) {
      logger.warn('Missing URL parameter for image proxy', {
        userEmail: email
      });
      addCustomMetric('ProxyValidationErrors', 1, MetricUnit.Count);
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL format and domain for security
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (urlError) {
      logger.warn('Invalid URL format provided', {
        userEmail: email,
        providedUrl: url,
        error: urlError.message
      });
      addCustomMetric('ProxyInvalidUrlErrors', 1, MetricUnit.Count);
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    logger.info('Validated URL for proxy', {
      userEmail: email,
      hostname: parsedUrl.hostname,
      protocol: parsedUrl.protocol
    });

    // Add metadata to tracer
    tracer.addMetadata('proxy_request', {
      userEmail: email,
      targetUrl: url,
      hostname: parsedUrl.hostname,
      protocol: parsedUrl.protocol
    });

    // Download the image using the signed URL directly
    const downloadSubsegment = subsegment?.addNewSubsegment('downloadFromCloudFront');
    
    const startTime = Date.now();
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000, // 30 second timeout
      // Add headers to help with CloudFront access
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'Sparks-API-Proxy'
      }
    });

    const downloadTime = Date.now() - startTime;
    downloadSubsegment?.close();

    logger.info('Image downloaded successfully from CloudFront', {
      userEmail: email,
      hostname: parsedUrl.hostname,
      statusCode: response.status,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      downloadTime
    });

    // Add download metadata to tracer
    tracer.addMetadata('download_response', {
      statusCode: response.status,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      downloadTime
    });

    // Set appropriate headers for download
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    
    // Add metrics
    addCustomMetric('ImageDownloadsProxied', 1, MetricUnit.Count);
    addCustomMetric('ProxyDownloadTime', downloadTime, MetricUnit.Milliseconds);
    
    if (response.headers['content-length']) {
      const contentLength = parseInt(response.headers['content-length']);
      addCustomMetric('ProxyDataTransferred', contentLength, MetricUnit.Bytes);
    }

    // Pipe the image data to the response
    const streamSubsegment = subsegment?.addNewSubsegment('streamToClient');
    
    response.data.on('end', () => {
      streamSubsegment?.close();
      logger.info('Image streaming completed', {
        userEmail: email,
        hostname: parsedUrl.hostname
      });
      addCustomMetric('ProxyStreamingCompleted', 1, MetricUnit.Count);
    });

    response.data.on('error', (streamError) => {
      streamSubsegment?.close();
      logger.error('Error streaming image to client', {
        error: streamError.message,
        userEmail: email,
        hostname: parsedUrl.hostname
      });
      addCustomMetric('ProxyStreamingErrors', 1, MetricUnit.Count);
    });

    response.data.pipe(res);

  } catch (error) {
    logger.error('Error proxying image download', {
      error: error.message,
      stack: error.stack,
      userEmail: req.user?.email,
      targetUrl: req.query?.url,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      operation: 'downloadImage'
    });

    tracer.addErrorAsMetadata(error);
    
    // Add specific error metrics
    if (error.code === 'ECONNABORTED') {
      addCustomMetric('ProxyTimeoutErrors', 1, MetricUnit.Count);
    } else if (error.response?.status) {
      addCustomMetric('ProxyHttpErrors', 1, MetricUnit.Count);
      addCustomMetric(`ProxyHttp${error.response.status}Errors`, 1, MetricUnit.Count);
    } else {
      addCustomMetric('ProxyNetworkErrors', 1, MetricUnit.Count);
    }

    addCustomMetric('ProxyDownloadErrors', 1, MetricUnit.Count);

    // Return appropriate error response
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.status 
      ? `Failed to download image (HTTP ${error.response.status})`
      : 'Failed to download image';

    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
