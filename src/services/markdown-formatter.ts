/**
 * Markdown Formatter Service
 * Converts Markdown++ to HTML with advanced formatting
 */

import { marked } from 'marked';
import { sanitize } from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = sanitize as any;

/**
 * Format message content with Markdown++
 * Supports: bold, italic, code, links, alignment, mentions
 */
export function formatMessage(content: string): string {
  try {
    // Custom renderer for advanced features
    const renderer = new marked.Renderer();

    // Custom alignment syntax: [center]text[/center], [right]text[/right]
    const alignmentRegex = /\[(center|right|left)\]([\s\S]*?)\[\/\1\]/g;
    content = content.replace(alignmentRegex, (match, align, text) => {
      return `<div style="text-align: ${align}">${text}</div>`;
    });

    // Custom mention syntax: @username or @user_id
    const mentionRegex = /@(\w+)/g;
    content = content.replace(mentionRegex, (match, username) => {
      return `<span class="mention">@${username}</span>`;
    });

    // Convert markdown to HTML
    const html = marked.parse(content, { renderer });

    // Sanitize HTML to prevent XSS
    const sanitized = purify(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'div', 'span'],
      ALLOWED_ATTR: ['href', 'class', 'style']
    });

    return sanitized;
  } catch (error: any) {
    // Fallback to plain text if formatting fails
    return content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

/**
 * Extract plain text from formatted content
 */
export function extractPlainText(formattedContent: string): string {
  // Remove HTML tags
  return formattedContent.replace(/<[^>]*>/g, '').trim();
}

