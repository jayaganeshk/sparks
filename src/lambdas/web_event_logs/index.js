exports.handler = (event) => {
  try {
    const ip = event.requestContext.http.sourceIp;
    const userAgent = event.requestContext.http.userAgent;
    const eventBody = JSON.parse(event.body);
    const logObj = {
      ip,
      userAgent,
      eventBody,
    };
    console.log(logObj);
    return {
      statusCode: 200,
    };
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
    };
  }
};
