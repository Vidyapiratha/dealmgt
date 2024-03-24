"use strict";
const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  TOO_MANY_REQUESTS: 429,
};

module.exports.getDealsByOwner = async (event) => {
  if (
    !event.queryStringParameters ||
    !event.queryStringParameters.dealOwnerId
  ) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({
        error: "dealOwnerId query parameter is required",
      }),
    };
  }

  const { dealOwnerId } = event.queryStringParameters;

  const queryParams = {
    TableName: process.env.DYNAMODB_DEAL_TABLE,
    IndexName: "DealOwnerIndex",
    KeyConditionExpression: "dealOwnerId = :dealOwnerId",
    ExpressionAttributeValues: {
      ":dealOwnerId": dealOwnerId,
    },
  };

  try {
    const result = await dynamoDb.query(queryParams).promise();
    console.log(result);
    return {
      statusCode: HTTP_STATUS.OK,
      body: JSON.stringify(result.Items),
    };
  } catch (err) {
    console.error("Error in querying deals by owner", err);

    let errorResponse = {
      error: "Could not retrieve deals due to internal error.",
    };
    let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;

    switch (err.code) {
      case "ProvisionedThroughputExceededException":
        errorResponse.error = "Request throttled. Please try again later.";
        statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
        break;
      case "ValidationException":
        errorResponse.error = "Invalid query parameters.";
        statusCode = HTTP_STATUS.BAD_REQUEST;
        break;
    }

    return {
      statusCode: statusCode,
      body: JSON.stringify(errorResponse),
    };
  }
};
