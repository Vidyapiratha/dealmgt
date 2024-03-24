"use strict";
const AWS = require("aws-sdk");

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  FORBIDDEN: 403,
};

module.exports.updateDeal = async (event) => {
  if (!event.pathParameters || !event.pathParameters.dealId) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({
        error: "dealId is required in the path parameters",
      }),
    };
  }

  if (!event.body) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({ error: "Request body is required" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({ error: "Request body must be valid JSON" }),
    };
  }

  // Check if dealOwnerId or dealName is being attempted to update
  if (body.dealOwnerId || body.dealName) {
    return {
      statusCode: HTTP_STATUS.FORBIDDEN,
      body: JSON.stringify({
        error: "dealOwnerId and dealName cannot be updated",
      }),
    };
  }

  if (
    body.dealValueInGWP &&
    (typeof body.dealValueInGWP !== "number" || body.dealValueInGWP <= 0)
  ) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({
        error: "dealValueInGWP must be a positive number",
      }),
    };
  }

  if (!body.dealDescription) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({ error: "dealDescription is required" }),
    };
  }

  const { dealId } = event.pathParameters;
  const currentTime = new Date().toISOString();

  const updateParams = {
    TableName: process.env.DYNAMODB_DEAL_TABLE,
    Key: { primary_key: dealId },
    UpdateExpression:
      "set dealDescription = :d, dealValueInGWP = :v, updatedTime = :u",
    ExpressionAttributeValues: {
      ":d": body.dealDescription,
      ":v": body.dealValueInGWP,
      ":u": currentTime,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamoDb.update(updateParams).promise();
    return {
      statusCode: HTTP_STATUS.OK,
      body: JSON.stringify({
        message: "Deal successfully updated",
        updatedAttributes: result.Attributes,
      }),
    };
  } catch (err) {
    console.error("Error in updating deal", err);
    let errorResponse = {
      error: "Could not update deal due to internal error.",
    };
    let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;

    switch (err.code) {
      case "ConditionalCheckFailedException":
        errorResponse.error = "Deal does not exist.";
        statusCode = HTTP_STATUS.NOT_FOUND;
        break;
      case "ProvisionedThroughputExceededException":
        errorResponse.error = "Request throttled. Please try again later.";
        statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
        break;
      case "ValidationException":
        errorResponse.error = "Invalid request parameters.";
        statusCode = HTTP_STATUS.BAD_REQUEST;
        break;
    }

    return {
      statusCode: statusCode,
      body: JSON.stringify(errorResponse),
    };
  }
};
