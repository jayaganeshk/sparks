const Sharp = require("sharp");
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");
const { createWriteStream } = require("fs");

const client = new DynamoDBClient();
const ddbDocClient = DynamoDBDocument.from(client);
const { DDB_TABLE_NAME } = process.env;
const s3Client = new S3Client();

exports.handler = async (event, context, callback) => {
  fs.mkdirSync("/tmp/originals", { recursive: true });
  fs.mkdirSync("/tmp/processed", { recursive: true });

  const objectKey = event.Records[0].s3.object.key;
  const fileName = objectKey.split("/")[1];
  const isDownloaded = await downloadFile(
    event.Records[0].s3.bucket.name,
    objectKey
  );

  if (isDownloaded) {
    const input_image = `/tmp/${objectKey}`;
    const processedImage = processImage(input_image);
    if (processedImage) {
      console.log("Image processed successfully");
      await uploadFile(
        event.Records[0].s3.bucket.name,
        `processed/${fileName}`,
        processedImage
      );
      const PK = fileName.split(".")[0];
      const queryItems = await getPKandSK(PK);
      const SK = queryItems.SK;
      const newS3Key = `processed/${fileName}`;
      await updateS3Key(PK, SK, newS3Key);
      const user = queryItems.SK.split("#")[1];
      await createUserObj(user);
    } else {
      console.log("Image processing failed");
    }
  }
};

const processImage = (input_image) => {
  try {
    const image = Sharp(input_image);
    const newImage = image.jpeg({ quality: 50 }).withMetadata();
    return newImage;
  } catch (e) {
    console.log(e);
    return false;
  }
};

const downloadFile = async (bucket, key) => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  const tmpFilePath = `/tmp/${key}`;
  try {
    const { Body } = await s3Client.send(new GetObjectCommand(params));
    const fileStream = createWriteStream(tmpFilePath);
    Body.pipe(fileStream);
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};

const uploadFile = async (bucket, key, fileStream) => {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
    },
  });
  await upload.done();
};

const getPKandSK = async (PK) => {
  const params = {
    TableName: DDB_TABLE_NAME,
    IndexName: "entityType-PK-index",
    KeyConditionExpression: "entityType = :entityType and PK = :PK",
    ExpressionAttributeValues: {
      ":entityType": "IMAGE",
      ":PK": PK,
    },
  };
  const result = await ddbDocClient.query(params);
  return result.Items[0];
};

const updateS3Key = async (PK, SK, newS3Key) => {
  const params = {
    TableName: DDB_TABLE_NAME,
    Key: {
      PK: PK,
      SK: SK,
    },
    UpdateExpression: "set s3Key = :s3Key",
    ExpressionAttributeValues: {
      ":s3Key": newS3Key,
    },
  };
  await ddbDocClient.update(params);
};

async function createUserObj(user) {
  // try {
  //   const userInsertParam = {
  //     TableName: DDB_TABLE_NAME,
  //     Item: {
  //       PK: user,
  //       SK: user,
  //       entityType: "USER",
  //     },
  //     ConditionExpression: "attribute_not_exists(PK)",
  //   };
  //   await ddbDocClient.put(userInsertParam);
  // } catch (error) {
  //   console.error("Error in creating user Obj");
  // }
}
