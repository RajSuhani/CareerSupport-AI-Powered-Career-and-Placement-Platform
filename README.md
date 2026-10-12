# CareerSupport — AI-Powered Career and Placement Platform

**CareerSupport** is a production-minded full-stack web application designed for college students, new graduates, and entry-level software engineers to streamline their recruitment lifecycle. It bridges the gap between raw applications and interview callbacks by combining ATS resume scanning, a full CRUD Kanban job pipeline, interactive voice-enabled AI mock interviews, and a structured 25+ algorithmic pattern tracker.

---

## 1. Architecture Overview

```
                      ┌──────────────────────────────────────────┐
                      │    React 19 SPA + Tailwind CSS v4       │
                      │  (Dashboard, Kanban, ATS, Voice Mock)    │
                      └────────────────────┬─────────────────────┘
                                           │
                                 HTTP / JSON / Cookies
                                           │
                      ┌────────────────────▼─────────────────────┐
                      │       Express 4.x Full-Stack Server      │
                      │           (Node.js / tsx)                │
                      └──────┬──────────────────────┬────────────┘
                             │                      │
                   JWT Auth / Scoped CRUD    @google/genai SDK
                             │                 (gemini-3.8-flash)
                             │                      │
             ┌───────────────▼───────────┐    ┌─────▼────────────────┐
             │   Relational JSON Engine   │    │ Google Gemini Engine │
             │ (Atomic Commit Storage)   │    │ (Structured Schema)  │
             └───────────────────────────┘    └──────────────────────┘
```

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Canvas-Confetti.
- **Backend**: Express 4.x running in tandem with Vite development middleware and static production serving.
- **Authentication**: JWT token verification via `Authorization: Bearer <token>` or HTTP-only cookies, combined with salted `bcryptjs` password hashing.
- **Database**: Relational schema persistence with atomic transactions, user-level isolation, and auto-seeding.
- **AI Engine**: `@google/genai` TypeScript SDK invoking `gemini-3.8-flash` with structured JSON schema guarantees and prompt injection defense.
- **Testing**: Automated test suite powered by Vitest.

---

## 2. Feature Checklist

| Module | Feature | Status |
|---|---|---|
| **Authentication** | Sign up, Sign in, Sign out, Session persistence | ✅ Implemented & Tested |
| **Authentication** | 1-Click Evaluator Demo Access | ✅ Implemented |
| **User Profile** | Target role, experience level, education, skills | ✅ Implemented & Tested |
| **Dashboard** | Genuine live metrics: funnel breakdown, streak, daily goals | ✅ Implemented & Tested |
| **Dashboard** | Recharts application stage distribution chart | ✅ Implemented |
| **Dashboard** | Overdue and upcoming reminder alerts | ✅ Implemented |
| **AI Resume Analyzer** | Upload PDF resumes with 5MB & mime validation | ✅ Implemented |
| **AI Resume Analyzer** | Server-side text parsing (`pdf-parse`) & text fallback | ✅ Implemented |
| **AI Resume Analyzer** | Untrusted document isolation & prompt injection defense | ✅ Implemented & Tested |
| **AI Resume Analyzer** | Match score, estimated ATS score, missing skills, STAR revisions | ✅ Implemented & Tested |
| **AI Resume Analyzer** | Historical scan review and deletion | ✅ Implemented & Tested |
| **Job Tracker** | Full CRUD (Create, Read, Update, Delete) | ✅ Implemented & Tested |
| **Job Tracker** | Kanban Board view with status shift and validation | ✅ Implemented |
| **Job Tracker** | Table view with search, status filters, and sorting | ✅ Implemented |
| **Job Tracker** | CSV export with protection against CSV formula injection (`=`, `+`, `-`, `@`) | ✅ Implemented & Tested |
| **Job Tracker** | Confirmation dialogs before irreversible deletions | ✅ Implemented |
| **AI Mock Interview** | Role-specific question generator by category & difficulty | ✅ Implemented |
| **AI Mock Interview** | Web Speech API microphone voice answering | ✅ Implemented |
| **AI Mock Interview** | Objective grading on relevance, clarity, structure & tech depth | ✅ Implemented |
| **AI Mock Interview** | Multi-question session summary report and persistence | ✅ Implemented |
| **DSA Tracker** | 25+ curated LeetCode algorithmic patterns | ✅ Implemented |
| **DSA Tracker** | Solved / In Progress / Not Started tracking + Confetti | ✅ Implemented & Tested |
| **DSA Tracker** | Personal revision notes modal & bookmarking | ✅ Implemented |
| **DSA Tracker** | Category & difficulty completion metrics | ✅ Implemented & Tested |

---

## 3. Database Schema & Entities

The platform manages the following relational models:

1. **User**: `id`, `name`, `email`, `passwordHash`, `targetRole`, `experienceLevel`, `skills[]`, `education`, timestamps.
2. **ResumeAnalysis**: `id`, `userId`, `fileName`, `targetJobRole`, `targetJobDescription`, `matchScore`, `atsScore`, `identifiedSkills[]`, `missingSkills[]`, `strengths[]`, `weaknesses[]`, `suggestedImprovements[]`, `keywordRecommendations[]`, `summary`, `createdAt`.
3. **JobApplication**: `id`, `userId`, `company`, `role`, `location`, `status` (`Saved` \| `Applied` \| `Assessment` \| `Interview` \| `Offer` \| `Rejected`), `applicationDate`, `salary`, `notes`, `followUpDate`, timestamps.
4. **InterviewSession**: `id`, `userId`, `targetRole`, `experienceLevel`, `category`, `difficulty`, `questionsCount`, `status`, `questions[]`, `overallScore`, `overallSummary`, timestamps.
5. **DsaProblem**: `id`, `title`, `category`, `difficulty`, `leetcodeNumber`, `practiceUrl`, `pattern`.
6. **UserDsaProgress**: `id`, `userId`, `problemId`, `status`, `notes`, `isBookmarked`, `solvedAt`, `lastRevisedAt`, `updatedAt`.

---

## 4. Security Hardening & Rate Limiting

### JWT Secret Validation & Lifecycle
- **Strict Startup Checks**: The server executes validation checks before serving requests (`server/config/secrets.ts`).
- **Production Guardrails**: When `NODE_ENV=production`, the application refuses to start and fails with a clear configuration error if:
  - `JWT_SECRET` is missing or empty.
  - `JWT_SECRET` matches known development placeholders or default tokens.
  - `JWT_SECRET` is shorter than 32 characters (HMAC-SHA256 recommendation).
- **Development Convenience**: In non-production environments (`NODE_ENV=development` or test), a default development secret is used if not explicitly configured in `.env`.
- **Generating a Secure Production Secret**:
  ```bash
  openssl rand -base64 32
  ```
  Set this value as the `JWT_SECRET` environment variable or Secret Manager secret in your production hosting platform (e.g. Google Cloud Run, GCP Secret Manager).

### Multi-Tier Rate Limiting
To defend against brute-force attacks, credential stuffing, and LLM API cost exhaustion, dedicated Express rate limiters protect public and AI-powered endpoints:

| Route Scope | Endpoints | Limit Window | Request Cap | Keying Strategy | Behavior on Breach |
|---|---|---|---|---|---|
| **Auth Operations** | `POST /api/auth/register`<br>`POST /api/auth/login` | 15 minutes | 10 attempts | Client IP (`req.ip`) | HTTP 429 with retry duration |
| **Demo Login** | `POST /api/auth/demo-login` | 15 minutes | 20 attempts | Client IP (`req.ip`) | HTTP 429 with retry duration |
| **Resume Analysis** | `POST /api/resumes/analyze` | 1 hour | 10 analyses | Authenticated `userId` (fallback IP) | HTTP 429 structured JSON |
| **Mock Interviews** | `POST /api/interviews/start` | 1 hour | 15 sessions | Authenticated `userId` (fallback IP) | HTTP 429 structured JSON |
| **Interview Answers**| `POST /api/interviews/:id/submit-answer` | 15 minutes | 30 evaluations | Authenticated `userId` (fallback IP) | HTTP 429 structured JSON |
| **Market Intelligence**| `POST /api/ai/market-research`<br>`POST /api/ai/chat` | 15 minutes | 25 queries | Authenticated `userId` (fallback IP) | HTTP 429 structured JSON |
| **Audio Transcription**| `POST /api/ai/transcribe` | 15 minutes | 20 transcriptions | Authenticated `userId` (fallback IP) | HTTP 429 structured JSON |

#### Multi-Instance Rate Limiting & Cloud Run Considerations
- The current implementation utilizes `express-rate-limit` with an in-memory counter on each process instance.
- **Single Instance**: Operates with exact counter enforcement.
- **Multiple Cloud Run Instances (Horizontal Scaling)**: Rate limits are enforced independently per container instance. If requests from an IP or user are distributed across $N$ instances by the load balancer, effective burst tolerance increases by a factor of $N$. For strict global cluster rate enforcement in high-scale multi-instance deployments, an external Redis store (`rate-limit-redis`) or Cloud Armor security policy at the Google Cloud HTTPS Load Balancer layer is recommended.
- **Reverse Proxy IP Trust**: The server configures `app.set('trust proxy', 1)` to accurately detect client IP addresses when deployed behind Cloud Run's Google Cloud Ingress without trusting arbitrary client spoofed headers.

### Additional Security Measures
- **Prompt Injection Defense**: Resume documents and user job descriptions are treated as untrusted user data. Prompts mandate that the model must not execute instructions found inside documents.
- **Tenant Isolation**: All database operations (`find`, `update`, `delete`) require matching `userId` from the verified JWT.
- **CSV Formula Neutralization**: Cells starting with `=`, `+`, `-`, or `@` are prefixed with `'` to prevent malicious spreadsheet macro execution upon export.
- **Input Validation**: Zod schemas validate both client inputs and server AI responses.
- **Zero API Key Leakage**: Neither the Gemini API key nor database internals are ever transmitted to the browser bundle.

---

## 5. Persistent Database Storage (PostgreSQL & Google Cloud SQL)

### The Cloud Run Ephemeral Filesystem Problem
On Google Cloud Run:
- Each container instance receives an **in-memory, ephemeral filesystem**.
- When traffic scales to zero, instances scale up/down, or new revisions deploy, any files written to `data/careersupport_db.json` are **erased**.
- Across multiple concurrently active instances, local files are isolated per container and **never synchronized**.

To provide durable, reliable data persistence across deployment lifecycles and horizontal scaling, CareerSupport features a production-ready **PostgreSQL / Google Cloud SQL** storage engine while preserving local JSON fallback for zero-setup offline development.

### Database Architecture
```
                           +----------------------------+
                           |  CareerSupport Web App     |
                           +--------------+-------------+
                                          |
                                          v
                           +----------------------------+
                           |    Unified IDatabase API   |
                           +--------------+-------------+
                                          |
                  +-----------------------+-----------------------+
                  |                                               |
  (If DATABASE_URL or PGHOST set)                   (Fallback / Local Dev)
                  v                                               v
+-----------------------------------+             +-------------------------------+
|  PostgresDatabase (pg.Pool)       |             |  JsonDatabaseAdapter          |
|  - PostgreSQL 13+                 |             |  - data/careersupport_db.json |
|  - Google Cloud SQL Unix socket   |             |  - Atomic rename persistence  |
|  - Connection pooling & SSL       |             |  - Zero external dependencies |
+-----------------------------------+             +-------------------------------+
```

### Relational Schema (`server/db/schema.sql`)
The PostgreSQL schema provides normalized relational tables, foreign key constraints with cascading deletes, JSONB support for complex payloads, and indexes for performant queries:

1. **`users`**: Unique email index, password hashes, candidate career preferences, and skills JSONB.
2. **`resume_analyses`**: Linked to `users(id)`, scores (ATS score, match score), identified/missing skills JSONB, suggestions.
3. **`job_applications`**: Linked to `users(id)`, company, role, application stage, dates, salary, notes.
4. **`interview_sessions`**: Linked to `users(id)`, category, difficulty, questions JSONB with rubric grading, scores.
5. **`dsa_problems`**: Curated catalog of 25 core entry-level DSA patterns across 9 topic categories.
6. **`user_dsa_progress`**: Composite unique key `(user_id, problem_id)`, status ('Not Started', 'In Progress', 'Solved'), bookmarks, and revision timestamps.
7. **`user_activities`**: Linked to `users(id)`, audit log feed of actions and milestones.

---

### Safe Data Migration (`npm run db:migrate`)
To migrate existing candidate data from `data/careersupport_db.json` to PostgreSQL without data loss:

```bash
# 1. Preview and validate records in Dry-Run mode without database writes
npm run db:migrate -- --dry-run

# 2. Execute full migration into the target database
npm run db:migrate
```

#### Migration Safeguards
- **Zero Deletion Guarantee**: The source `careersupport_db.json` file is **never deleted or overwritten**.
- **Idempotency & Duplicate Prevention**: Checks existing user emails, job IDs, resume IDs, and composite keys before inserting. Re-running the migration skips already migrated entities without creating duplicates.
- **Foreign Key Validation**: Validates that parent user records exist before inserting dependent jobs, resumes, or interview sessions.
- **Corrupt Record Defense**: Invalid or malformed entities are safely logged as warnings and skipped without crashing the rest of the migration.

---

### Step-by-Step Google Cloud SQL Setup Guide

Follow these steps to connect your Cloud Run service to persistent Google Cloud SQL:

#### Step 1: Create Cloud SQL PostgreSQL Instance
In your Google Cloud Console or via `gcloud`:
```bash
gcloud sql instances create careersupport-pg \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=asia-southeast1 \
    --root-password="CHOOSE_A_STRONG_DB_PASSWORD"
```

#### Step 2: Create Application Database and User
```bash
# Create database
gcloud sql databases create careersupport --instance=careersupport-pg

# Create application user
gcloud sql users create career_app_user \
    --instance=careersupport-pg \
    --password="YOUR_SECURE_USER_PASSWORD"
```

#### Step 3: Grant Cloud SQL Permissions to Cloud Run
Ensure your Cloud Run service's Service Account has the **Cloud SQL Client** role:
```bash
PROJECT_ID="your-google-cloud-project-id"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/cloudsql.client"
```

#### Step 4: Attach Cloud SQL Connection to Cloud Run
Update the live Cloud Run service to attach the Cloud SQL instance connection:
```bash
INSTANCE_CONNECTION_NAME="${PROJECT_ID}:asia-southeast1:careersupport-pg"

# Option A: Cloud Run Unix Domain Socket (Recommended on Cloud Run)
gcloud run services update careersupport-ai-powered-career-and-placemen \
    --region=asia-southeast1 \
    --add-cloudsql-instances=$INSTANCE_CONNECTION_NAME \
    --update-env-vars="CLOUD_SQL_CONNECTION_NAME=${INSTANCE_CONNECTION_NAME},PGUSER=career_app_user,PGPASSWORD=YOUR_SECURE_USER_PASSWORD,PGDATABASE=careersupport"

# Option B: Or pass full DATABASE_URL via Google Secret Manager
gcloud secrets create careersupport-db-url --replication-policy="automatic"
echo -n "postgresql://career_app_user:YOUR_SECURE_USER_PASSWORD@localhost:5432/careersupport?host=/cloudsql/${INSTANCE_CONNECTION_NAME}" | gcloud secrets versions add careersupport-db-url --data-file=-

gcloud run services update careersupport-ai-powered-career-and-placemen \
    --region=asia-southeast1 \
    --add-cloudsql-instances=$INSTANCE_CONNECTION_NAME \
    --update-secrets="DATABASE_URL=careersupport-db-url:latest"
```

#### Step 5: Verify Database Health
Check the `/api/health` endpoint on your deployed URL:
```bash
curl https://your-cloud-run-url.run.app/api/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-10-12T18:00:00.000Z",
  "service": "CareerSupport API",
  "database": {
    "status": "healthy",
    "type": "postgres"
  }
}
```

---

## 6. Running the Application & Tests

### Installation
```bash
npm install
```

### Running Tests
To run the automated Vitest test suite (includes database reads/writes, user isolation, failure safety, and migration tests):
```bash
npm test
```

### Running the Development Server
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

### Building for Production
```bash
npm run build
npm run start
```
