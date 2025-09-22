-- Enable UUID extension for session tokens
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chat Sessions table
CREATE TABLE chat_sessions (
    id BIGSERIAL PRIMARY KEY,
    visitor_email TEXT NOT NULL CHECK (visitor_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    visitor_name TEXT,
    session_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages table
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES chat_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_type TEXT CHECK (sender_type IN ('visitor', 'admin')) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMPTZ,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_messages_session_time ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON chat_sessions(visitor_email);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON chat_messages(is_read, created_at) WHERE sender_type = 'visitor' AND is_read = FALSE;

-- Add RLS (Row Level Security) policies for future admin access
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations (Backend-Only Access via Service Role Key, restrict in application logic)
CREATE POLICY "Allow all operations on chat_sessions" ON chat_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on chat_messages" ON chat_messages FOR ALL USING (true);