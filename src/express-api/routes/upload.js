const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'dev-sparks-store';

// Helper function to get the current user's email from the Cognito JWT token
function getUserEmailFromToken(req) {
  // In a real implementation, this would extract the email from the JWT token
  // For now, we'll use the 'x-user-email' header for testing
  return req.headers['x-user-email'] || 'unknown@example.com';
}

// GET /upload-url - Get a pre-signed S3 URL for uploading a new photo
router.get('/', async (req, res) => {
  const email = getUserEmailFromToken(req);
  
  // Check if the user has reached their upload limit
  const userParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${email}`,
      SK: `USER#${email}`
    }
  };

  try {
    const userCommand = new GetCommand(userParams);
    const { Item: user } = await docClient.send(userCommand);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count existing uploads
    const countParams = {
      TableName: TABLE_NAME,
      IndexName: 'email-PK-index',
      KeyConditionExpression: 'email = :email AND begins_with(PK, :prefix)',
      ExpressionAttributeValues: {
        ':email': email,
        ':prefix': 'IMAGE#'
      },
      Select: 'COUNT'
    };

    const countCommand = new QueryCommand(countParams);
    const { Count: currentUploads } = await docClient.send(countCommand);
    
    const uploadLimit = user.uploadLimit || 100;
    
    if (currentUploads >= uploadLimit) {
      return res.status(403).json({ 
        error: 'Upload limit reached',
        limit: uploadLimit,
        current: currentUploads
      });
    }

    // Generate a unique key for the new image
    const imageId = uuidv4();
    const key = `originals/${email}/${imageId}.jpg`;

    // Create the pre-signed URL
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: 'image/jpeg'
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({
      uploadUrl: signedUrl,
      imageId: imageId,
      key: key
    });
  } catch (err) {
    console.error(`Error generating upload URL for user ${email}:`, err);
    res.status(500).json({ error: 'Could not generate upload URL' });
  }
});

module.exports = router;
