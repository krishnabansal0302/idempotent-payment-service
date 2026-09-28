# Idempotent Payment Service

A backend payment processing service built with Node.js, Express.js, and PostgreSQL, designed to demonstrate reliable payment handling with idempotency, authentication, payment attempts, failure handling, timeouts, and retries.

## Features

- JWT-based user authentication
- Secure password hashing with bcrypt
- Payment creation and status tracking
- Idempotency protection to prevent duplicate payments
- Mock payment provider for simulating:
  - Successful payments
  - Failed payments
  - Provider timeouts
- Payment retry mechanism for timed-out payments
- Payment attempt history
- Payment status and payment history APIs
- Request validation using express-validator
- PostgreSQL database with relational constraints
- Protected APIs using JWT authentication

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Password Hashing:** bcryptjs
- **Validation:** express-validator
- **API Testing:** Postman
- **Development:** Nodemon

## Architecture

```text
                         Client / Postman
                                |
                                v
                        +---------------+
                        |    Express    |
                        |     Server    |
                        +-------+-------+
                                |
                +---------------+---------------+
                |                               |
                v                               v
        Authentication                    Payment APIs
                |                               |
                v                               v
             JWT                         Payment Controller
                                                |
                            +-------------------+-------------------+
                            |                   |                   |
                            v                   v                   v
                       PostgreSQL       Mock Payment Provider    Retry Logic
                            |                   |
                            |           +-------+-------+
                            |           |       |       |
                            |         SUCCESS FAILURE TIMEOUT
                            |                   |
                            +-------------------+
Payment Flow

A payment starts in the PENDING state.

Create Payment
      |
      v
   PENDING
      |
      v
Mock Payment Provider
      |
      +------> SUCCESS ------> SUCCESS
      |
      +------> FAILURE ------> FAILED
      |
      +------> TIMEOUT ------> TIMEOUT
                                  |
                                  v
                                Retry
                                  |
                                  v
                               SUCCESS
Idempotency

Idempotency prevents the same payment request from creating multiple payments.

Each payment request requires an Idempotency-Key.

Example:

Idempotency-Key: payment-001

When a request arrives, the service checks whether the key already exists.

Request 1
   |
   | payment-001
   v
Create Payment #1


Request 2
   |
   | payment-001
   v
Existing payment found
   |
   v
Return Payment #1

The payments table also enforces a UNIQUE constraint on the idempotency key, providing database-level protection against duplicate keys.

Database Design
users

Stores registered users.

Column	Description
id	Primary key
name	User name
email	Unique email
password_hash	Hashed password
created_at	Account creation time
payments

Stores payment records.

Column	Description
id	Primary key
user_id	Payment owner
amount	Payment amount
currency	Currency code
status	Current payment status
idempotency_key	Unique request identifier
created_at	Creation timestamp
updated_at	Last update timestamp
payment_attempts

Stores every attempt made against a payment.

Column	Description
id	Primary key
payment_id	Related payment
attempt_number	Attempt sequence
status	Attempt result
provider_response	Mock provider response
created_at	Attempt timestamp
API Endpoints
Authentication
Register
POST /api/auth/register

Request:

{
  "name": "Krishna",
  "email": "krishna@test.com",
  "password": "password123"
}
Login
POST /api/auth/login

Request:

{
  "email": "krishna@test.com",
  "password": "password123"
}

Returns a JWT token used to access protected endpoints.

Payments

All payment endpoints require:

Authorization: Bearer <JWT_TOKEN>
Create Payment
POST /api/payments

Headers:

Idempotency-Key: payment-001

Request:

{
  "amount": 500,
  "currency": "INR"
}

Creates a payment with PENDING status.

Process Payment
POST /api/payments/:id/process

Request:

{
  "outcome": "SUCCESS"
}

Supported outcomes:

SUCCESS
FAILURE
TIMEOUT
Retry Payment
POST /api/payments/:id/retry

Retries a payment that is in the TIMEOUT state.

Get Payment
GET /api/payments/:id

Returns the payment and its attempt history.

Get Payment History
GET /api/payments

Returns all payments belonging to the authenticated user.

Validation

The API validates payment input before processing.

Examples:

amount <= 0        -> 400 Bad Request
invalid currency   -> 400 Bad Request
missing JWT        -> 401 Unauthorized
invalid JWT        -> 401 Unauthorized
missing idempotency key -> 400 Bad Request
Project Structure
idempotent-payment-service/
|
├── src/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   └── paymentController.js
│   │
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── paymentRoutes.js
│   │
│   ├── services/
│   │   └── mockPaymentProvider.js
│   │
│   └── server.js
│
├── database/
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── README.md

.env should never be committed to Git because it contains credentials and secrets.

Setup
1. Clone the repository
git clone <your-repository-url>
cd idempotent-payment-service
2. Install dependencies
npm install
3. Configure environment variables

Create a .env file:

PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_system
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=your_jwt_secret
4. Create the PostgreSQL database

Create:

payment_system

Then execute the SQL schema provided in the database/ directory.

5. Start the server

Development mode:

npm run dev

Production-style start:

npm start

The API will run at:

http://localhost:5000
Testing

The API was tested using Postman for:

User registration
User login
JWT authentication
Payment creation
Duplicate idempotency requests
Successful payments
Failed payments
Provider timeouts
Payment retries
Payment status
Payment history
Invalid payment amounts
Invalid currency values
Unauthorized requests
Key Design Concepts
Idempotency

Ensures that retrying the same payment request does not create duplicate payment records.

Authentication

JWT tokens identify authenticated users and protect payment APIs.

Payment Attempts

Every interaction with the payment provider is recorded separately, allowing the system to maintain an attempt history.

Retry Handling

Timed-out payments can be retried without creating a new payment record.

Database Constraints

PostgreSQL constraints provide an additional layer of data integrity, including unique idempotency keys and foreign-key relationships.

Future Improvements

Possible production-level improvements include:

Redis-based distributed idempotency handling
Real payment gateway integration
Asynchronous payment processing using a message queue
Webhooks for provider callbacks
Distributed locking
Rate limiting
Structured logging
Automated unit and integration tests
Docker-based deployment
CI/CD pipeline
License

This project is for educational and portfolio purposes.


