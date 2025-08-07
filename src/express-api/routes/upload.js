const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const KSUID = require('ksuid');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const authMiddleware = require('../middleware/auth');

// Import PowerTools utilities
const { 
  logger, 
  tracer, 
  createRouteSegment, 
  addCustomMetric, 
  MetricUnit 
} = require('../utils/powertools');

const s3Client = tracer.captureAWSv3Client(new S3Client({}));
const dynamoClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

// GET / - Get a pre-signed S3 URL for uploading a new photo
router.get('/', async (req, res) => {
  const subsegment = createRouteSegment('upload', 'getPresignedUrl');
  
  try {
    const { email } = req.user;

    logger.info('Generating presigned URL for upload', {
      operation: 'getPresignedUrl',
      userEmail: email
    });

    // Check user's upload limit from DEFAULT_LIMIT entity
    const limitSubsegment = subsegment?.addNewSubsegment('checkUploadLimit');
    
    const limitParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `LIMIT#${email}`,
        SK: email
      }
    };

    tracer.addMetadata('dynamodb_query', {
      tableName: TABLE_NAME,
      operation: 'get_user_limit',
      userEmail: email
    });

    const limitCommand = new GetCommand(limitParams);
    const { Item: limitItem } = await docClient.send(limitCommand);
    limitSubsegment?.close();

    if (!limitItem || typeof limitItem.limit !== 'number') {
      logger.warn('Upload limit not set for user', { userEmail: email });
      addCustomMetric('UploadLimitNotSet', 1, MetricUnit.Count);
      return res.status(403).json({ error: 'Upload limit not set for user' });
    }

    if (limitItem.limit <= 0) {
      logger.warn('Upload limit reached for user', { 
        userEmail: email, 
        currentLimit: limitItem.limit 
      });
      addCustomMetric('UploadLimitReached', 1, MetricUnit.Count);
      return res.status(403).json({ error: 'Upload limit reached' });
    }

    logger.info('User upload limit checked', {
      userEmail: email,
      remainingUploads: limitItem.limit
    });

    // Generate a unique, time-ordered key for the new image using KSUID
    const imageId = KSUID.randomSync().string;
    const key = `originals/${imageId}.jpg`;

    logger.info('Generated unique image ID', {
      imageId,
      s3Key: key
    });

    // Create the pre-signed URL
    const presignSubsegment = subsegment?.addNewSubsegment('generatePresignedUrl');
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: 'image/jpeg',
      Metadata: {
        'uploaded-by': email,
        'upload-timestamp': new Date().toISOString(),
        'image-id': imageId
      }
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    presignSubsegment?.close();

    // Add metadata to tracer
    tracer.addMetadata('upload_request', {
      imageId,
      s3Key: key,
      userEmail: email,
      remainingUploads: limitItem.limit,
      expiresIn: 3600
    });

    // Add metrics
    addCustomMetric('PresignedUrlsGenerated', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBQueries', 1, MetricUnit.Count, { operation: 'getPresignedUrl' });

    logger.info('Presigned URL generated successfully', {
      imageId,
      userEmail: email,
      expiresIn: 3600,
      remainingUploads: limitItem.limit
    });

    res.json({
      uploadUrl: signedUrl,
      imageId: imageId,
      key: key,
      expiresIn: 3600,
      remainingUploads: limitItem.limit
    });

  } catch (err) {
    logger.error('Error generating upload URL', {
      error: err.message,
      stack: err.stack,
      userEmail: req.user?.email,
      operation: 'getPresignedUrl'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('PresignedUrlErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not generate upload URL' });
  } finally {
    subsegment?.close();
  }
});

// POST /complete - Create a record in DynamoDB after a successful upload
router.post('/complete', async (req, res) => {
  const subsegment = createRouteSegment('upload', 'completeUpload');
  
  try {
    const { email } = req.user;
    const { imageId, key, description, tags } = req.body;

    logger.info('Completing upload', {
      operation: 'completeUpload',
      userEmail: email,
      imageId,
      s3Key: key,
      hasDescription: !!description,
      tagCount: tags?.length || 0
    });

    if (!imageId || !key) {
      logger.warn('Missing required fields for upload completion', {
        userEmail: email,
        hasImageId: !!imageId,
        hasKey: !!key
      });
      addCustomMetric('UploadCompletionValidationErrors', 1, MetricUnit.Count);
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
        lastModified: timestamp
      },
    };

    // Add validation metadata to tracer
    tracer.addMetadata('upload_completion', {
      imageId,
      s3Key: key,
      userEmail: email,
      description: description || '',
      tagCount: tags?.length || 0,
      timestamp
    });

    // Insert photo record
    const insertSubsegment = subsegment?.addNewSubsegment('insertPhotoRecord');
    
    const command = new PutCommand(params);
    await docClient.send(command);
    insertSubsegment?.close();

    logger.info('Photo record created', {
      imageId,
      userEmail: email
    });

    // Decrement DEFAULT_LIMIT for user
    const limitSubsegment = subsegment?.addNewSubsegment('decrementUserLimit');
    
    const updateLimitParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `LIMIT#${email}`,
        SK: email
      },
      UpdateExpression: 'SET #limit = #limit - :dec, lastModified = :lastModified',
      ExpressionAttributeNames: { '#limit': 'limit' },
      ExpressionAttributeValues: { 
        ':dec': 1, 
        ':zero': 0,
        ':lastModified': timestamp
      },
      ConditionExpression: '#limit > :zero',
      ReturnValues: 'ALL_NEW'
    };

    try {
      const updateResult = await docClient.send(new UpdateCommand(updateLimitParams));
      
      logger.info('User upload limit decremented', {
        userEmail: email,
        newLimit: updateResult.Attributes?.limit
      });

      addCustomMetric('UserLimitsDecremented', 1, MetricUnit.Count);
      
    } catch (limitErr) {
      // If limit update fails, log but do not block photo creation response
      logger.error('Error decrementing upload limit', {
        error: limitErr.message,
        userEmail: email,
        imageId
      });
      addCustomMetric('LimitDecrementErrors', 1, MetricUnit.Count);
    }
    
    limitSubsegment?.close();

    // Add metrics
    addCustomMetric('UploadsCompleted', 1, MetricUnit.Count);
    addCustomMetric('PhotoRecordsCreated', 1, MetricUnit.Count);
    addCustomMetric('DynamoDBWrites', 1, MetricUnit.Count, { operation: 'completeUpload' });
    addCustomMetric('DynamoDBUpdates', 1, MetricUnit.Count, { operation: 'completeUpload' });

    if (description) {
      addCustomMetric('UploadsWithDescription', 1, MetricUnit.Count);
    }
    if (tags && tags.length > 0) {
      addCustomMetric('UploadsWithTags', 1, MetricUnit.Count);
      addCustomMetric('TagsAdded', tags.length, MetricUnit.Count);
    }

    logger.info('Upload completed successfully', {
      imageId,
      userEmail: email,
      hasDescription: !!description,
      tagCount: tags?.length || 0
    });

    res.status(201).json(params.Item);

  } catch (err) {
    logger.error('Error creating photo record', {
      error: err.message,
      stack: err.stack,
      userEmail: req.user?.email,
      imageId: req.body?.imageId,
      operation: 'completeUpload'
    });

    tracer.addErrorAsMetadata(err);
    addCustomMetric('UploadCompletionErrors', 1, MetricUnit.Count);

    res.status(500).json({ error: 'Could not create photo record.' });
  } finally {
    subsegment?.close();
  }
});

module.exports = router;
