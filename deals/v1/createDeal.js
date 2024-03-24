"use strict";
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  TOO_MANY_REQUESTS: 429,
  CONFLICT: 409,
};

const validateRequestBody = (body) => {
  const requiredFields = [
    "dealOwnerId",
    "dealName",
    "dealDescription",
    "dealValueInGWP",
  ];
  for (const field of requiredFields) {
    if (!body[field]) {
      return `${field} is required`;
    }
  }

  if (typeof body.dealValueInGWP !== "number" || body.dealValueInGWP <= 0) {
    return "dealValueInGWP must be a positive number";
  }

  return null;
};

const checkDealUniqueness = async (dealOwnerId, dealName) => {
  const queryParams = {
    TableName: process.env.DYNAMODB_DEAL_TABLE,
    IndexName: "DealOwnerIndex",
    KeyConditionExpression: "dealOwnerId = :dealOwnerId",
    FilterExpression: "dealName = :dealName",
    ExpressionAttributeValues: {
      ":dealOwnerId": dealOwnerId,
      ":dealName": dealName,
    },
  };

  const result = await dynamoDb.query(queryParams).promise();
  return result.Items.length === 0;
};

module.exports.createDeal = async (event) => {
  console.log("Starting execution");

  if (!process.env.DYNAMODB_DEAL_TABLE) {
    console.error("Environment variable DYNAMODB_DEAL_TABLE not set");
    return {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: "Server configuration error." }),
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

  const validationError = validateRequestBody(body);
  if (validationError) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: JSON.stringify({ error: validationError }),
    };
  }

  const isUnique = await checkDealUniqueness(body.dealOwnerId, body.dealName);
  if (!isUnique) {
    return {
      statusCode: HTTP_STATUS.CONFLICT,
      body: JSON.stringify({
        error: `Deal with the name "${body.dealName}" already exists for this owner.`,
      }),
    };
  }

  const currentTime = new Date().toISOString();
  const dealId = uuidv4();
  const putParams = {
    TableName: process.env.DYNAMODB_DEAL_TABLE,
    Item: {
      primary_key: dealId,
      dealOwnerId: body.dealOwnerId,
      dealName: body.dealName,
      dealDescription: body.dealDescription,
      dealValueInGWP: body.dealValueInGWP,
      createdTime: currentTime,
      updatedTime: currentTime, // Same as createdTime on creation
    },
  };

  try {
    await dynamoDb.put(putParams).promise();
    console.log(`Deal ${dealId} successfully created`);
    return {
      statusCode: HTTP_STATUS.CREATED,
      body: JSON.stringify({
        message: "Deal successfully created",
        dealId: dealId,
        createdTime: currentTime,
      }),
    };
  } catch (err) {
    console.error("Error in creating deals", err);
    let errorResponse = {
      error: "Could not create deal due to internal error.",
    };
    let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;

    switch (err.code) {
      case "ProvisionedThroughputExceededException":
        errorResponse.error = "Request throttled. Please try again later.";
        statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
        break;
      case "ValidationException":
        errorResponse.error = "Invalid deal data format.";
        statusCode = HTTP_STATUS.BAD_REQUEST;
        break;
    }
    return {
      statusCode,
      body: JSON.stringify(errorResponse),
    };
  }
};
