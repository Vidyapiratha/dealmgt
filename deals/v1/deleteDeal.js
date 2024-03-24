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

module.exports.deleteDeal = async (event) => {
  if (!event.pathParameters || !event.pathParameters.dealId) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({
        error: "dealId is required in the path parameters",
      }),
    };
  }

  const { dealId } = event.pathParameters;

  // First check if the item exists
  const getParams = {
    TableName: process.env.DYNAMODB_DEAL_TABLE,
    Key: {
      primary_key: dealId,
    },
  };

  try {
    const getResult = await dynamoDb.get(getParams).promise();
    if (!getResult.Item) {
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        body: JSON.stringify({
          error: `Deal with the specified dealId "${dealId}" is not found.`,
        }),
      };
    }

    const deleteParams = {
      TableName: process.env.DYNAMODB_DEAL_TABLE,
      Key: {
        primary_key: dealId,
      },
      ReturnValues: "ALL_OLD",
    };

    await dynamoDb.delete(deleteParams).promise();
    return {
      statusCode: HTTP_STATUS.OK,
      body: JSON.stringify({ message: "Deal successfully deleted" }),
    };
  } catch (err) {
    console.error("Error in operation", err);
    let errorResponse = {
      error: "Could not complete the operation due to internal error.",
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
