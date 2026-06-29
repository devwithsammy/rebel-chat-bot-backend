# Rebel Chat Bot API

## Overview
This is the backend API for the Rebel Chat Bot, built with NestJS and TypeScript. It leverages Mongoose for MongoDB database interactions and Passport.js for handling authentication via JWT and Google OAuth.

## Features
- **NestJS**: A progressive Node.js framework for building efficient, reliable and scalable server-side applications.
- **Mongoose**: An Object Data Modeling (ODM) library for MongoDB, providing a schema-based solution to model application data.
- **Passport.js**: Authentication middleware implementing Google OAuth 2.0 and JSON Web Token (JWT) strategies for secure access.
- **OpenRouter AI**: Integrates with the OpenRouter API to provide generative AI chat completions.
- **Class-Validator**: Decorator-based validation to ensure incoming request data is well-formed.
- **Security**: Implements `helmet` for protection against common web vulnerabilities, `express-mongo-sanitize` to prevent NoSQL injection, and `@nestjs/throttler` for rate limiting.

## Getting Started
### Installation
1.  **Clone the repository**
    ```bash
    git clone https://github.com/devwithsammy/rebel-chat-bot-be.git
    cd rebel-chat-bot-be
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up environment variables**
    Create a `.env` file in the root directory and add the variables listed below.

4.  **Run the development server**
    ```bash
    npm run dev
    ```
    The server will be running on `http://localhost:5000` (or the port specified in your `.env` file).

### Environment Variables
You must create a `.env` file in the root of the project and populate it with the following variables:

```env
# Application Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://your-production-frontend.com

# MongoDB Configuration
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net
DB_USER=your_db_username
DB_PASSWORD=your_db_password

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=30d

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/redirect

# OpenRouter AI
OPENROUTER_KEY=your_openrouter_api_key
```

## API Documentation
### Base URL
`/api/v1`

### Endpoints
#### GET /ping
**Description**: Checks the health of the API server.

**Request**:
No payload required.

**Response**:
```json
{
  "status": "success",
  "message": "Server running"
}
```

**Errors**:
- N/A

---

#### GET /auth/google
**Description**: Initiates the Google OAuth 2.0 authentication flow. This endpoint redirects the user to the Google login page.

**Request**:
No payload required.

**Response**:
- A redirect to the Google authentication screen.

**Errors**:
- N/A

---

#### GET /auth/google/redirect
**Description**: Handles the callback from Google after successful authentication. It creates or validates the user, generates a JWT, and redirects to the frontend with the token.

**Request**:
Google provides the authorization code in the query parameters.

**Response**:
- A redirect to the `FRONTEND_URL` specified in the environment variables, with the token and user data as query parameters.
  `[FRONTEND_URL]/auth/callback?token=[JWT]&user=[ENCODED_USER_JSON]&message=login_success`

**Errors**:
- A redirect to `[FRONTEND_URL]/login?error=no_user` if Google does not provide user information.

---

#### GET /auth/profile
**Description**: Retrieves the profile of the currently authenticated user. Requires a valid JWT.

**Request**:
**Headers**:
- `Authorization`: `Bearer <your_jwt_token>`

No payload required.

**Response**:
```json
{
    "success": true,
    "message": "User profile",
    "data": {
        "id": "60d0fe4f5311236168a109ca",
        "email": "user@example.com",
        "firstName": "John",
        "picture": "https://lh3.googleusercontent.com/a-/AOh14Gj...=",
        "googleId": "109876543210987654321",
        "createdAt": "2023-10-27T10:00:00.000Z",
        "updatedAt": "2023-10-27T10:00:00.000Z"
    }
}
```

**Errors**:
- `401 Unauthorized`: If the JWT is missing or invalid.
- `404 Not Found`: If the user associated with the token cannot be found.

---

#### POST /conversation
**Description**: Starts a new chat conversation or continues an existing one. If `conversationId` is omitted, a new conversation is created. Requires a valid JWT.

**Request**:
**Headers**:
- `Authorization`: `Bearer <your_jwt_token>`

**Payload**:
```json
{
  "prompt": "Hello, what can you do?",
  "conversationId": "optional-uuid-for-existing-conversation"
}
```

**Response**:
```json
{
    "conversationId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "reply": "I am an AI assistant. I can help you with a variety of tasks!",
    "context": [
        {
            "role": "user",
            "content": "Hello, what can you do?",
            "timestamp": "2023-10-27T10:05:00.000Z",
            "_id": "..."
        },
        {
            "role": "assistant",
            "content": "I am an AI assistant. I can help you with a variety of tasks!",
            "timestamp": "2023-10-27T10:05:01.000Z",
            "_id": "..."
        }
    ]
}
```

**Errors**:
- `400 Bad Request`: If the `prompt` is empty or validation fails.
- `401 Unauthorized`: If the JWT is missing or invalid.
- `500 Internal Server Error`: If the OpenRouter API call fails.

---

#### GET /conversation/user
**Description**: Fetches a list of all conversations for the authenticated user, showing a summary of each. Requires a valid JWT.

**Request**:
**Headers**:
- `Authorization`: `Bearer <your_jwt_token>`

No payload required.

**Response**:
```json
[
    {
        "conversationId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "lastUserMessage": "What's the weather like today?",
        "lastAssistantMessage": "I'm sorry, I cannot provide real-time weather information.",
        "createdAt": "2023-10-27T10:00:00.000Z",
        "updatedAt": "2023-10-27T10:15:00.000Z"
    },
    {
        "conversationId": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
        "lastUserMessage": "Hello there.",
        "lastAssistantMessage": "Hi! How can I help you today?",
        "createdAt": "2023-10-26T08:00:00.000Z",
        "updatedAt": "2023-10-26T08:05:00.000Z"
    }
]
```

**Errors**:
- `401 Unauthorized`: If the JWT is missing or invalid.

---

#### GET /conversation/:conversationId
**Description**: Retrieves the full message history for a specific conversation. Requires a valid JWT.

**Request**:
**Headers**:
- `Authorization`: `Bearer <your_jwt_token>`

**Path Parameters**:
- `conversationId`: The unique identifier of the conversation.

No payload required.

**Response**:
```json
[
    {
        "role": "user",
        "content": "Hello there.",
        "timestamp": "2023-10-26T08:00:00.000Z",
        "_id": "..."
    },
    {
        "role": "assistant",
        "content": "Hi! How can I help you today?",
        "timestamp": "2023-10-26T08:00:01.000Z",
        "_id": "..."
    }
]
```

**Errors**:
- `400 Bad Request`: If the conversation is not found.
- `401 Unauthorized`: If the JWT is missing or invalid, or if the user does not own the conversation.