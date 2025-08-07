const sharp = require("sharp");
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require("@aws-sdk/client-cognito-identity-provider");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

// Import PowerTools
const { Logger } = require('@aws-lambda-powertools/logger');
const { Tracer } = require('@aws-lambda-powertools/tracer');
const { Metrics, MetricUnit } = require('@aws-lambda-powertools/metrics');

// Initialize PowerTools
const logger = new Logger({
  serviceName: 'image-thumbnail-generation',
  logLevel: process.env.LOG_LEVEL || 'INFO'
});

const tracer = new Tracer({
  serviceName: 'image-thumbnail-generation'
});

const metrics = new Metrics({
  namespace: 'Sparks/Lambda',
  serviceName: 'image-thumbnail-generation'
});

// Initialize AWS clients with tracing
const client = tracer.captureAWSv3Client(new DynamoDBClient());
const documentClient = DynamoDBDocument.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false
  }
});
const cognitoClient = tracer.captureAWSv3Client(new CognitoIdentityProviderClient());
const s3Client = tracer.captureAWSv3Client(new S3Client());
const snsClient = tracer.captureAWSv3Client(new SNSClient());

const { CLOUDFRONT_DOMAIN, DDB_TABLE_NAME, THUMBNAIL_BUCKET_NAME, USER_POOL_ID, SOURCE_BUCKET_NAME, THUMBNAIL_COMPLETION_TOPIC_ARN } = process.env;

// Simplified image processing pipeline
const IMAGE_VARIANTS = [
  { width: 400, height: 400, suffix: 'medium', quality: 85, format: 'webp' },     // Grid/preview thumbnails
  { width: 1920, height: 1920, suffix: 'large', quality: 95, format: 'webp' }     // Full-screen viewing
];

async function processAllImageVariants(bucketName, objectKey) {
  const subsegment = tracer.getSegment()?.addNewSubsegment('processAllImageVariants');
  
  try {
    logger.info('Starting image processing', {
      bucketName,
      objectKey,
      variants: IMAGE_VARIANTS.length
    });

    // Get the original image from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });

    const response = await s3Client.send(getObjectCommand);
    const imageBuffer = await streamToBuffer(response.Body);

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    logger.info('Image metadata extracted', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size
    });

    tracer.addMetadata('image_metadata', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size
    });

    const processedImages = [];

    // Generate all variants
    for (const variant of IMAGE_VARIANTS) {
      const variantSubsegment = subsegment?.addNewSubsegment(`process_${variant.suffix}`);
      
      try {
        let sharpInstance = sharp(imageBuffer);

        // Handle resizing
        if (variant.width && variant.height) {
          if (variant.suffix === 'large') {
            // For large variant, use 'inside' to preserve aspect ratio and don't upscale
            sharpInstance = sharpInstance.resize(variant.width, variant.height, {
              fit: 'inside',
              withoutEnlargement: true
            });
          } else {
            // For medium thumbnails, use 'cover' for consistent dimensions
            sharpInstance = sharpInstance.resize(variant.width, variant.height, {
              fit: 'cover',
              position: 'center',
              withoutEnlargement: true
            });
          }
        }

        // Apply WebP format and quality
        const processedBuffer = await sharpInstance
          .webp({
            quality: variant.quality,
            effort: 6, // Maximum effort for best quality
            smartSubsample: true
          })
          .toBuffer();

        processedImages.push({
          buffer: processedBuffer,
          suffix: variant.suffix,
          format: 'webp',
          contentType: 'image/webp'
        });

        logger.info('Image variant processed', {
          suffix: variant.suffix,
          outputSize: processedBuffer.length
        });

        metrics.addMetric(`ImageVariant${variant.suffix}Processed`, MetricUnit.Count, 1);

      } catch (variantError) {
        logger.error('Error processing image variant', {
          suffix: variant.suffix,
          error: variantError.message
        });
        throw variantError;
      } finally {
        variantSubsegment?.close();
      }
    }

    metrics.addMetric('ImageVariantsProcessed', MetricUnit.Count, processedImages.length);
    
    return processedImages;
  } catch (err) {
    logger.error('Error processing image variants', {
      error: err.message,
      stack: err.stack,
      bucketName,
      objectKey
    });
    tracer.addErrorAsMetadata(err);
    metrics.addMetric('ImageProcessingErrors', MetricUnit.Count, 1);
    throw err;
  } finally {
    subsegment?.close();
  }
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function getUserFromCognito(userId) {
  const subsegment = tracer.getSegment()?.addNewSubsegment('getUserFromCognito');
  
  try {
    logger.info('Fetching user from Cognito', { userId });

    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId
    });

    const response = await cognitoClient.send(command);
    const preferredUsernameAttr = response.UserAttributes.find(
      attr => attr.Name === 'name'
    );

    const username = preferredUsernameAttr ? preferredUsernameAttr.Value : userId;
    
    logger.info('User fetched from Cognito', { userId, username });
    metrics.addMetric('CognitoUserFetched', MetricUnit.Count, 1);

    return username;
  } catch (error) {
    logger.error('Error getting user from Cognito', {
      error: error.message,
      userId
    });
    metrics.addMetric('CognitoUserFetchErrors', MetricUnit.Count, 1);
    return userId;
  } finally {
    subsegment?.close();
  }
}

const handler = async (event) => {
  logger.info('Lambda invocation started', {
    recordCount: event.Records?.length || 0
  });

  metrics.addMetric('LambdaInvocations', MetricUnit.Count, 1);
  metrics.addMetric('SQSRecordsProcessed', MetricUnit.Count, event.Records?.length || 0);

  for (let i = 0; i < event.Records.length; i++) {
    const recordSubsegment = tracer.getSegment()?.addNewSubsegment(`processRecord_${i}`);
    
    try {
      const body = event.Records[i].body;
      const message = JSON.parse(body);
      const objectKey = message.Records[0].s3.object.key;
      const bucketName = message.Records[0].s3.bucket.name || SOURCE_BUCKET_NAME;
      const fileName = objectKey.split("/").pop();
      const fileNameWithoutExt = fileName.split(".")[0];

      logger.info('Processing image record', {
        recordIndex: i,
        fileName,
        bucketName,
        objectKey
      });

      tracer.addMetadata('record_processing', {
        recordIndex: i,
        fileName,
        bucketName,
        objectKey,
        fileNameWithoutExt
      });

      // Generate all image variants (thumbnails + full-screen versions)
      const processedImages = await processAllImageVariants(bucketName, objectKey);

      // Upload all variants to S3
      const uploadSubsegment = recordSubsegment?.addNewSubsegment('uploadVariants');
      
      const uploadPromises = processedImages.map(async (image) => {
        const imageKey = `processed/${fileNameWithoutExt}_${image.suffix}.webp`;
        await uploadFile(THUMBNAIL_BUCKET_NAME, imageKey, image.buffer, image.contentType);
        return {
          key: imageKey,
          suffix: image.suffix
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      uploadSubsegment?.close();

      logger.info('Image variants uploaded', {
        fileName,
        uploadedCount: uploadedImages.length,
        variants: uploadedImages.map(img => img.suffix)
      });

      metrics.addMetric('ImageVariantsUploaded', MetricUnit.Count, uploadedImages.length);

      // Update DynamoDB with all image variants
      const ddbSubsegment = recordSubsegment?.addNewSubsegment('updateDynamoDB');
      
      const PK = fileNameWithoutExt;
      const item = await getItemFromDDB(PK);

      if (item && item.length > 0) {
        // Find uploaded images with validation
        const mediumImage = uploadedImages.find(img => img.suffix === 'medium');
        const largeImage = uploadedImages.find(img => img.suffix === 'large');

        // Validate that both images were processed successfully
        if (!mediumImage || !largeImage) {
          const error = new Error(`Failed to generate required image variants for ${fileName}`);
          logger.error('Missing image variants', {
            fileName,
            medium: !!mediumImage,
            large: !!largeImage,
            uploadedImages: uploadedImages.map(img => img.suffix)
          });
          throw error;
        }

        // Create simplified image data object with validated values
        const imageData = {
          medium: mediumImage.key,
          large: largeImage.key,
          processedAt: new Date().toISOString()
        };

        logger.info('Updating DynamoDB with image data', {
          PK,
          imageData
        });

        await updateItemInDDB(PK, item[0].SK, imageData);

        const user = item[0].SK.split("#")[1];
        await createUserObj(user);

        // Publish thumbnail completion event to trigger face recognition
        await publishThumbnailCompletionEvent(bucketName, objectKey, uploadedImages, fileNameWithoutExt);

        metrics.addMetric('DynamoDBUpdatesSuccessful', MetricUnit.Count, 1);

      } else {
        logger.error('No DDB item found', { PK });
        metrics.addMetric('DynamoDBItemNotFound', MetricUnit.Count, 1);
      }

      ddbSubsegment?.close();

      logger.info('Record processed successfully', {
        recordIndex: i,
        fileName
      });

      metrics.addMetric('RecordsProcessedSuccessfully', MetricUnit.Count, 1);

    } catch (error) {
      logger.error('Error processing record', {
        recordIndex: i,
        error: error.message,
        stack: error.stack
      });
      
      tracer.addErrorAsMetadata(error);
      metrics.addMetric('RecordProcessingErrors', MetricUnit.Count, 1);
    } finally {
      recordSubsegment?.close();
    }
  }

  logger.info('Lambda invocation completed');
};

const uploadFile = async (bucket, key, buffer, contentType) => {
  const subsegment = tracer.getSegment()?.addNewSubsegment('uploadFile');
  
  try {
    logger.info('Uploading file to S3', {
      bucket,
      key,
      contentType,
      size: buffer.length
    });

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000', // Cache for 1 year
        Metadata: {
          'generated-by': 'lambda-image-processor',
          'generated-at': new Date().toISOString()
        }
      },
    });
    
    await upload.done();
    
    logger.info('File uploaded successfully', { bucket, key });
    metrics.addMetric('S3UploadsSuccessful', MetricUnit.Count, 1);
    
  } catch (error) {
    logger.error('Error uploading file', {
      error: error.message,
      bucket,
      key
    });
    metrics.addMetric('S3UploadErrors', MetricUnit.Count, 1);
    throw error;
  } finally {
    subsegment?.close();
  }
};

const getItemFromDDB = async (PK) => {
  const subsegment = tracer.getSegment()?.addNewSubsegment('getItemFromDDB');
  
  try {
    const params = {
      TableName: DDB_TABLE_NAME,
      IndexName: "entityType-PK-index",
      KeyConditionExpression: "entityType = :entityType and PK = :pkval",
      ExpressionAttributeValues: {
        ":pkval": PK,
        ":entityType": "IMAGE",
      },
    };

    logger.info('Querying DynamoDB', { PK });
    
    const data = await documentClient.query(params);
    
    logger.info('DynamoDB query completed', {
      PK,
      itemCount: data.Items?.length || 0
    });

    metrics.addMetric('DynamoDBQueries', MetricUnit.Count, 1);
    
    return data.Items;
  } catch (error) {
    logger.error('Error querying DynamoDB', {
      error: error.message,
      PK
    });
    metrics.addMetric('DynamoDBQueryErrors', MetricUnit.Count, 1);
    return [];
  } finally {
    subsegment?.close();
  }
};

const updateItemInDDB = async (PK, SK, imageData) => {
  const subsegment = tracer.getSegment()?.addNewSubsegment('updateItemInDDB');
  
  try {
    const params = {
      TableName: DDB_TABLE_NAME,
      Key: {
        PK,
        SK,
      },
      UpdateExpression: "SET images = :imageData, lastModified = :lastModified",
      ExpressionAttributeValues: {
        ":imageData": imageData,
        ":lastModified": new Date().toISOString()
      },
    };

    logger.info('Updating DynamoDB item', { PK, SK });

    const result = await documentClient.update(params);
    
    logger.info('DynamoDB update completed', { PK, SK });
    metrics.addMetric('DynamoDBUpdates', MetricUnit.Count, 1);
    
    return result;
  } catch (error) {
    logger.error('DDB Update Error', {
      error: error.message,
      PK,
      SK,
      params: JSON.stringify(params, null, 2)
    });
    metrics.addMetric('DynamoDBUpdateErrors', MetricUnit.Count, 1);
    throw error;
  } finally {
    subsegment?.close();
  }
};

async function createUserObj(user) {
  const subsegment = tracer.getSegment()?.addNewSubsegment('createUserObj');
  
  try {
    const preferredUsername = await getUserFromCognito(user);

    logger.info('Creating/updating user object', { user, preferredUsername });

    // first update username in ddb
    try {
      const updateParams = {
        TableName: DDB_TABLE_NAME,
        Key: {
          PK: user,
          SK: user,
        },
        UpdateExpression: "SET username = :username, entityType = :entityType, email= :email",
        ExpressionAttributeValues: {
          ":username": preferredUsername,
          ":entityType": "USER",
          ":email": user,
        },
      };
      
      await documentClient.update(updateParams);
      logger.info('User object updated', { user });
      metrics.addMetric('UserObjectsUpdated', MetricUnit.Count, 1);

    } catch (error) {
      logger.warn('Error updating username in DDB, attempting insert', {
        error: error.message,
        user
      });

      const userInsertParam = {
        TableName: DDB_TABLE_NAME,
        Item: {
          PK: user,
          SK: user,
          entityType: "USER",
          username: preferredUsername,
          email: user
        },
      };
      
      await documentClient.put(userInsertParam);
      logger.info('User object created', { user });
      metrics.addMetric('UserObjectsCreated', MetricUnit.Count, 1);
    }

  } catch (error) {
    if (error.name !== 'ConditionalCheckFailedException') {
      logger.error('Error in creating user Obj', {
        error: error.message,
        user
      });
      metrics.addMetric('UserObjectErrors', MetricUnit.Count, 1);
    }
  } finally {
    subsegment?.close();
  }
}

async function publishThumbnailCompletionEvent(bucketName, originalObjectKey, processedImages, fileNameWithoutExt) {
  const subsegment = tracer.getSegment()?.addNewSubsegment('publishThumbnailCompletionEvent');
  
  try {
    if (!THUMBNAIL_COMPLETION_TOPIC_ARN) {
      logger.info("THUMBNAIL_COMPLETION_TOPIC_ARN not configured, skipping face recognition trigger");
      return;
    }

    const message = {
      bucketName: bucketName,
      originalObjectKey: originalObjectKey,
      processedImages: processedImages,
      fileNameWithoutExt: fileNameWithoutExt,
      largeImageKey: processedImages.find(img => img.suffix === 'large')?.key,
      mediumImageKey: processedImages.find(img => img.suffix === 'medium')?.key,
      timestamp: new Date().toISOString()
    };

    logger.info('Publishing thumbnail completion event', {
      fileNameWithoutExt,
      topicArn: THUMBNAIL_COMPLETION_TOPIC_ARN
    });

    const publishCommand = new PublishCommand({
      TopicArn: THUMBNAIL_COMPLETION_TOPIC_ARN,
      Message: JSON.stringify(message),
      Subject: `Thumbnail generation completed for ${fileNameWithoutExt}`,
      MessageGroupId: bucketName, // Required for FIFO topics
      MessageDeduplicationId: `${fileNameWithoutExt}-${Date.now()}` // Required for FIFO topics
    });

    const result = await snsClient.send(publishCommand);
    
    logger.info('Thumbnail completion event published', {
      messageId: result.MessageId,
      fileNameWithoutExt
    });

    metrics.addMetric('SNSMessagesPublished', MetricUnit.Count, 1);

    return result;
  } catch (error) {
    logger.error('Error publishing thumbnail completion event', {
      error: error.message,
      fileNameWithoutExt
    });
    metrics.addMetric('SNSPublishErrors', MetricUnit.Count, 1);
    // Don't throw error to avoid failing the thumbnail generation process
  } finally {
    subsegment?.close();
  }
}

// Export handler with PowerTools decorators
module.exports.handler = tracer.captureLambdaHandler(
  logger.injectLambdaContext(
    metrics.logMetrics(handler)
  )
);
