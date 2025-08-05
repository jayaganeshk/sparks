const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  PutCommand,
  TransactWriteCommand
} = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl: getS3SignedUrl } = require("@aws-sdk/s3-request-presigner");
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const authMiddleware = require('../middleware/auth');
const { getSignedUrl } = require('../utils/cloudfront');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';
const S3_BUCKET = process.env.S3_BUCKET_NAME;
const FACE_RECOGNITION_QUEUE_URL = process.env.FACE_RECOGNITION_QUEUE_URL;

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

// GET /me/profile - Get the current user's profile information including personId if set
router.get('/profile', async (req, res) => {
  const { email } = req.user;

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `${email}`,
      SK: `${email}`
    }
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);

    if (!Item) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log("user profile", Item)

    const profilePicUrl = CLOUDFRONT_DOMAIN + Item.profilePicture;
    Item.profilePictureUrl = await getSignedUrl(profilePicUrl, { expireTime: URL_EXPIRATION });

    res.json(Item);
  } catch (err) {
    console.error(`Error getting profile for user ${email}:`, err);
    res.status(500).json({ error: 'Could not retrieve user profile' });
  }
});

// GET /me/profile-picture-upload - Get a pre-signed S3 URL for uploading a profile picture
router.get('/profile-picture-upload', async (req, res) => {
  const { email } = req.user;

  try {
    // Generate a unique ID for the profile picture
    const timestamp = Date.now();
    const fileId = uuidv4();
    const key = `profiles/${email}/${fileId}.jpg`;

    // Create the pre-signed URL
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: 'image/jpeg',
    });

    const signedUrl = await getS3SignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      uploadUrl: signedUrl,
      key: key,
      fileId: fileId
    });
  } catch (err) {
    console.error(`Error generating profile picture upload URL for user ${email}:`, err);
    res.status(500).json({ error: 'Could not generate upload URL' });
  }
});

// POST /me/profile-picture/complete - Process the uploaded profile picture with face recognition
router.post('/profile-picture/complete', async (req, res) => {
  const { email } = req.user;
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'key is required' });
  }

  try {
    // 1. First check if the user record exists
    const getUserParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: email,
        SK: email
      }
    };
    
    const getCommand = new GetCommand(getUserParams);
    const { Item: userItem } = await docClient.send(getCommand);
    
    if (!userItem) {
      // User doesn't exist, create a new user record
      console.log(`User ${email} not found, creating new user record`);
      
      // Extract preferred username from auth token
      const preferredUsername = req.user['preferred_username'] || req.user['cognito:username'] || email;
      console.log(`Using preferred username: ${preferredUsername}`);
      
      const userInsertParam = {
        TableName: TABLE_NAME,
        Item: {
          PK: email,
          SK: email,
          entityType: "USER",
          username: preferredUsername,
          email: email,
          profilePicture: key,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      };
      
      const putCommand = new PutCommand(userInsertParam);
      await docClient.send(putCommand);
    } else {
      // User exists, update the profile picture
      const updateUserParams = {
        TableName: TABLE_NAME,
        Key: {
          PK: email,
          SK: email
        },
        UpdateExpression: 'SET profilePicture = :profilePic, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':profilePic': key,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      };

      const updateCommand = new UpdateCommand(updateUserParams);
      await docClient.send(updateCommand);
    }

    // 2. Send message to face recognition SQS queue
    if (FACE_RECOGNITION_QUEUE_URL) {
      try {
        const messagePayload = {
          bucketName: S3_BUCKET,
          objectKey: key,
          isProfilePicture: true,
          userEmail: email
        };

        const sendParams = {
          QueueUrl: FACE_RECOGNITION_QUEUE_URL,
          MessageBody: JSON.stringify(messagePayload),
          MessageGroupId: 'profile-picture',
          MessageDeduplicationId: key,
          MessageAttributes: {
            'MessageType': {
              DataType: 'String',
              StringValue: 'PROFILE_PICTURE'
            }
          }
        };

        const sendCommand = new SendMessageCommand(sendParams);
        await sqsClient.send(sendCommand);

        console.log(`Message sent to face recognition queue for profile picture: ${key}`);
      } catch (sqsError) {
        console.error('Error sending message to face recognition queue:', sqsError);
        // Don't fail the request if SQS message sending fails
      }
    }

    // 3. Generate signed URL for the profile picture
    const profilePicUrl = CLOUDFRONT_DOMAIN + key;
    const signedUrl = await getSignedUrl(profilePicUrl, { expireTime: URL_EXPIRATION });

    return res.json({
      profilePictureUrl: signedUrl,
      message: 'Profile picture uploaded successfully. Face recognition processing started.',
      processingStatus: 'started'
    });

  } catch (err) {
    console.error(`Error processing profile picture for user ${email}:`, err);
    res.status(500).json({ error: 'Could not process profile picture' });
  }
});

// GET /me/photos-with-me - Get photos where the current user is detected
router.get('/photos-with-me', async (req, res) => {
  const { email } = req.user;
  const { lastEvaluatedKey } = req.query;

  try {
    // 1. First get the user's personId
    const getUserParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: email,
        SK: email
      }
    };

    const userCommand = new GetCommand(getUserParams);
    const { Item: userItem } = await docClient.send(userCommand);

    if (!userItem || !userItem.personId) {
      return res.json({
        items: [],
        lastEvaluatedKey: null,
        message: 'No profile picture uploaded yet. Upload a profile picture to see photos where you are detected.'
      });
    }

    const personId = userItem.personId;

    // 2. Query for photos where this person is tagged
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'entityType-PK-index',
      KeyConditionExpression: 'entityType = :entityType',
      FilterExpression: 'contains(SK, :personId)',
      ExpressionAttributeValues: {
        ':entityType': `TAGGING#${personId}`,
        ':personId': `PERSON#${personId}`
      },
      Limit: 100,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }

    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    // 3. For each tagging record, get the corresponding image record
    const imageIds = Items.map(item => item.PK);
    const imageRecords = [];

    for (const imageId of imageIds) {
      try {
        const imageParams = {
          TableName: TABLE_NAME,
          IndexName: 'entityType-PK-index',
          KeyConditionExpression: 'entityType = :entityType and PK = :imageId',
          ExpressionAttributeValues: {
            ':entityType': 'IMAGE',
            ':imageId': imageId
          }
        };

        const imageCommand = new QueryCommand(imageParams);
        const { Items: imageItems } = await docClient.send(imageCommand);

        if (imageItems && imageItems.length > 0) {
          imageRecords.push(imageItems[0]);
        }
      } catch (err) {
        console.error(`Error fetching image record for ${imageId}:`, err);
      }
    }

    // 4. Generate signed URLs for all image variants
    const itemsWithSignedUrls = await Promise.all(imageRecords.map(async item => {
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
      personId: personId
    });
  } catch (err) {
    console.error(`Error getting photos with user ${email}:`, err);
    res.status(500).json({ error: 'Could not get photos where you are detected' });
  }
});

module.exports = router;
