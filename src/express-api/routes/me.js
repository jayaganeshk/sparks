const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");
const authMiddleware = require('../middleware/auth');
const { getSignedUrl } = require('../utils/cloudfront');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

// URL expiration time in seconds (24 hours)
const URL_EXPIRATION = 24 * 60 * 60;

// Apply the auth middleware to all routes in this file
router.use(authMiddleware);

// GET /me/photos - Get all photos uploaded by the current user with pagination
router.get('/photos', async (req, res) => {
  const { email } = req.user;
  const { lastEvaluatedKey } = req.query;

  const params = {
    TableName: TABLE_NAME,
    IndexName: 'uploadedBy-PK-index',
    KeyConditionExpression: 'uploadedBy = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
    Limit: 100,
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  try {
    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    // Generate signed URLs for all image variants
    const itemsWithSignedUrls = await Promise.all(Items.map(async item => {
      // Create a deep copy of the item
      const processedItem = { ...item };
      
      // Handle original image URL
      if (item.s3Key) {
        const originalUrl = CLOUDFRONT_DOMAIN + item.s3Key;
        processedItem.s3Key = await getSignedUrl(originalUrl, { expireTime: URL_EXPIRATION });
      }
      
      // Handle thumbnail URL
      if (item.thumbnailFileName) {
        const thumbnailUrl = CLOUDFRONT_DOMAIN + item.thumbnailFileName;
        processedItem.thumbnailFileName = await getSignedUrl(thumbnailUrl, { expireTime: URL_EXPIRATION });
      }
      
      // Handle processed image variants (large, medium)
      if (item.images) {
        processedItem.images = { ...item.images };
        
        if (item.images.large) {
          const largeUrl = CLOUDFRONT_DOMAIN + item.images.large;
          processedItem.images.large = await getSignedUrl(largeUrl, { expireTime: URL_EXPIRATION });
        }
        
        if (item.images.medium) {
          const mediumUrl = CLOUDFRONT_DOMAIN + item.images.medium;
          processedItem.images.medium = await getSignedUrl(mediumUrl, { expireTime: URL_EXPIRATION });
        }
      }
      
      return processedItem;
    }));

    res.json({
      items: itemsWithSignedUrls,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });
  } catch (err) {
    console.error(`Error getting photos for user ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve photos' });
  }
});

// GET /me/limit - Get the current user's upload limit
router.get('/limit', async (req, res) => {
  const { email } = req.user;

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${email}`,
      SK: `USER#${email}`
    }
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);

    if (!Item) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      uploadLimit: Item.uploadLimit || 100
    });
  } catch (err) {
    console.error(`Error getting upload limit for user ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve upload limit' });
  }
});

// PUT /me/limit - Set the current user's upload limit (for admin use in the future)
router.put('/limit', async (req, res) => {
  const { email } = req.user;
  const { limit } = req.body;

  if (limit === undefined || typeof limit !== 'number' || limit < 0) {
    return res.status(400).json({ error: 'Invalid limit value' });
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${email}`,
      SK: `USER#${email}`
    },
    UpdateExpression: 'SET uploadLimit = :limit',
    ExpressionAttributeValues: {
      ':limit': limit
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const command = new UpdateCommand(params);
    const { Attributes } = await docClient.send(command);

    res.json({
      uploadLimit: Attributes.uploadLimit
    });
  } catch (err) {
    console.error(`Error updating upload limit for user ${email}:`, err);
    res.status(500).json({ error: 'Could not update upload limit' });
  }
});

module.exports = router;
