const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';

// GET /photos - Get all photos with pagination
router.get('/', async (req, res) => {
  const { lastEvaluatedKey } = req.query;

  const params = {
    TableName: TABLE_NAME,
    IndexName: 'entityType-PK-index',
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'IMAGE',
    },
    Limit: 100,
    ScanIndexForward: false, // Sort by PK (timestamp) in descending order
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
    console.error('Error getting photos:', err);
    res.status(500).json({ error: 'Could not retrieve photos' });
  }
});

// GET /photos/:id - Get a specific photo by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Query for the photo with the given ID
    const photoParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': id,
      },
    };

    const command = new QueryCommand(photoParams);
    const { Items } = await docClient.send(command);

    if (!Items || Items.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Add CloudFront domain to s3Key and thumbnailFileName
    const photo = {
      ...Items[0],
      s3Key: CLOUDFRONT_DOMAIN + Items[0].s3Key,
      thumbnailFileName: Items[0].thumbnailFileName ? CLOUDFRONT_DOMAIN + Items[0].thumbnailFileName : null
    };

    res.json(photo);
  } catch (err) {
    console.error(`Error retrieving photo ${id}:`, err);
    res.status(500).json({ error: 'Could not retrieve photo' });
  }
});

// GET /photos/:id/persons - Get persons detected in a specific photo
router.get('/:id/persons', async (req, res) => {
  const { id } = req.params;

  try {
    // Query for TAGGING entities with the photo's PK
    const taggingParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'begins_with(entityType, :entityTypePrefix)',
      ExpressionAttributeValues: {
        ':pk': id,
        ':entityTypePrefix': 'TAGGING',
      },
    };

    const taggingCommand = new QueryCommand(taggingParams);
    const { Items: taggingItems } = await docClient.send(taggingCommand);

    if (!taggingItems || taggingItems.length === 0) {
      return res.json({ items: [] });
    }

    // Extract person IDs from the tagging items
    const personIds = taggingItems.map(item => {
      // Extract person ID from SK (format: 'PERSON#personId')
      const parts = item.SK.split('#');
      return parts.length > 1 ? parts[1] : null;
    }).filter(id => id); // Filter out any null values

    // Fetch person details
    const personPromises = personIds.map(personId => {
      const personParams = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `PERSON#${personId}`,
          ':sk': personId,
        },
      };
      return docClient.send(new QueryCommand(personParams));
    });

    const personResults = await Promise.all(personPromises);

    // Extract person details and add CloudFront URL for person image
    const persons = personResults
      .flatMap(result => result.Items)
      .filter(item => item) // Filter out any undefined items
      .map(person => ({
        personId: person.SK,
        name: person.displayName || person.SK,
        imageUrl: CLOUDFRONT_DOMAIN + 'persons/' + person.SK + '.jpg'
      }));

    res.json({ items: persons });
  } catch (err) {
    console.error(`Error retrieving persons for photo ${id}:`, err);
    res.status(500).json({ error: 'Could not retrieve persons for this photo' });
  }
});

module.exports = router;
