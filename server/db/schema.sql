-- CareerSupport PostgreSQL Schema
-- Compatible with PostgreSQL 13+ (Cloud SQL for PostgreSQL / Supabase / Neon / Local PG)

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    target_role VARCHAR(255) NOT NULL DEFAULT 'Software Engineer',
    experience_level VARCHAR(64) NOT NULL DEFAULT 'Entry-Level',
    skills JSONB NOT NULL DEFAULT '[]',
    education VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

-- 2. Resume Analyses table
CREATE TABLE IF NOT EXISTS resume_analyses (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    target_job_role VARCHAR(255) NOT NULL,
    target_job_description TEXT NOT NULL DEFAULT '',
    match_score INTEGER NOT NULL DEFAULT 0,
    ats_score INTEGER NOT NULL DEFAULT 0,
    identified_skills JSONB NOT NULL DEFAULT '[]',
    missing_skills JSONB NOT NULL DEFAULT '[]',
    strengths JSONB NOT NULL DEFAULT '[]',
    weaknesses JSONB NOT NULL DEFAULT '[]',
    suggested_improvements JSONB NOT NULL DEFAULT '[]',
    keyword_recommendations JSONB NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resume_user_created ON resume_analyses (user_id, created_at DESC);

-- 3. Job Applications table
CREATE TABLE IF NOT EXISTS job_applications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    posting_url TEXT,
    location VARCHAR(255) NOT NULL DEFAULT 'Remote / Hybrid',
    status VARCHAR(32) NOT NULL DEFAULT 'Applied',
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    salary VARCHAR(128),
    notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON job_applications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_updated ON job_applications (user_id, updated_at DESC);

-- 4. Interview Sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_role VARCHAR(255) NOT NULL,
    experience_level VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    difficulty VARCHAR(32) NOT NULL,
    questions_count INTEGER NOT NULL DEFAULT 3,
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    questions JSONB NOT NULL DEFAULT '[]',
    overall_score INTEGER,
    overall_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interviews_user_created ON interview_sessions (user_id, created_at DESC);

-- 5. Curated DSA Problems Catalog
CREATE TABLE IF NOT EXISTS dsa_problems (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    difficulty VARCHAR(32) NOT NULL,
    leetcode_number INTEGER,
    practice_url TEXT NOT NULL,
    pattern VARCHAR(255) NOT NULL
);

-- 6. User DSA Progress table
CREATE TABLE IF NOT EXISTS user_dsa_progress (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id VARCHAR(64) NOT NULL REFERENCES dsa_problems(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'Not Started',
    notes TEXT DEFAULT '',
    is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
    solved_at TIMESTAMPTZ,
    last_revised_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_problem UNIQUE (user_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_dsa_user_progress ON user_dsa_progress (user_id, status);

-- 7. User Activity Audit Log table
CREATE TABLE IF NOT EXISTS user_activities (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(32) NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user_time ON user_activities (user_id, timestamp DESC);
