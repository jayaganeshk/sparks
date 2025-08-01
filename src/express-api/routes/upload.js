const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const KSUID = require('ksuid');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { authMiddleware } = require('../middleware/auth');

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

// GET / - Get a pre-signed S3 URL for uploading a new photo
router.get('/', async (req, res) => {
  const { email } = req.user;

  try {
    // Check user's upload count against their limit
    const countParams = {
      TableName: TABLE_NAME,
      IndexName: 'uploadedBy-PK-index',
      KeyConditionExpression: 'uploadedBy = :email',
      ExpressionAttributeValues: { ':email': email },
      Select: 'COUNT',
    };
    const countCommand = new QueryCommand(countParams);
    const { Count } = await docClient.send(countCommand);

    // For now, we'll assume a default limit. In the future, this can be a user attribute.
    const uploadLimit = 1000;
    if (Count >= uploadLimit) {
      return res.status(403).json({ error: 'Upload limit reached' });
    }

    // Generate a unique, time-ordered key for the new image using KSUID
    const imageId = KSUID.randomSync().string;
    const key = `originals/${imageId}.jpg`;

    // Create the pre-signed URL
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: 'image/jpeg',
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      uploadUrl: signedUrl,
      imageId: imageId,
      key: key,
    });
  } catch (err) {
    console.error(`Error generating upload URL for user ${email}:`, err);
    res.status(500).json({ error: 'Could not generate upload URL' });
  }
});

// POST /complete - Create a record in DynamoDB after a successful upload
router.post('/complete', async (req, res) => {
  const { email } = req.user;
  const { imageId, key, description, tags } = req.body;

  if (!imageId || !key) {
    return res.status(400).json({ error: 'imageId and key are required.' });
  }

  const timestamp = new Date().toISOString();

  const params = {
    TableName: TABLE_NAME,
    Item: {
      PK: imageId,
      SK: `UPLOADED_BY#${email}`,
      entityType: 'IMAGE',
      assetType: 'IMAGE',
      uploadedBy: email,
      imageId: imageId,
      s3Key: key,
      thumbnailFileName: "",
      description: description || '',
      tags: tags || [],
      persons: [],
      uploaded_datetime: timestamp,
    },
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.status(201).json(params.Item);
  } catch (err) {
    console.error(`Error creating photo record for user ${email}:`, err);
    res.status(500).json({ error: 'Could not create photo record.' });
  }
});

module.exports = router;
