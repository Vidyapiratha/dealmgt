# Deal Management Application API

## Description

This project is aimed at implementing CRUD (Create, Read, Update, Delete) operations for a Deals Management Application. It provides functionality to manage deal records through an API, facilitating the creation, retrieval, update, and deletion of deal information in a cloud-based environment. The application is developed using the Serverless Framework with Node.js and AWS services, including Lambda for business logic execution, API Gateway for API management, and DynamoDB as the NoSQL database solution.

## Features

- CRUD Operations: Supports creating, reading, updating, and deleting deal records.

- Deal Record Attributes: Each deal includes a unique identifier (dealId), an owner identifier (dealOwnerId), a deal name (dealName), a description (dealDescription), and the deal's value in GWP (dealValueInGWP).

- A secondary index

## Data Integrity and Business Rules Assumptions

- Unique Deal Names per Owner: To ensure data integrity and prevent confusion, the application enforces a unique constraint on deal names within the scope of a single owner. This means that the same dealOwnerId cannot have multiple deals with the same dealName. This constraint is validated upon deal creation and updating, ensuring that each deal name is unique for its owner. A system generated uuid - `dealId` is used as the primary key in the system.

- Immutability of Owner ID and Deal Name: Once a deal is created, its `dealOwnerId` and `dealName` cannot be changed. This rule supports maintaining consistent deal ownership and identification throughout the lifecycle of each deal. Attempts to modify these fields during an update operation will result in an error, reinforcing the integrity of deal records. To look up based on `dealOwnerId` a Global Secondary Index (GSI)was created as `dealOwnerId` is not a primary key.

## Setup and Deployment

### Prerequisites

- Node.js

- Serverless Framework

### Configuration

1.  **Install Node.js dependencies**:

```bash
npm  install
```

2.  **Install Serverless dependencies**:

```bash
npm install -g serverless
```

3.  **Deploy to AWS**:

```bash
serverless  deploy
```

## Authentication and Authorization

The Deal Management Application API utilizes AWS IAM (Identity and Access Management) for authentication and authorization, ensuring that API access is securely controlled and managed. This method leverages AWS's robust security infrastructure to authenticate users and authorize operations based on IAM roles and policies.

### Configuring IAM Policies

To interact with the API, clients must have AWS credentials associated with an IAM user or role that has been granted the necessary permissions. The Serverless Framework automatically configures the necessary permissions for the Lambda functions to interact with DynamoDB and other AWS services as defined in the `serverless.yml`.
To set up authentication for your API using AWS IAM and accessing it via tools like Postman, follow these detailed steps:

#### Step 1: Create an IAM User and Grant CLI Access

1. **Sign in to the AWS Management Console** and open the IAM console at https://console.aws.amazon.com/iam/.
2. **Navigate to Users** and choose "Add user". Enter a user name and select "Programmatic access" for the AWS access type. This enables an access key ID and secret access key for the AWS CLI, SDKs, and other development tools.
3. **Attach policies directly** to the user. For the purpose of invoking API Gateway endpoints, attach a policy with the `execute-api:Invoke` action. This grants the user permission to execute API Gateway actions. If you want to narrow down the permissions to specific APIs or stages, customize the policy accordingly.
   - Example policy allowing invocation of any API Gateway endpoint:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": "execute-api:Invoke",
           "Resource": "*"
         }
       ]
     }
     ```
4. **Review and create the user**. After the user is created, download the access key ID and secret access key. These credentials are used for programmatic access to AWS services.

#### Step 2: Use Postman with AWS Signature Authentication

1. **Open Postman** and create a new request or select an existing one.
2. **Set up AWS Signature Authentication**:
   - In the request's "Authorization" tab, choose "AWS Signature" as the type.
   - **Access Key**: Enter the access key ID you obtained when creating the IAM user.
   - **Secret Key**: Enter the secret access key associated with the access key ID.
   - **AWS Region**: Enter the AWS region where your API Gateway endpoint is deployed (e.g., `us-east-1`).
   - **Service Name**: Enter `execute-api` as this is the service name for Amazon API Gateway.
3. **Configure the Request**:
   - Enter the URL of the API Gateway endpoint you want to invoke.
   - Choose the appropriate HTTP method (GET, POST, etc.) based on the operation you're performing.

If you don't sepcify the Authentication you will receive `403-Forbidden error`

## Usage

### Create a Deal

- **Endpoint**: `POST v1/deals`

- **Payload**:

```json
{
  "dealDescription": "This deal is regarding S&P500",
  "dealOwnerId": "b50-41fc",
  "dealValueInGWP": 100000,
  "dealName": "S&P500-deal"
}
```

#### Response

- Successful response - 201

```json
{
  "message": "Deal successfully created",
  "dealId": "c9444fe8-10ea-48c8-b2c6-dfde9e5f5524",
  "createdTime": "2024-03-24T13:20:06.974Z"
}
```

- Deal with same name - 409

```json
{
  "error": "Deal with the name \"S&P500-deal\" already exists for this owner."
}
```

- Same request without dealValueInGWP in the request - 400

```json
{
  "error": "dealValueInGWP is required"
}
```

### Read a Deal

- **Endpoint**: `GET /deals/{dealId}`

#### Response

- Valid `dealId`

```json
{
  "dealDescription": "This deal is regarding S&P500",
  "primary_key": "c9444fe8-10ea-48c8-b2c6-dfde9e5f5524",
  "dealName": "S&P500-deal",
  "dealValueInGWP": 100000,
  "dealOwnerId": "b50-41fc",
  "createdTime": "2024-03-24T13:20:06.974Z",
  "updatedTime": "2024-03-24T13:20:06.974Z"
}
```

- InValid `dealId`

```json
{
  "message": "Deal with ID c9444fe8-10ea-48c8-b2c6-dfde9e5f552 not found"
}
```

### Update a Deal

- **Endpoint**: `PUT /deals/{dealId}`

- **Payload**:

```json
{
  "dealDescription": "This deal is regarding S&P500- updated",
  "dealValueInGWP": 200000
}
```

- **Response**:

Successful update - 200

```json
{
  "message": "Deal successfully updated",
  "updatedAttributes": {
    "dealDescription": "This deal is regarding S&P500- updated",
    "primary_key": "c9444fe8-10ea-48c8-b2c6-dfde9e5f5524",
    "dealName": "S&P500-deal",
    "dealOwnerId": "b50-41fc",
    "dealValueInGWP": 200000,
    "createdTime": "2024-03-24T13:20:06.974Z",
    "updatedTime": "2024-03-24T13:48:16.412Z"
  }
}
```

Trying to update dealOwnerId - 403

```json
{
  "error": "dealOwnerId and dealName cannot be updated"
}
```

### Delete a Deal

- **Endpoint**: `DELETE /deals/{dealId}`

#### Response

- Valid `dealId` - 200

```json
{
  "message": "Deal successfully deleted"
}
```

- InValid `dealId`

```json
{
  "error": "Deal with the specified dealId \"c9444fe8-10ea-48c8-b2c6-dfde9e5f5\" is not found."
}
```

### Filter Deals by Owner ID

- **Endpoint**: `GET /deals?dealOwnerId={ownerId}`

This is an optional endpoint to fetch all the deals for a specific dealOwner with the assumption that a deal owner can have multiple deals.

## REST API Principals

- For CRUD operations on individual deals, such as reading (GET), updating (PUT), and deleting (DELETE) a deal, the dealId is used as a path parameter. This is because these operations are intended to act on a single, specific deal resource, and the dealId uniquely identifies that resource.

- For filtering deals by the owner ID, a query parameter is used (GET /deals?dealOwnerId={ownerId}). This allows clients to retrieve a subset of deals based on certain criteria (in this case, the owner ID) without specifying a single, unique resource. Query parameters provide flexibility in retrieving data from a collection based on varying requirements.

- By including the version number (/v1/) in the path, we can easily manage and deploy new versions of your API (such as /v2/) in the future without affecting existing clients. When we introduce breaking changes, increment the version number in the path to signify a new version of the API that may not be backward compatible.

## Database Choice and Reasoning

The application uses AWS DynamoDB for its database needs. DynamoDB was chosen for its scalability, fully managed service, and seamless integration with AWS Lambda and the Serverless Framework. It supports the flexible schema required for the varied attributes of deal records.

As we are using Serverless Framework with Node.js, DynamoDB is a natural fit. It integrates seamlessly with AWS Lambda, allowing to build a fully serverless application that is easy to deploy, manage, and scale. This compatibility can significantly reduce operational complexity and cost.

DynamoDB supports a flexible schema. Each record (item) in a table can have any number of attributes (although there is a maximum limit on item size). This flexibility can be particularly useful in applications in this deal management system, where the data model might evolve over time when the business grows.

DynamoDB offers single-digit millisecond latency for read and write operations, which is crucial for applications requiring fast and consistent response times. For an application managing deals and sales, quick access to data can enhance user experience and operational efficiency.

We are not performing any complex join operations or dealing with rigid schemas. Hence the choice was to go forward with a nosql DB, and dynamo DB was selected as it fit in to the AWS eco system with all the above listed benefits.

Contributions are welcome. Please follow the standard fork and pull request workflow.

## Code Design decisions

### Seperate JS Files

The decision to organize the functions in separate JavaScript files was taken, because;

- Modularity: Easier to maintain and understand the codebase. Each function focuses on a single responsibility.

- Independent Deployment: You can update and deploy functions independently, which is useful if different functions change at different rates.

- Parallel Development: Teams can work on different functions simultaneously without much conflict or need for coordination.

- Avoid Deployment Overhead: Updating any part of the code requires redeploying all functions, even if only one function changed if we have all resources in one JS file. If we have seperate JS files we can deploy them seperately

As it is a small scale project tarting with a single file can be quick and convenient. As the project grows or this project is being worked in a team, separate files per function offer better organization, maintainability, and scalability.

Given the context of CRUD operations for a "deals" application, if the functions share a lot of common setup or utility code, starting in a single file could be reasonable. However, considering future expansion, ease of maintenance, and the benefits of modularity, separating functions into different files is generally advisable.

### HTTP API over Rest API

HTTP APIs are optimized for performance. They offer faster and more efficient API execution than REST APIs in API Gateway, For a Deals Management Application, where responsiveness can enhance user experience, the low-latency nature of HTTP APIs is advantageous.

HTTP APIs are generally more cost-effective than REST APIs. They come at a lower cost for API calls and data transfer, making them a budget-friendly option, especially for applications with high traffic. This cost efficiency does not come at the expense of scalability or reliability, making HTTP APIs a compelling option for a small scale project like this.
