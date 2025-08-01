const sharp = require("sharp");
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require("@aws-sdk/client-cognito-identity-provider");

const client = new DynamoDBClient();
const documentClient = DynamoDBDocument.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Automatically remove undefined values
    convertEmptyValues: false
  }
});
const cognitoClient = new CognitoIdentityProviderClient();
const s3Client = new S3Client();

const { CLOUDFRONT_DOMAIN, DDB_TABLE_NAME, THUMBNAIL_BUCKET_NAME, USER_POOL_ID, SOURCE_BUCKET_NAME } = process.env;

// Simplified image processing pipeline
const IMAGE_VARIANTS = [
  { width: 400, height: 400, suffix: 'medium', quality: 85, format: 'webp' },     // Grid/preview thumbnails
  { width: 1920, height: 1920, suffix: 'large', quality: 95, format: 'webp' }     // Full-screen viewing
];

async function processAllImageVariants(bucketName, objectKey) {
  try {
    // Get the original image from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });

    const response = await s3Client.send(getObjectCommand);
    const imageBuffer = await streamToBuffer(response.Body);

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`Processing image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    const processedImages = [];

    // Generate all variants
    for (const variant of IMAGE_VARIANTS) {
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
    }

    return processedImages;
  } catch (err) {
    console.error('Error processing image variants:', err);
    throw err;
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
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId
    });

    const response = await cognitoClient.send(command);
    const preferredUsernameAttr = response.UserAttributes.find(
      attr => attr.Name === 'name'
    );

    return preferredUsernameAttr ? preferredUsernameAttr.Value : userId;
  } catch (error) {
    console.error("Error getting user from Cognito:", error);
    return userId;
  }
}

exports.handler = async (event) => {
  for (let i = 0; i < event.Records.length; i++) {
    try {
      const body = event.Records[i].body;
      const message = JSON.parse(body);
      const objectKey = message.Records[0].s3.object.key;
      const bucketName = message.Records[0].s3.bucket.name || SOURCE_BUCKET_NAME;
      const fileName = objectKey.split("/").pop();
      const fileNameWithoutExt = fileName.split(".")[0];

      console.log(`Processing image: ${fileName}`);

      // Generate all image variants (thumbnails + full-screen versions)
      const processedImages = await processAllImageVariants(bucketName, objectKey);

      // Upload all variants to S3
      const uploadPromises = processedImages.map(async (image) => {
        const imageKey = `processed/${fileNameWithoutExt}_${image.suffix}.webp`;
        await uploadFile(THUMBNAIL_BUCKET_NAME, imageKey, image.buffer, image.contentType);
        return {
          key: imageKey,
          suffix: image.suffix
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      console.log(`Uploaded ${uploadedImages.length} image variants for ${fileName}`);

      // Update DynamoDB with all image variants
      const PK = fileNameWithoutExt;
      const item = await getItemFromDDB(PK);

      if (item && item.length > 0) {
        // Find uploaded images with validation
        const mediumImage = uploadedImages.find(img => img.suffix === 'medium');
        const largeImage = uploadedImages.find(img => img.suffix === 'large');

        // Validate that both images were processed successfully
        if (!mediumImage || !largeImage) {
          console.error(`Missing image variants for ${fileName}:`, {
            medium: !!mediumImage,
            large: !!largeImage,
            uploadedImages: uploadedImages.map(img => img.suffix)
          });
          throw new Error(`Failed to generate required image variants for ${fileName}`);
        }

        // Create simplified image data object with validated values
        const imageData = {
          medium: mediumImage.key,
          large: largeImage.key,
          processedAt: new Date().toISOString()
        };

        console.log(`Updating DDB with imageData:`, imageData);
        await updateItemInDDB(PK, item[0].SK, imageData);

        const user = item[0].SK.split("#")[1];
        await createUserObj(user);
      } else {
        console.error(`No DDB item found for PK: ${PK}`);
      }

    } catch (error) {
      console.error(`Error processing record ${i}:`, error);
    }
  }
};

const uploadFile = async (bucket, key, buffer, contentType) => {
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
};

const getItemFromDDB = async (PK) => {
  const params = {
    TableName: DDB_TABLE_NAME,
    IndexName: "entityType-PK-index",
    KeyConditionExpression: "entityType = :entityType and PK = :pkval",
    ExpressionAttributeValues: {
      ":pkval": PK,
      ":entityType": "IMAGE",
    },
  };
  try {
    const data = await documentClient.query(params);
    return data.Items;
  } catch (error) {
    console.error("Error", error);
    return [];
  }
};

const updateItemInDDB = async (PK, SK, imageData) => {
  // Add removeUndefinedValues option to handle any potential undefined values
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

  try {
    return await documentClient.update(params);
  } catch (error) {
    console.error("DDB Update Error:", error);
    console.error("Params:", JSON.stringify(params, null, 2));
    throw error;
  }
};

async function createUserObj(user) {
  try {
    const preferredUsername = await getUserFromCognito(user);

    const userInsertParam = {
      TableName: DDB_TABLE_NAME,
      Item: {
        PK: user,
        SK: user,
        entityType: "USER",
        username: preferredUsername,
        email: user
      },
      ConditionExpression: "attribute_not_exists(PK)"
    };
    await documentClient.put(userInsertParam);
  } catch (error) {
    if (error.name !== 'ConditionalCheckFailedException') {
      console.error("Error in creating user Obj", error);
    }
  }
}