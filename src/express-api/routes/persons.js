const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { getSignedUrl } = require('../utils/cloudfront');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

// URL expiration time in seconds (24 hours)
const URL_EXPIRATION = 24 * 60 * 60;

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
    Limit: 100,
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  try {
    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    // Generate signed URLs for person images
    const itemsWithSignedUrls = await Promise.all(Items.map(async item => {
      // Check if the person has an s3Key (image)
      if (item.s3Key) {
        const imageUrl = CLOUDFRONT_DOMAIN + item.s3Key;
        const signedImageUrl = await getSignedUrl(imageUrl, { expireTime: URL_EXPIRATION });
        return {
          ...item,
          s3Key: signedImageUrl
        };
      }
      return item;
    }));

    res.json({
      items: itemsWithSignedUrls,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });
  } catch (err) {
    console.error("Error querying DynamoDB for persons:", err);
    res.status(500).json({ error: 'Could not retrieve persons' });
  }
});


// GET /persons/:personId - Get Person Info
router.get('/:personId', async (req, res) => {
  const { personId } = req.params;

  try {
    //  Get person info using entityType: PERSON and PK: PERSON#person4
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'entityType-PK-index',
      KeyConditionExpression: 'entityType = :entityType and PK = :pk',
      ExpressionAttributeValues: {
        ':entityType': 'PERSON',
        ':pk': `PERSON#${personId}`,
      },
    };

    const command = new QueryCommand(params);
    const { Items } = await docClient.send(command);

    if (Items.length === 0) {
      return res.status(404).json({ error: 'Person not found.' });
    }

    res.json(Items[0]);

  } catch (err) {
    console.error(`Error retrieving person ${personId}:`, err);
    res.status(500).json({ error: 'Could not retrieve person.' });
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
    Limit: 100,
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  try {
    // First, query for all TAGGING# entries for this person
    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    // Generate signed URLs for all images in the tagging entries
    const itemsWithSignedUrls = await Promise.all(Items.map(async item => {
      const result = { ...item };

      // Sign the main s3Key if it exists
      if (item.s3Key) {
        const imageUrl = CLOUDFRONT_DOMAIN + item.s3Key;
        result.s3Key = await getSignedUrl(imageUrl, { expireTime: URL_EXPIRATION });
      }

      // Sign images in the images object if it exists
      if (item.images) {
        const signedImages = { ...item.images };

        // Sign medium image if it exists
        if (item.images.medium) {
          const mediumUrl = CLOUDFRONT_DOMAIN + item.images.medium;
          signedImages.medium = await getSignedUrl(mediumUrl, { expireTime: URL_EXPIRATION });
        }

        // Sign large image if it exists
        if (item.images.large) {
          const largeUrl = CLOUDFRONT_DOMAIN + item.images.large;
          signedImages.large = await getSignedUrl(largeUrl, { expireTime: URL_EXPIRATION });
        }

        result.images = signedImages;
      }

      return result;
    }));

    res.json({
      items: itemsWithSignedUrls,
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


  try {
    // Now, update the name attribute
    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `PERSON#${personId}`,
        SK: personId,
      },
      UpdateExpression: 'SET #nameAttr = :nameValue',
      ExpressionAttributeNames: {
        '#nameAttr': 'displayName',
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
