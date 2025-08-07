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

// Import PowerTools utilities
const { 
  logger, 
  tracer, 
  createRouteSegment, 
  addCustomMetric, 
  MetricUnit 
} = require('../utils/powertools');

const client = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = tracer.captureAWSv3Client(new S3Client({}));
const sqsClient = tracer.captureAWSv3Client(new SQSClient({}));

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
  const subsegment = createRouteSegment('me', 'getMyPhotos');
  
  try {
    const { email } = req.user;
    const { lastEvaluatedKey } = req.query;

    logger.info('Fetching user photos', {
      operation: 'getMyPhotos',
      userEmail: email,
      hasLastEvaluatedKey: !!lastEvaluatedKey,
      limit: 100
    });

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
      logger.info('Using pagination for user photos', { 
        userEmail: email, 
        lastEvaluatedKey 
      });
    }

    // Add DynamoDB query metadata to tracer
    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      indexName: 'uploadedBy-PK-index',
      operation: 'query_my_photos',
      userEmail: email,
      limit: 100
    });

    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);

    logger.info('DynamoDB query completed for user photos', {
      userEmail: email,
      photoCount: Items?.length || 0,
      hasMoreResults: !!LastEvaluatedKey
    });

    // Add metrics
    addCustomMetric('MyPhotosQueried', Items?.length || 0, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getMyPhotos' });

    // Generate signed URLs for all image variants
    const signedUrlSubsegment = subsegment?.addNewSubsegment('generateSignedUrls');
    
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

    signedUrlSubsegment?.close();

    // Calculate signed URLs generated
    const signedUrlsCount = itemsWithSignedUrls.reduce((count, item) => {
      let urls = 0;
      if (item.s3Key) urls++;
      if (item.thumbnailFileName) urls++;
      if (item.images?.large) urls++;
      if (item.images?.medium) urls++;
      return count + urls;
    }, 0);

    // Add signed URL generation metrics
    addCustomMetric('SignedUrlsGenerated', signedUrlsCount, MetricUnit.Count);

    logger.info('User photos retrieved successfully', {
      userEmail: email,
      totalPhotos: itemsWithSignedUrls.length,
      signedUrlsGenerated: signedUrlsCount,
      hasMoreResults: !!LastEvaluatedKey
    });

    res.json({
      items: itemsWithSignedUrls,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
    });

  } catch (err) {
    logger.error('Error getting photos for user', {
      error: err.message,
      stack: err.stack,
      userEmail: req.user?.email,
      operation: 'getMyPhotos'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('MyPhotosQueryErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve photos' });
  } finally {
    subsegment?.close();
  }
});

// GET /me/limit - Get the current user's upload limit
router.get('/limit', async (req, res) => {
  const subsegment = createRouteSegment('me', 'getMyLimit');
  
  try {
    const { email } = req.user;

    logger.info('Fetching user upload limit', {
      operation: 'getMyLimit',
      userEmail: email
    });

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${email}`,
        SK: `USER#${email}`
      }
    };

    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      operation: 'get_user_limit',
      userEmail: email
    });

    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);

    if (!Item) {
      logger.warn('User not found for limit check', { userEmail: email });
      addCustomMetric('UserNotFoundForLimit', 1, MetricUnit.Count);
      return res.status(404).json({ error: 'User not found' });
    }

    const uploadLimit = Item.uploadLimit || 100;

    logger.info('User upload limit retrieved', {
      userEmail: email,
      uploadLimit
    });

    // Add metrics
    addCustomMetric('UserLimitRetrieved', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getMyLimit' });

    res.json({
      uploadLimit: uploadLimit
    });

  } catch (err) {
    logger.error('Error getting upload limit for user', {
      error: err.message,
      stack: err.stack,
      userEmail: req.user?.email,
      operation: 'getMyLimit'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('UserLimitRetrievalErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve upload limit' });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
// PUT /me/limit - Set the current user's upload limit (for admin use in the future)
router.put('/limit', async (req, res) => {
  const subsegment = createRouteSegment('me', 'updateMyLimit');
  
  try {
    const { email } = req.user;
    const { limit } = req.body;

    logger.info('Updating user upload limit', {
      operation: 'updateMyLimit',
      userEmail: email,
      newLimit: limit
    });

    if (limit === undefined || typeof limit !== 'number' || limit < 0) {
      logger.warn('Invalid limit value provided', {
        userEmail: email,
        providedLimit: limit,
        limitType: typeof limit
      });
      addCustomMetric('LimitUpdateValidationErrors', 1, MetricUnit.Count);
      return res.status(400).json({ error: 'Invalid limit value' });
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${email}`,
        SK: `USER#${email}`
      },
      UpdateExpression: 'SET uploadLimit = :limit, lastModified = :lastModified',
      ExpressionAttributeValues: {
        ':limit': limit,
        ':lastModified': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    tracer.addMetadata('dynamodb_update', {
      tableName: TABLE_NAME,
      operation: 'update_user_limit',
      userEmail: email,
      newLimit: limit
    });

    const command = new UpdateCommand(params);
    const { Attributes } = await docClient.send(command);

    logger.info('User upload limit updated successfully', {
      userEmail: email,
      newLimit: limit,
      updatedLimit: Attributes?.uploadLimit
    });

    // Add metrics
    addCustomMetric('UserLimitUpdated', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBUpdates', 1, MetricUnit.Count, { operation: 'updateMyLimit' });

    res.json({
      uploadLimit: Attributes.uploadLimit
    });

  } catch (err) {
    logger.error('Error updating upload limit for user', {
      error: err.message,
      stack: err.stack,
      userEmail: req.user?.email,
      newLimit: req.body?.limit,
      operation: 'updateMyLimit'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('UserLimitUpdateErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not update upload limit' });
  } finally {
    subsegment?.close();
  }
});

// GET /me/profile - Get the current user's profile information including personId if set
router.get('/profile', async (req, res) => {
  const subsegment = createRouteSegment('me', 'getMyProfile');
  
  try {
    const { email } = req.user;

    logger.info('Fetching user profile', {
      operation: 'getMyProfile',
      userEmail: email
    });

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `${email}`,
        SK: `${email}`
      }
    };

    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      operation: 'get_user_profile',
      userEmail: email
    });

    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);

    if (!Item) {
      logger.warn('User profile not found', { userEmail: email });
      addCustomMetric('UserProfileNotFound', 1, MetricUnit.Count);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('User profile retrieved', {
      userEmail: email,
      hasProfilePicture: !!Item.profilePicture,
      hasPersonId: !!Item.personId
    });

    // Generate signed URL for profile picture if it exists
    if (Item.profilePicture) {
      const signedUrlSubsegment = subsegment?.addNewSubsegment('generateProfilePictureUrl');
      
      const profilePicUrl = CLOUDFRONT_DOMAIN + Item.profilePicture;
      Item.profilePictureUrl = await getSignedUrl(profilePicUrl, { expireTime: URL_EXPIRATION });
      
      signedUrlSubsegment?.close();
      addCustomMetric('SignedUrlsGenerated', 1, MetricUnit.Count);
    }

    // Add metrics
    addCustomMetric('UserProfileRetrieved', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getMyProfile' });

    res.json(Item);

  } catch (err) {
    logger.error('Error getting profile for user', {
      error: err.message,
      stack: err.stack,
      userEmail: req.user?.email,
      operation: 'getMyProfile'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('UserProfileRetrievalErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not retrieve user profile' });
  } finally {
    subsegment?.close();
  }
});

// GET /me/profile-picture-upload - Get a pre-signed S3 URL for uploading a profile picture
router.get('/profile-picture-upload', async (req, res) => {
  const subsegment = createRouteSegment('me', 'getProfilePictureUploadUrl');
  
  try {
    const { email } = req.user;

    logger.info('Generating profile picture upload URL', {
      operation: 'getProfilePictureUploadUrl',
      userEmail: email
    });

    // Generate a unique ID for the profile picture
    const timestamp = Date.now();
    const fileId = uuidv4();
    const key = `profiles/${email}/${fileId}.jpg`;

    logger.info('Generated profile picture upload details', {
      userEmail: email,
      fileId,
      s3Key: key
    });

    // Create the pre-signed URL
    const presignSubsegment = subsegment?.addNewSubsegment('generatePresignedUrl');
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: 'image/jpeg',
      Metadata: {
        'uploaded-by': email,
        'upload-timestamp': new Date().toISOString(),
        'file-id': fileId,
        'upload-type': 'profile-picture'
      }
    });

    const signedUrl = await getS3SignedUrl(s3Client, command, { expiresIn: 3600 });
    presignSubsegment?.close();

    // Add metadata to tracer
    tracer.addMetadata('profile_picture_upload', {
      userEmail: email,
      fileId,
      s3Key: key,
      expiresIn: 3600
    });

    // Add metrics
    addCustomMetric('ProfilePictureUploadUrlsGenerated', 1, MetricUnit.Count);

    logger.info('Profile picture upload URL generated successfully', {
      userEmail: email,
      fileId,
      expiresIn: 3600
    });

    res.json({
      uploadUrl: signedUrl,
      key: key,
      fileId: fileId,
      expiresIn: 3600
    });

  } catch (err) {
    logger.error('Error generating profile picture upload URL', {
      error: err.message,
      stack: err.stack,
      userEmail: req.user?.email,
      operation: 'getProfilePictureUploadUrl'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('ProfilePictureUploadUrlErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not generate upload URL' });
  } finally {
    subsegment?.close();
  }
});

// POST /me/profile-picture/complete - Process the uploaded profile picture with face recognition
router.post('/profile-picture/complete', async (req, res) => {
  const subsegment = createRouteSegment('me', 'completeProfilePictureUpload');
  
  try {
    const { email } = req.user;
    const { key } = req.body;

    logger.info('Completing profile picture upload', {
      operation: 'completeProfilePictureUpload',
      userEmail: email,
      s3Key: key
    });

    if (!key) {
      logger.warn('Missing key for profile picture completion', { userEmail: email });
      addCustomMetric('ProfilePictureCompletionValidationErrors', 1, MetricUnit.Count);
      return res.status(400).json({ error: 'key is required' });
    }

    // 1. First check if the user record exists
    const getUserSubsegment = subsegment?.addNewSubsegment('getUserRecord');
    
    const getUserParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: email,
        SK: email
      }
    };

    const getCommand = new GetCommand(getUserParams);
    const { Item: userItem } = await docClient.send(getCommand);
    getUserSubsegment?.close();

    const timestamp = new Date().toISOString();

    if (!userItem) {
      // User doesn't exist, create a new user record
      logger.info('User not found, creating new user record', { userEmail: email });

      const createUserSubsegment = subsegment?.addNewSubsegment('createUserRecord');
      
      // Extract preferred username from auth token
      const preferredUsername = req.user['preferred_username'] || req.user['cognito:username'] || email;
      
      logger.info('Creating new user with profile picture', {
        userEmail: email,
        preferredUsername,
        profilePictureKey: key
      });

      const userInsertParam = {
        TableName: TABLE_NAME,
        Item: {
          PK: email,
          SK: email,
          entityType: "USER",
          username: preferredUsername,
          email: email,
          profilePicture: key,
          updatedAt: timestamp,
          createdAt: timestamp
        }
      };

      const putCommand = new PutCommand(userInsertParam);
      await docClient.send(putCommand);
      createUserSubsegment?.close();

      addCustomMetric('UserRecordsCreated', 1, MetricUnit.Count);
      
    } else {
      // User exists, update the profile picture
      logger.info('Updating existing user profile picture', {
        userEmail: email,
        profilePictureKey: key
      });

      const updateUserSubsegment = subsegment?.addNewSubsegment('updateUserRecord');
      
      const updateUserParams = {
        TableName: TABLE_NAME,
        Key: {
          PK: email,
          SK: email
        },
        UpdateExpression: 'SET profilePicture = :profilePic, updatedAt = :updatedAt, entityType = :entityType, email = :email',
        ExpressionAttributeValues: {
          ':profilePic': key,
          ':updatedAt': timestamp,
          ':entityType': 'USER',
          ':email': email
        },
        ReturnValues: 'ALL_NEW'
      };

      const updateCommand = new UpdateCommand(updateUserParams);
      await docClient.send(updateCommand);
      updateUserSubsegment?.close();

      addCustomMetric('UserRecordsUpdated', 1, MetricUnit.Count);
    }

    // 2. Send message to face recognition SQS queue
    const sqsSubsegment = subsegment?.addNewSubsegment('sendFaceRecognitionMessage');
    
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

        logger.info('Message sent to face recognition queue', {
          userEmail: email,
          s3Key: key,
          queueUrl: FACE_RECOGNITION_QUEUE_URL
        });

        addCustomMetric('FaceRecognitionMessagesQueued', 1, MetricUnit.Count);
        
      } catch (sqsError) {
        logger.error('Error sending message to face recognition queue', {
          error: sqsError.message,
          userEmail: email,
          s3Key: key
        });
        addCustomMetric('FaceRecognitionQueueErrors', 1, MetricUnit.Count);
        // Don't fail the request if SQS message sending fails
      }
    } else {
      logger.warn('Face recognition queue URL not configured', { userEmail: email });
    }
    
    sqsSubsegment?.close();

    // 3. Generate signed URL for the profile picture
    const signedUrlSubsegment = subsegment?.addNewSubsegment('generateSignedUrl');
    
    const profilePicUrl = CLOUDFRONT_DOMAIN + key;
    const signedUrl = await getSignedUrl(profilePicUrl, { expireTime: URL_EXPIRATION });
    signedUrlSubsegment?.close();

    // Add metadata to tracer
    tracer.addMetadata('profile_picture_completion', {
      userEmail: email,
      s3Key: key,
      faceRecognitionQueued: !!FACE_RECOGNITION_QUEUE_URL,
      timestamp
    });

    // Add metrics
    addCustomMetric('ProfilePictureUploadsCompleted', 1, MetricUnit.Count);
    addCustomMetric('SignedUrlsGenerated', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBWrites', 1, MetricUnit.Count, { operation: 'completeProfilePictureUpload' });

    logger.info('Profile picture upload completed successfully', {
      userEmail: email,
      s3Key: key,
      faceRecognitionQueued: !!FACE_RECOGNITION_QUEUE_URL
    });

    return res.json({
      profilePictureUrl: signedUrl,
      message: 'Profile picture uploaded successfully. Face recognition processing started.',
      processingStatus: 'started'
    });

  } catch (err) {
    logger.error('Error processing profile picture', {
      error: err.message,
      stack: err.stack,
      userEmail: req.user?.email,
      s3Key: req.body?.key,
      operation: 'completeProfilePictureUpload'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('ProfilePictureCompletionErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not process profile picture' });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
// GET /me/photos-with-me - Get photos where the current user is detected
router.get('/photos-with-me', async (req, res) => {
  const subsegment = createRouteSegment('me', 'getPhotosWithMe');
  
  try {
    const { email } = req.user;
    const { lastEvaluatedKey } = req.query;

    logger.info('Fetching photos where user is detected', {
      operation: 'getPhotosWithMe',
      userEmail: email,
      hasLastEvaluatedKey: !!lastEvaluatedKey
    });

    // 1. First get the user's personId
    const getUserSubsegment = subsegment?.addNewSubsegment('getUserPersonId');
    
    const getUserParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: email,
        SK: email
      }
    };

    const userCommand = new GetCommand(getUserParams);
    const { Item: userItem } = await docClient.send(userCommand);
    getUserSubsegment?.close();

    if (!userItem || !userItem.personId) {
      logger.info('User has no personId, no photos with face detection available', {
        userEmail: email,
        hasUserItem: !!userItem,
        hasPersonId: !!userItem?.personId
      });

      addCustomMetric('PhotosWithMeNoPersonId', 1, MetricUnit.Count);

      return res.json({
        items: [],
        lastEvaluatedKey: null,
        message: 'No profile picture uploaded yet. Upload a profile picture to see photos where you are detected.'
      });
    }

    const personId = userItem.personId;

    logger.info('Found user personId', {
      userEmail: email,
      personId
    });

    // 2. Query for photos where this person is tagged
    const querySubsegment = subsegment?.addNewSubsegment('queryTaggedPhotos');
    
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
      logger.info('Using pagination for photos with me', { 
        userEmail: email, 
        personId,
        lastEvaluatedKey 
      });
    }

    // Add DynamoDB query metadata to tracer
    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      indexName: 'entityType-PK-index',
      operation: 'query_photos_with_me',
      userEmail: email,
      personId,
      limit: 100
    });

    const command = new QueryCommand(params);
    const { Items, LastEvaluatedKey } = await docClient.send(command);
    querySubsegment?.close();

    logger.info('Tagged photos query completed', {
      userEmail: email,
      personId,
      taggedPhotoCount: Items?.length || 0,
      hasMoreResults: !!LastEvaluatedKey
    });

    // Add metrics
    addCustomMetric('PhotosWithMeQueried', Items?.length || 0, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getPhotosWithMe' });

    // 3. For each tagging record, get the corresponding image record
    const imageRecordsSubsegment = subsegment?.addNewSubsegment('fetchImageRecords');
    
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
        logger.error('Error fetching image record', {
          error: err.message,
          imageId,
          userEmail: email
        });
      }
    }

    imageRecordsSubsegment?.close();

    logger.info('Image records fetched', {
      userEmail: email,
      personId,
      imageRecordCount: imageRecords.length
    });

    // Add metrics for additional DynamoDB queries
    addCustomMetric('DynamoDBQueries', imageIds.length, MetricUnit.Count, { operation: 'getPhotosWithMe' });

    // 4. Generate signed URLs for all image variants
    const signedUrlSubsegment = subsegment?.addNewSubsegment('generateSignedUrls');
    
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

    signedUrlSubsegment?.close();

    // Calculate signed URLs generated
    const signedUrlsCount = itemsWithSignedUrls.reduce((count, item) => {
      let urls = 0;
      if (item.s3Key) urls++;
      if (item.thumbnailFileName) urls++;
      if (item.images?.large) urls++;
      if (item.images?.medium) urls++;
      return count + urls;
    }, 0);

    // Add signed URL generation metrics
    addCustomMetric('SignedUrlsGenerated', signedUrlsCount, MetricUnit.Count);
    addCustomMetric('PhotosWithMeRetrieved', itemsWithSignedUrls.length, MetricUnit.Count);

    logger.info('Photos with user retrieved successfully', {
      userEmail: email,
      personId,
      totalPhotos: itemsWithSignedUrls.length,
      signedUrlsGenerated: signedUrlsCount,
      hasMoreResults: !!LastEvaluatedKey
    });

    res.json({
      items: itemsWithSignedUrls,
      lastEvaluatedKey: LastEvaluatedKey ? encodeURIComponent(JSON.stringify(LastEvaluatedKey)) : null,
      personId: personId
    });

  } catch (err) {
    logger.error('Error getting photos with user', {
      error: err.message,
      stack: err.stack,
      userEmail: req.user?.email,
      operation: 'getPhotosWithMe'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('PhotosWithMeErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not get photos where you are detected' });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
