"use strict";
const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

module.exports.getDeal = async (event) => {
  // Validate the input
  if (!event.pathParameters || !event.pathParameters.dealId) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({
        error: "dealId is required in the path parameters",
      }),
    };
  }

  const { dealId } = event.pathParameters;

  const getParams = {
    TableName: process.env.DYNAMODB_DEAL_TABLE,
    Key: {
      primary_key: dealId,
    },
  };

  try {
    const result = await dynamoDb.get(getParams).promise();
    if (result.Item) {
      return {
        statusCode: HTTP_STATUS.OK,
        body: JSON.stringify(result.Item),
      };
    } else {
      return {
        statusCode: HTTP_STATUS.NOT_FOUND,
        body: JSON.stringify({ message: `Deal with ID ${dealId} not found` }),
      };
    }
  } catch (err) {
    console.error("Error in retrieving deal", err);

    let errorResponse = {
      error: "Could not retrieve deal due to internal error.",
    };
    let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;

    if (err.code === "ProvisionedThroughputExceededException") {
      errorResponse.error = "Request throttled. Please try again later.";
      statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
    } else if (err.code === "ValidationException") {
      errorResponse.error = "Invalid request parameters.";
      statusCode = HTTP_STATUS.BAD_REQUEST;
    }

    return {
      statusCode: statusCode,
      body: JSON.stringify(errorResponse),
    };
  }
};
