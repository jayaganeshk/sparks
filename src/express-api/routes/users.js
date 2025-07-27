const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

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
    Limit: 20, // Return 20 users per page
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
    Limit: 12, // Return 12 photos per page
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  try {
    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    // Add CloudFront domain to s3Key and thumbnailFileName
    const itemsWithCloudfront = Items.map(item => ({
      ...item,
      s3Key: CLOUDFRONT_DOMAIN + item.s3Key,
      thumbnailFileName: item.thumbnailFileName ? CLOUDFRONT_DOMAIN + item.thumbnailFileName : null
    }));

    res.json({
      items: itemsWithCloudfront,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });
  } catch (err) {
    console.error(`Error getting photos for user ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve photos for this user' });
  }
});

module.exports = router;
