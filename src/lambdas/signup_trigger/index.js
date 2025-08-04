const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocument.from(client);

const { DDB_TABLE_NAME, DEFAULT_UPLOAD_LIMIT = "100" } = process.env;

exports.handler = async (event) => {
  console.log(event);
  const email = event.request.userAttributes.email;
  await insertToDDB(email);
  return event;
};

//using aws sdk v3 documentdb client insert to ddb
const insertToDDB = async (userName) => {
  const item = {
    PK: `LIMIT#${userName}`,
    SK: userName,
    entityType: "DEFAULT_LIMIT",
    limit: parseInt(DEFAULT_UPLOAD_LIMIT, 100),
  };
  const params = {
    TableName: DDB_TABLE_NAME,
    Item: item,
  };
  const res = await docClient.put(params);
  console.log(res);
  return res;
};
