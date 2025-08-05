const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const sqsClient = new SQSClient();

const { SQS_URL, DDB_TABLE_NAME } = process.env;

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient();
const ddbDocClient = DynamoDBDocument.from(client);

exports.handler = async (event) => {
  const s3Event = event.Records[0].Sns.Message;
  const s3Message = JSON.parse(s3Event);

  const objectKey = s3Message.Records[0].s3.object.key;
  // const fileName = objectKey.split("/")[1];

  // const PK = fileName.split(".")[0];
  // const queryItems = await getPKandSK(PK);

  // const user = queryItems.SK.split("#")[1];
  // await createUserObj(user);

  const sqsMessage = {
    bucketName: s3Message.Records[0].s3.bucket.name,
    objectKey: objectKey,
  };

  console.log(JSON.stringify(sqsMessage));

  const sendMessageCommand = new SendMessageCommand({
    QueueUrl: SQS_URL,
    MessageBody: JSON.stringify(sqsMessage),
    MessageGroupId: sqsMessage.bucketName,
    MessageDeduplicationId: sqsMessage.objectKey,
  });

  await sqsClient.send(sendMessageCommand);

  return {
    statusCode: 200,
    body: "Message sent to SQS",
  };
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
  //   console.error("Error in creating user Obj", error);
  // }
}

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
