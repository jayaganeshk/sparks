const imageThumbnail = require("image-thumbnail");
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client } = require("@aws-sdk/client-s3");
const s3Client = new S3Client();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient();
const documentClient = DynamoDBDocument.from(client);

const { CLOUDFRONT_DOMAIN, DDB_TABLE_NAME, THUMBNAIL_BUCKET_NAME } = process.env;

async function generateThumbnail(imageURL) {
  try {
    let options = { percentage: 5 };
    const thumbnail = await imageThumbnail({ uri: imageURL, options });
    return thumbnail;
  } catch (err) {
    console.error(err);
  }
}

exports.handler = async (event) => {
  for (let i = 0; i < event.Records.length; i++) {
    const body = event.Records[i].body;
    const message = JSON.parse(body);
    const objectKey = message.Records[0].s3.object.key;
    const fileName = objectKey.split("/").pop();
    const url = `https://${CLOUDFRONT_DOMAIN}/${objectKey}`;
    const thumbnail = await generateThumbnail(url);
    await uploadFile(THUMBNAIL_BUCKET_NAME, `thumbnail/${fileName}`, thumbnail);
    const PK = fileName.split(".")[0];
    const item = await getItemFromDDB(PK);
    await updateItemInDDB(PK, item[0].SK, `thumbnail/${fileName}`);
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

const updateItemInDDB = async (PK, SK, fileKey) => {
  const params = {
    TableName: DDB_TABLE_NAME,
    Key: {
      PK,
      SK,
    },
    UpdateExpression: "SET thumbnailFileName = :fileKey",
    ExpressionAttributeValues: {
      ":fileKey": fileKey,
    },
  };
  return await documentClient.update(params);
};
