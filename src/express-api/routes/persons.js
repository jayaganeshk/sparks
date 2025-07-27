const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

// GET /persons - Get all unique people with pagination
router.get('/', async (req, res) => {
  const { lastEvaluatedKey } = req.query;

  const params = {
    TableName: TABLE_NAME,
    IndexName: 'entityType-PK-index',
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'PERSON',
    },
    Limit: 20, // Return 20 persons per page
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
    console.error("Error querying DynamoDB for persons:", err);
    res.status(500).json({ error: 'Could not retrieve persons' });
  }
});

// GET /persons/:personId/photos - Get photos that a specific person is tagged in
router.get('/:personId/photos', async (req, res) => {
  const { personId } = req.params;
  const { lastEvaluatedKey } = req.query;

  // Use the entityType-PK-index to find all TAGGING# entries for this person
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'entityType-PK-index',
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': `TAGGING#${personId}`,
    },
    Limit: 12, // Return 12 photos per page
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  try {
    // First, query for all TAGGING# entries for this person
    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    if (Items.length === 0) {
      return res.json({
        items: [],
        lastEvaluatedKey: null,
      });
    }

    // Extract the photo IDs from the TAGGING entries
    const photoIds = Items.map(item => item.PK);

    // Now fetch the actual photo details
    const photoPromises = photoIds.map(photoId => {
      const photoParams = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': photoId,
          ':sk': 'PHOTO#',
        },
      };
      return docClient.send(new QueryCommand(photoParams));
    });

    const photoResults = await Promise.all(photoPromises);
    const photos = photoResults
      .flatMap(result => result.Items)
      .filter(item => item); // Filter out any undefined items

    // Add CloudFront domain to s3Key and thumbnailFileName
    const photosWithCloudfront = photos.map(item => ({
      ...item,
      s3Key: CLOUDFRONT_DOMAIN + item.s3Key,
      thumbnailFileName: item.thumbnailFileName ? CLOUDFRONT_DOMAIN + item.thumbnailFileName : null
    }));
    
    res.json({
      items: photosWithCloudfront,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });
  } catch (err) {
    console.error(`Error retrieving photos for person ${personId}:`, err);
    res.status(500).json({ error: 'Could not retrieve photos for this person' });
  }
});

// PUT /persons/:personId - Update a person's name
router.put('/:personId', async (req, res) => {
  const { personId } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name provided.' });
  }

  // To update the item, we need its full primary key (PK and SK).
  // Since the SK contains the old name, we query for the item first.
  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
    ExpressionAttributeValues: {
      ':pk': `PERSON#${personId}`,
      ':sk_prefix': 'PERSON#',
    },
    Limit: 1,
  };

  try {
    const queryCommand = new QueryCommand(queryParams);
    const { Items } = await docClient.send(queryCommand);

    if (!Items || Items.length === 0) {
      return res.status(404).json({ error: 'Person not found.' });
    }
    const personItem = Items[0];

    // Now, update the name attribute
    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: personItem.PK,
        SK: personItem.SK,
      },
      UpdateExpression: 'SET #nameAttr = :nameValue',
      ExpressionAttributeNames: {
        '#nameAttr': 'name',
      },
      ExpressionAttributeValues: {
        ':nameValue': name,
      },
      ReturnValues: 'ALL_NEW',
    };

    const updateCommand = new UpdateCommand(updateParams);
    const { Attributes } = await docClient.send(updateCommand);

    res.json(Attributes);
  } catch (err) {
    console.error(`Error updating name for person ${personId}:`, err);
    res.status(500).json({ error: 'Could not update person name.' });
  }
});

module.exports = router;
