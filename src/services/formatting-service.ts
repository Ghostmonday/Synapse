import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { supabase } from '../config/db.js';
import { logError, logAudit } from '../shared/logger.js';

const { window } = new JSDOM('');
const purify = DOMPurify(window);

export async function formatAndSanitize(content: string, userId: string): Promise<string> {
  try {
    let html = marked.parse(content);
    // Mentions
    const mentions = content.match(/@[\w]+/g) || [];
    for (const mention of mentions) {
      const username = mention.slice(1);
      const { data: user } = await supabase.from('users').select('id, username').eq('username', username).single();
      if (user) {
        html = html.replace(mention, `<a href="/profile/${user.id}" class="mention">@${user.username}</a>`);
      }
    }
    // Link previews/embeds
    const links = content.match(/https?:\/\/[^\s<]+/g) || [];
    for (const link of links) {
      // Simple embed for YouTube
      if (link.includes('youtube.com/watch')) {
        const videoId = new URL(link).searchParams.get('v');
        html += `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
      } else {
        // Basic link preview (fetch metadata if needed, but keep simple)
        html = html.replace(link, `<a href="${link}" target="_blank">${link}</a>`);
      }
    }
    const sanitized = purify.sanitize(html, { USE_PROFILES: { html: true } });
    await logAudit('format_message', userId, { content_length: content.length });
    return sanitized;
  } catch (error: any) {
    logError('Formatting failed', error);
    return content;
  }
}

