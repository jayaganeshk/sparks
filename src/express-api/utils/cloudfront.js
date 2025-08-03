/**
 * CloudFront URL Signing Utility
 * 
 * This module provides functions for generating signed URLs for CloudFront distributions
 * using AWS CloudFront key pairs stored in SSM Parameter Store.
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const cloudFrontSign = require('aws-cloudfront-sign');

// Initialize SSM client
const ssmClient = new SSMClient({});

// Cache for SSM parameters to avoid repeated calls
const paramCache = {
  privateKey: null,
  keyPairId: null,
  privateKeyExpiry: null,
  keyPairIdExpiry: null
};

// Cache expiration time in milliseconds (1 hour)
const CACHE_EXPIRATION = 60 * 60 * 1000;

/**
 * Retrieves a parameter from SSM Parameter Store with caching
 * @param {string} parameterName - The name of the parameter to retrieve
 * @param {boolean} withDecryption - Whether to decrypt the parameter value
 * @returns {Promise<string>} The parameter value
 */
async function getSSMParameter(parameterName, withDecryption = false) {
  try {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: withDecryption
    });

    const response = await ssmClient.send(command);
    return response.Parameter.Value;
  } catch (error) {
    console.error(`Error retrieving SSM parameter ${parameterName}:`, error);
    throw new Error(`Failed to retrieve SSM parameter: ${error.message}`);
  }
}

/**
 * Gets the private key from SSM Parameter Store with caching
 * @returns {Promise<string>} The private key
 */
async function getPrivateKey() {
  const now = Date.now();

  // Return cached value if available and not expired
  if (paramCache.privateKey && paramCache.privateKeyExpiry > now) {
    return paramCache.privateKey;
  }

  // Get the parameter directly from environment variable
  const privateKeyParam = process.env.CLOUDFRONT_PRIVATE_KEY_PARAM;
  
  if (!privateKeyParam) {
    throw new Error('CLOUDFRONT_PRIVATE_KEY_PARAM environment variable is not set');
  }

  const privateKey = await getSSMParameter(privateKeyParam, true);

  // Update cache
  paramCache.privateKey = privateKey;
  paramCache.privateKeyExpiry = now + CACHE_EXPIRATION;

  return privateKey;
}

/**
 * Gets the key pair ID from environment variable
 * @returns {Promise<string>} The key pair ID
 */
async function getKeyPairId() {
  // Get key pair ID directly from environment variables
  if (process.env.CLOUDFRONT_KEY_PAIR_ID) {
    return process.env.CLOUDFRONT_KEY_PAIR_ID;
  }
  
  throw new Error('CLOUDFRONT_KEY_PAIR_ID environment variable is not set');
}

/**
 * Generates a signed URL for CloudFront
 * @param {string} url - The URL to sign
 * @param {Object} options - Options for URL signing
 * @param {number} options.expireTime - Time in seconds until URL expiration (default: 1 hour)
 * @returns {Promise<string>} The signed URL
 */
async function getSignedUrl(url, options = {}) {
  try {
    const privateKey = await getPrivateKey();
    const keyPairId = await getKeyPairId();

    const defaultExpireTime = 60 * 60; // 1 hour in seconds
    const expireTime = options.expireTime || defaultExpireTime;

    // Ensure URL has proper format with protocol and path separator
    let formattedUrl = url;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    // Fix missing slash between domain and path
    if (formattedUrl.includes('cloudfront.net') && !formattedUrl.includes('cloudfront.net/')) {
      formattedUrl = formattedUrl.replace('cloudfront.net', 'cloudfront.net/');
    }

    // Calculate expiration timestamp
    const now = Math.floor(Date.now());
    const expireTimestamp = now + expireTime;
    console.log('[CloudFront Sign] Now:', now, 'expireTime (duration):', expireTime, 'expireTimestamp (abs):', expireTimestamp);
    console.log('[CloudFront Sign] Original URL:', url);
    console.log('[CloudFront Sign] Formatted URL:', formattedUrl);
    console.log('[CloudFront Sign] Values:', {
      keyPairId: keyPairId,
      expireTimestamp
    });

    // Generate signed URL
    const signedUrl = cloudFrontSign.getSignedUrl(formattedUrl, {
      keypairId: keyPairId,
      privateKeyString: privateKey,
      expireTime: expireTimestamp
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

module.exports = {
  getSignedUrl
};
