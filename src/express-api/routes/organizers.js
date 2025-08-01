const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  QueryCommand
} = require("@aws-sdk/lib-dynamodb");
const { authMiddleware, requireOrganizer } = require('../middleware/auth');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;

// Apply auth middleware and require organizer access to all routes
router.use(authMiddleware);
router.use(requireOrganizer);

// GET /organizers/me - Get current organizer profile
router.get('/me', async (req, res) => {
  const { email } = req.user;

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
      return res.status(404).json({ error: 'Organizer profile not found' });
    }

    // Verify this is actually an event organizer
    if (Item.userType !== 'EVENT_ORGANIZER') {
      return res.status(403).json({ error: 'User is not an event organizer' });
    }

    // Return organizer profile data
    res.json({
      email: Item.email,
      username: Item.username,
      userType: Item.userType,
      organizationName: Item.organizationName,
      storageQuota: Item.storageQuota || 10737418240, // Default 10GB
      storageUsed: Item.storageUsed || 0,
      isActive: Item.isActive,
      createdAt: Item.createdAt
    });
  } catch (err) {
    console.error(`Error getting organizer profile for ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve organizer profile' });
  }
});

// PUT /organizers/me - Update organizer profile
router.put('/me', async (req, res) => {
  const { email } = req.user;
  const { username, organizationName } = req.body;

  // Validate input
  if (!username && !organizationName) {
    return res.status(400).json({ error: 'At least one field (username or organizationName) must be provided' });
  }

  // Build update expression dynamically
  let updateExpression = 'SET lastModified = :lastModified';
  const expressionAttributeValues = {
    ':lastModified': new Date().toISOString()
  };

  if (username) {
    updateExpression += ', username = :username';
    expressionAttributeValues[':username'] = username;
  }

  if (organizationName) {
    updateExpression += ', organizationName = :organizationName';
    expressionAttributeValues[':organizationName'] = organizationName;
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: email,
      SK: email
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(PK) AND userType = :userType',
    ExpressionAttributeValues: {
      ...expressionAttributeValues,
      ':userType': 'EVENT_ORGANIZER'
    },
    ReturnValues: 'ALL_NEW'
  };

  try {
    const command = new UpdateCommand(params);
    const { Attributes } = await docClient.send(command);

    res.json({
      email: Attributes.email,
      username: Attributes.username,
      userType: Attributes.userType,
      organizationName: Attributes.organizationName,
      storageQuota: Attributes.storageQuota || 10737418240,
      storageUsed: Attributes.storageUsed || 0,
      isActive: Attributes.isActive,
      createdAt: Attributes.createdAt,
      lastModified: Attributes.lastModified
    });
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return res.status(404).json({ error: 'Organizer profile not found or user is not an event organizer' });
    }
    console.error(`Error updating organizer profile for ${email}:`, err);
    res.status(500).json({ error: 'Could not update organizer profile' });
  }
});

// GET /organizers/me/storage - Get storage usage tracking
router.get('/me/storage', async (req, res) => {
  const { email } = req.user;

  try {
    // Get organizer profile for quota information
    const profileParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: email,
        SK: email
      }
    };

    const profileCommand = new GetCommand(profileParams);
    const { Item: profile } = await docClient.send(profileCommand);

    if (!profile || profile.userType !== 'EVENT_ORGANIZER') {
      return res.status(404).json({ error: 'Organizer profile not found' });
    }

    // Calculate current storage usage by querying all EVENT_IMAGE entities for this organizer
    const imagesParams = {
      TableName: TABLE_NAME,
      IndexName: 'uploadedBy-PK-index',
      KeyConditionExpression: 'uploadedBy = :email',
      FilterExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':email': email,
        ':entityType': 'EVENT_IMAGE'
      }
    };

    let totalStorageUsed = 0;
    let imageCount = 0;
    let lastEvaluatedKey = null;

    do {
      if (lastEvaluatedKey) {
        imagesParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const imagesCommand = new QueryCommand(imagesParams);
      const { Items, LastEvaluatedKey } = await docClient.send(imagesCommand);

      // Sum up file sizes from metadata
      Items.forEach(item => {
        if (item.metadata && item.metadata.fileSize) {
          totalStorageUsed += item.metadata.fileSize;
        }
        imageCount++;
      });

      lastEvaluatedKey = LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Update the stored usage if it differs significantly
    const storedUsage = profile.storageUsed || 0;
    if (Math.abs(totalStorageUsed - storedUsage) > 1048576) { // Update if difference > 1MB
      const updateParams = {
        TableName: TABLE_NAME,
        Key: {
          PK: email,
          SK: email
        },
        UpdateExpression: 'SET storageUsed = :storageUsed, lastModified = :lastModified',
        ExpressionAttributeValues: {
          ':storageUsed': totalStorageUsed,
          ':lastModified': new Date().toISOString()
        }
      };

      const updateCommand = new UpdateCommand(updateParams);
      await docClient.send(updateCommand);
    }

    const storageQuota = profile.storageQuota || 10737418240; // Default 10GB
    const usagePercentage = (totalStorageUsed / storageQuota) * 100;

    res.json({
      storageUsed: totalStorageUsed,
      storageQuota: storageQuota,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      remainingStorage: storageQuota - totalStorageUsed,
      imageCount: imageCount,
      isNearLimit: usagePercentage > 80,
      isAtLimit: usagePercentage >= 100
    });
  } catch (err) {
    console.error(`Error getting storage info for organizer ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve storage information' });
  }
});

module.exports = router;