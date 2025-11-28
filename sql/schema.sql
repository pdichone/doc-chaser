-- Smart Doc Chaser - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for document request status
CREATE TYPE document_status AS ENUM ('pending', 'completed', 'expired');

-- Main document requests table
CREATE TABLE document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID,  -- For future multi-tenant support

    -- Client information
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,

    -- Document details
    document_type TEXT NOT NULL,
    deadline TIMESTAMPTZ,
    status document_status DEFAULT 'pending' NOT NULL,

    -- Upload tracking
    upload_token UUID UNIQUE DEFAULT uuid_generate_v4() NOT NULL,
    upload_link TEXT,
    file_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    uploaded_at TIMESTAMPTZ,

    -- Reminder tracking
    last_reminder_at TIMESTAMPTZ,
    reminders_stopped BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_document_requests_status ON document_requests(status);
CREATE INDEX idx_document_requests_upload_token ON document_requests(upload_token);
CREATE INDEX idx_document_requests_created_at ON document_requests(created_at);
CREATE INDEX idx_document_requests_broker_id ON document_requests(broker_id);

-- Row Level Security (RLS) policies
-- For MVP, we'll use a simple approach. Adjust for multi-tenant later.
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (MVP - single broker, no auth)
-- In production, you'd scope this to authenticated users/brokers
CREATE POLICY "Allow all operations for MVP" ON document_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Storage bucket setup instructions:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create a new bucket called "client-documents"
-- 3. Set bucket to public or configure appropriate policies
-- 4. File structure convention: /clients/{client_name}/{doc_type}/{filename}

-- Example: Insert a test record (optional - for testing)
-- INSERT INTO document_requests (client_name, client_phone, document_type)
-- VALUES ('John Smith', '+1234567890', 'Proof of Income');

-- View to get pending requests older than 48 hours (for reminders workflow)
CREATE OR REPLACE VIEW pending_requests_for_reminder AS
SELECT *
FROM document_requests
WHERE status = 'pending'
  AND reminders_stopped = FALSE
  AND (
    -- 48 hours since creation with no reminder sent
    (last_reminder_at IS NULL AND created_at < NOW() - INTERVAL '48 hours')
    OR
    -- 24 hours since last reminder
    (last_reminder_at IS NOT NULL AND last_reminder_at < NOW() - INTERVAL '24 hours')
  );

-- View to get requests approaching deadline (24 hours)
CREATE OR REPLACE VIEW deadline_approaching AS
SELECT *
FROM document_requests
WHERE status = 'pending'
  AND deadline IS NOT NULL
  AND deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours';

-- View to get expired requests (past deadline)
CREATE OR REPLACE VIEW expired_requests AS
SELECT *
FROM document_requests
WHERE status = 'pending'
  AND deadline IS NOT NULL
  AND deadline < NOW();
