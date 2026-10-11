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

## 4. Security Hardening

- **Prompt Injection Defense**: Resume documents and user job descriptions are treated as untrusted user data. Prompts mandate that the model must not execute instructions found inside documents.
- **Tenant Isolation**: All database operations (`find`, `update`, `delete`) require matching `userId` from the verified JWT.
- **CSV Formula Neutralization**: Cells starting with `=`, `+`, `-`, or `@` are prefixed with `'` to prevent malicious spreadsheet macro execution upon export.
- **Input Validation**: Zod schemas validate both client inputs and server AI responses.
- **Zero API Key Leakage**: Neither the Gemini API key nor database internals are ever transmitted to the browser bundle.

---

## 5. Running the Application & Tests

### Installation
```bash
npm install
```

### Running Tests
To run all automated test suites:
```bash
npm run test
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
