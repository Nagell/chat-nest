/**
 * Security utility functions for sanitizing and validating user input
 */
export class SecurityUtil {
  /**
   * Escape HTML characters in text for safe display in HTML contexts
   * @param text The text to escape
   * @returns HTML-safe text with dangerous characters escaped
   */
  static escapeHtml(text: string): string {
    if (!text) return '';

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
  }

  /**
   * Sanitize a chat message object for safe output
   * @param message The message object to sanitize
   * @returns Sanitized message with escaped content
   */
  static sanitizeMessage<T extends { content: string }>(message: T): T {
    return {
      ...message,
      content: this.escapeHtml(message.content),
    };
  }

  /**
   * Sanitize a chat session object for safe output
   * @param session The session object to sanitize
   * @returns Sanitized session with escaped visitor information
   */
  static sanitizeSession<
    T extends { visitor_email: string; visitor_name?: string | null },
  >(session: T): T {
    return {
      ...session,
      visitor_name: session.visitor_name
        ? this.escapeHtml(session.visitor_name)
        : session.visitor_name,
      visitor_email: this.escapeHtml(session.visitor_email),
    };
  }
}
