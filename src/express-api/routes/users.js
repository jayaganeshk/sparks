const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { getSignedUrl } = require('../utils/cloudfront');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

// URL expiration time in seconds (24 hours)
const URL_EXPIRATION = 24 * 60 * 60;

// GET /users - Get all users with pagination
router.get('/', async (req, res) => {
  const { lastEvaluatedKey } = req.query;

  const params = {
    TableName: TABLE_NAME,
    IndexName: 'entityType-PK-index',
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'USER',
    },
    Limit: 100,
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  try {
    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    res.json({
      items: Items,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ error: 'Could not retrieve users' });
  }
});

// GET /users/:email - Get user info
router.get('/:email', async (req, res) => {
  const { email } = req.params;

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: email,
      SK: email
    }
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);

    if (!Item) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(Item);
  } catch (err) {
    console.error(`Error getting user info for ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve user info' });
  }
});


// GET /users/:email/photos - Get photos uploaded by a specific user with pagination
router.get('/:email/photos', async (req, res) => {
  const { email } = req.params;
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

    // Generate signed URLs for all images
    const itemsWithSignedUrls = await Promise.all(Items.map(async item => {
      // Generate signed URLs for main image and thumbnail
      const imageUrl = CLOUDFRONT_DOMAIN + item.s3Key;
      const thumbnailUrl = item.thumbnailFileName ? CLOUDFRONT_DOMAIN + item.thumbnailFileName : null;
      
      const signedImageUrl = await getSignedUrl(imageUrl, { expireTime: URL_EXPIRATION });
      const signedThumbnailUrl = thumbnailUrl ? await getSignedUrl(thumbnailUrl, { expireTime: URL_EXPIRATION }) : null;
      
      // Generate signed URLs for processed images if they exist
      let processedImages = item.images;
      if (processedImages) {
        const signedProcessedImages = { ...processedImages };
        
        // Sign medium image if it exists
        if (processedImages.medium) {
          const mediumUrl = CLOUDFRONT_DOMAIN + processedImages.medium;
          signedProcessedImages.medium = await getSignedUrl(mediumUrl, { expireTime: URL_EXPIRATION });
        }
        
        // Sign large image if it exists
        if (processedImages.large) {
          const largeUrl = CLOUDFRONT_DOMAIN + processedImages.large;
          signedProcessedImages.large = await getSignedUrl(largeUrl, { expireTime: URL_EXPIRATION });
        }
        
        // Update the images object with signed URLs
        processedImages = signedProcessedImages;
      }
      
      return {
        ...item,
        s3Key: signedImageUrl,
        thumbnailFileName: signedThumbnailUrl,
        images: processedImages
      };
    }));

    res.json({
      items: itemsWithSignedUrls,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });
  } catch (err) {
    console.error(`Error getting photos for user ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve photos for this user' });
  }
});

module.exports = router;
