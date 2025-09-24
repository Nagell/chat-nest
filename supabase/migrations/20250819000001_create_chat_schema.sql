-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id BIGSERIAL PRIMARY KEY,
    visitor_email TEXT NOT NULL CHECK (visitor_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    visitor_name TEXT,
    session_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES chat_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
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

-- Admin Session Summary Function (for performance)
CREATE OR REPLACE FUNCTION get_admin_session_summary()
RETURNS TABLE (
    id BIGINT,
    visitor_email TEXT,
    visitor_name TEXT,
    session_token UUID,
    created_at TIMESTAMPTZ,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count BIGINT,
    total_messages BIGINT
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.visitor_email,
        s.visitor_name,
        s.session_token,
        s.created_at,
        COALESCE(last_msg.content, '') as last_message,
        COALESCE(last_msg.created_at, s.created_at) as last_message_at,
        COALESCE(unread.unread_count, 0) as unread_count,
        COALESCE(total.total_messages, 0) as total_messages
    FROM public.chat_sessions s
    LEFT JOIN (
        SELECT DISTINCT ON (session_id)
            session_id, content, chat_messages.created_at
        FROM public.chat_messages
        ORDER BY session_id, chat_messages.created_at DESC
    ) last_msg ON s.id = last_msg.session_id
    LEFT JOIN (
        SELECT
            session_id,
            COUNT(*) as unread_count
        FROM public.chat_messages
        WHERE sender_type = 'visitor' AND is_read = false
        GROUP BY session_id
    ) unread ON s.id = unread.session_id
    LEFT JOIN (
        SELECT
            session_id,
            COUNT(*) as total_messages
        FROM public.chat_messages
        GROUP BY session_id
    ) total ON s.id = total.session_id
    ORDER BY COALESCE(last_msg.created_at, s.created_at) DESC;
END;
$$;

-- Row Level Security (RLS)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role to access everything (for your backend)
-- Using subquery to cache auth.role() call for better performance
CREATE POLICY "Service role can access all chat_sessions" ON chat_sessions
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role can access all chat_messages" ON chat_messages
    FOR ALL USING ((SELECT auth.role()) = 'service_role');

COMMENT ON TABLE chat_sessions IS 'Stores chat session information for each visitor';
COMMENT ON TABLE chat_messages IS 'Stores all chat messages with sender information';
COMMENT ON FUNCTION get_admin_session_summary() IS 'Optimized function to get session summaries for admin dashboard';