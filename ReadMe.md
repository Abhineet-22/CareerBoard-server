# CareerBoard — Server

> A RESTful Node.js / Express backend powering the CareerBoard job-board platform. It handles authentication for two distinct user roles (Candidate & Recruiter), full CRUD for job postings, resume uploads, and job applications — all backed by MongoDB Atlas.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [API Reference](#api-reference)
  - [Auth Routes](#auth-routes-apiauth)
  - [Job Routes](#job-routes-apijobs)
  - [Application Routes](#application-routes-apiapplications)
- [Middleware](#middleware)
- [Security](#security)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Server](#running-the-server)
- [CORS Configuration](#cors-configuration)
- [File Uploads](#file-uploads)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)

---

## Overview

CareerBoard Server is the backend API for a full-stack job board application. It supports two user types:

- **Recruiters** — can register, log in, post job listings, update or delete their own jobs, and view applications submitted to those jobs.
- **Candidates** — can register, log in, browse job listings, and submit applications with a resume file upload.

The server exposes a clean JSON API consumed by a React frontend (deployed at `https://career-board-client.vercel.app`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express v5 |
| Database | MongoDB via Mongoose v9 |
| Authentication | JSON Web Tokens (`jsonwebtoken`) |
| Password Hashing | `bcryptjs` |
| Validation | `express-validator` |
| File Uploads | `multer` |
| Rate Limiting | `express-rate-limit` |
| Dev Server | `nodemon` |
| Environment | `dotenv` |

---

## Project Structure

```
CareerBoard-server/
├── index.js                  # App entry point — Express setup, DB connection, route mounting
├── package.json
│
├── routes/
│   ├── auth.js               # Register, login, /me
│   ├── jobs.js               # Job CRUD (list, create, update, delete)
│   └── applications.js       # Application submission and retrieval
│
├── models/
│   ├── Candidate.js          # Mongoose schema for candidate users
│   ├── Recruiter.js          # Mongoose schema for recruiter users
│   ├── Job.js                # Mongoose schema for job postings
│   └── Application.js        # Mongoose schema for job applications
│
├── middleware/
│   ├── auth.js               # JWT verification — requireAuth & requireRole
│   ├── rateLimit.js          # Rate limiter configs for API, auth, and applications
│   └── uploads.js            # Multer config for resume file uploads
│
└── uploads/                  # Auto-created at startup; stores uploaded resume files
```

---

## Data Models

### Candidate

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, trimmed |
| `email` | String | Required, unique, lowercase |
| `password` | String | Required, bcrypt-hashed |
| `role` | String | Enum: `"Candidate"` (default) |
| `createdAt` / `updatedAt` | Date | Auto-managed |

### Recruiter

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, trimmed |
| `email` | String | Required, unique, lowercase |
| `password` | String | Required, bcrypt-hashed |
| `role` | String | Enum: `"Recruiter"` (default) |
| `createdAt` / `updatedAt` | Date | Auto-managed |

### Job

| Field | Type | Notes |
|---|---|---|
| `recruiterId` | ObjectId | Ref: `Recruiter` — set server-side from JWT |
| `companyName` | String | Required, 2–80 chars |
| `website` | String | Optional |
| `industry` | String | Required |
| `companySize` | String | Required |
| `contactEmail` | String | Required, valid email |
| `jobTitle` | String | Required, 3–120 chars |
| `category` | String | Required |
| `experienceLevel` | String | Required |
| `description` | String | Required, 80–1200 chars |
| `skills` | [String] | Required, array of strings |
| `jobType` | String | Required (e.g. Full-time, Part-time) |
| `workArrangement` | String | Required (e.g. Remote, Hybrid, On-site) |
| `location` | String | Required, 2–120 chars |
| `salaryMin` / `salaryMax` | Number | Optional |
| `currency` | String | Default: `"INR"` |
| `notes` | String | Optional, max 500 chars |
| `createdAt` / `updatedAt` | Date | Auto-managed |

### Application

| Field | Type | Notes |
|---|---|---|
| `jobId` | ObjectId | Ref: `Job` — required |
| `firstName` / `lastName` | String | Required |
| `email` | String | Required, valid email |
| `phone` | String | Required |
| `location` | String | Required |
| `linkedin` | String | Optional |
| `portfolio` | String | Optional |
| `resumePath` | String | Path to uploaded file — required |
| `totalExp` | String | Required |
| `currentRole` | String | Required |
| `currentCompany` | String | Required |
| `skills` | [String] | Parsed from JSON string in form data |
| `noticePeriod` | String | Required |
| `expectedSalary` | String | Optional |
| `coverMessage` | String | Required, min 100 chars |
| `referral` / `referralName` | String | Optional |
| `createdAt` / `updatedAt` | Date | Auto-managed |

---

## API Reference

All routes are prefixed with `/api`. All protected routes require the header:

```
Authorization: Bearer <jwt_token>
```

---

### Auth Routes `/api/auth`

> All auth routes are subject to the **auth rate limiter** (25 requests / 15 min per IP).

#### `POST /api/auth/register`

Register a new user (Candidate or Recruiter).

**Request body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "Candidate"
}
```

| Field | Rules |
|---|---|
| `name` | Min 2 characters |
| `email` | Valid email |
| `password` | Min 6 characters |
| `role` | `"Candidate"` or `"Recruiter"` |

**Success `201`:**

```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "Candidate" }
}
```

**Errors:** `400` validation errors · `409` email already registered

---

#### `POST /api/auth/login`

Log in an existing user.

**Request body:**

```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Success `200`:**

```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "Candidate" }
}
```

**Errors:** `400` validation errors · `401` invalid credentials

---

#### `GET /api/auth/me` 🔒

Returns the currently authenticated user's profile. Requires a valid JWT.

**Success `200`:**

```json
{ "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "Candidate" }
```

**Errors:** `401` missing/invalid token · `404` user not found

---

### Job Routes `/api/jobs`

#### `GET /api/jobs` 🔒

List all jobs. Candidates see all jobs; Recruiters see only their own. Supports multiple query filters.

**Query parameters (all optional):**

| Parameter | Description | Supports multi-value? |
|---|---|---|
| `category` | Filter by job category | Yes (comma-separated) |
| `location` | Regex search on location field | No |
| `experience` | Filter by experience level | Yes (comma-separated) |
| `type` | Filter by job type | Yes (comma-separated) |
| `workArrangement` (or `arrangement`) | Filter by work arrangement | Yes (comma-separated) |
| `q` | Full-text search across `jobTitle`, `companyName`, `skills` | No |

**Example:**

```
GET /api/jobs?category=Engineering&experience=Senior,Mid&q=react
```

**Success `200`:** Array of job objects sorted by `createdAt` descending.

---

#### `GET /api/jobs/mine` 🔒 (Recruiter only)

Returns all jobs posted by the authenticated recruiter.

---

#### `POST /api/jobs` 🔒 (Recruiter only)

Create a new job posting. `recruiterId` is set automatically from the JWT.

**Request body:** All required Job fields (see [Job model](#job) above).

**Success `201`:** The created job object.

**Errors:** `400` validation errors · `403` not a recruiter

---

#### `PUT /api/jobs/:id` 🔒 (Recruiter only)

Update an existing job. Only the recruiter who created the job can update it. All fields are optional in the request body.

**Updatable fields:** `companyName`, `website`, `industry`, `companySize`, `contactEmail`, `jobTitle`, `category`, `experienceLevel`, `description`, `skills`, `jobType`, `workArrangement`, `location`, `salaryMin`, `salaryMax`, `currency`, `notes`.

**Errors:** `400` validation · `403` not the owner · `404` not found

---

#### `DELETE /api/jobs/:id` 🔒 (Recruiter only)

Delete a job. Only the recruiter who created it may delete it.

**Success `200`:**

```json
{ "message": "Job deleted successfully." }
```

**Errors:** `403` not the owner · `404` not found

---

### Application Routes `/api/applications`

> Submission endpoint is subject to the **application rate limiter** (10 submissions / 1 hour per IP).

#### `POST /api/applications`

Submit a job application. Uses `multipart/form-data` to support file upload.

**Form fields:**

| Field | Type | Rules |
|---|---|---|
| `jobId` | String | Required |
| `firstName` | String | Required |
| `lastName` | String | Required |
| `email` | String | Required, valid email |
| `phone` | String | Required |
| `location` | String | Required |
| `linkedin` | String | Optional |
| `portfolio` | String | Optional |
| `resume` | File | Required — PDF, DOC, or DOCX, max 5 MB |
| `totalExp` | String | Required |
| `currentRole` | String | Required |
| `currentCompany` | String | Required |
| `skills` | JSON string | e.g. `'["React","Node.js"]'` |
| `noticePeriod` | String | Required |
| `expectedSalary` | String | Optional |
| `coverMessage` | String | Required, min 100 chars |
| `referral` | String | Optional |
| `referralName` | String | Optional |

**Success `201`:** The created application object.

**Errors:** `400` missing resume / invalid file type / file too large / validation errors

---

#### `GET /api/applications/:jobId`

Retrieve all applications for a specific job ID, sorted by `createdAt` descending.

**Success `200`:** Array of application objects.

---

## Middleware

### `middleware/auth.js`

Two exported middleware functions:

- **`requireAuth`** — Extracts the `Bearer` token from the `Authorization` header, verifies it against `JWT_SECRET`, and attaches `{ id, role, email }` to `req.user`. Returns `401` if missing or invalid.
- **`requireRole(role)`** — Factory that returns middleware asserting `req.user.role === role`. Returns `403` if the role doesn't match.

### `middleware/rateLimit.js`

Three named limiters:

| Limiter | Scope | Window | Max Requests |
|---|---|---|---|
| `apiLimiter` | All `/api/*` routes | 15 min | 300 |
| `authLimiter` | All `/api/auth/*` routes | 15 min | 25 |
| `applicationLimiter` | `POST /api/applications` | 60 min | 10 |

Headers follow the `RateLimit-*` standard (RFC draft); legacy `X-RateLimit-*` headers are disabled.

### `middleware/uploads.js`

Multer configuration for resume file uploads:

- **Storage:** `uploads/` directory at project root (auto-created on startup).
- **Filename:** `<timestamp><original_extension>` (e.g. `1713245600000.pdf`).
- **Allowed types:** `.pdf`, `.doc`, `.docx` — validated by both extension and MIME type.
- **Size limit:** 5 MB maximum.

---

## Security

- **Passwords** are hashed with `bcryptjs` (salt rounds: 10) before being stored; plaintext passwords are never saved.
- **JWTs** are signed with `JWT_SECRET` from the environment, expire after 7 days, and encode `role`, `email`, and `sub` (user ID).
- **Role-based access control** is enforced at the route level via `requireRole`.
- **Ownership checks** on job updates and deletes ensure recruiters can only modify their own postings.
- **Input validation** via `express-validator` prevents malformed data from reaching the database on all write endpoints.
- **CORS** is restricted to an explicit allowlist; unknown origins receive a 403-level CORS error.
- **Rate limiting** protects auth endpoints and application submissions against brute-force and spam.

> ⚠️ **Important:** Set a strong, unique `JWT_SECRET` in production. The fallback `'dev_jwt_secret_change_me'` in the source code is for local development only and must **never** be used in production.

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A **MongoDB Atlas** cluster (or local MongoDB instance)

### Installation

```bash
# Clone the repository
git clone https://github.com/Abhineet-22/CareerBoard-server.git
cd CareerBoard-server

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB connection string
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority

# JWT signing secret — use a long, random string in production
JWT_SECRET=your_super_secret_jwt_key

# Port for the Express server
PORT=5000

# (Optional) Additional allowed CORS origins, comma-separated
CORS_ORIGIN=https://your-frontend-domain.com
```

> The `uploads/` directory is created automatically on startup if it does not exist.

### Running the Server

```bash
# Development (auto-restarts on file changes via nodemon)
npm run dev

# Production
npm start
```

On successful startup you will see:

```
Connected to MongoDB Atlas
Server running on http://localhost:5000
```

---

## CORS Configuration

The server maintains an explicit allowlist of origins:

- `http://localhost:5173` (local Vite dev server)
- `https://career-board-client.vercel.app` (production frontend)
- Any additional origins specified in the `CORS_ORIGIN` environment variable (comma-separated)

Requests from unlisted origins are rejected with a CORS error. To add a custom origin, append it to the `CORS_ORIGIN` env variable — no code changes required.

---

## File Uploads

Uploaded resumes are stored locally under `uploads/` with a timestamp-based filename. In a production deployment you should consider replacing the local disk storage with a cloud object storage solution (e.g. AWS S3, Cloudinary) and serving resume downloads through a signed URL or a dedicated file-serving route.

---

## Rate Limiting

| Endpoint Group | Window | Limit | Purpose |
|---|---|---|---|
| All `/api/*` | 15 min | 300 req | General API protection |
| `/api/auth/*` | 15 min | 25 req | Brute-force login/register protection |
| `POST /api/applications` | 60 min | 10 req | Spam application prevention |

When a limit is exceeded the API responds with **HTTP 429** and a descriptive JSON error message.

---

## Error Handling

All route handlers follow a consistent error-response shape:

```json
{ "error": "Human-readable error message." }
```

Validation failures return **HTTP 400** with an `errors` array from `express-validator`:

```json
{
  "errors": [
    { "msg": "Invalid email", "path": "email", "location": "body" }
  ]
}
```

Multer file errors (size exceeded, invalid type) are caught by a dedicated error-handler middleware in `routes/applications.js` and converted to clean 400 responses.
