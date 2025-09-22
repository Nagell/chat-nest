export interface ChatSession {
  id: number;
  visitor_email: string;
  visitor_name?: string;
  session_token: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  content: string;
  sender_type: 'visitor' | 'admin';
  is_read: boolean;
  delivered_at?: string;
  email_sent_at?: string;
  created_at: string;
}

export interface AdminSessionSummary extends ChatSession {
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  total_messages: number;
}

// Database response types
export interface DatabaseSession {
  id: number;
  visitor_email: string;
  visitor_name: string | null;
  session_token: string;
  created_at: string;
}

export interface DatabaseMessage {
  id: number;
  session_id: number;
  content: string;
  sender_type: string;
  is_read: boolean;
  delivered_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}
