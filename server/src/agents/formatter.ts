import { sseManager } from '../lib/sse.js';
import { ContentJob } from '../db/schema.js';

export async function runFormatter(job: ContentJob, content: any): Promise<any> {
  sseManager.sendEvent(job.id, {
    type: 'progress',
    stage: 'formatting',
    progress: 80,
    agent: 'formatter',
    message: 'Polishing and formatting your content...',
  });

  switch (job.platform) {
    case 'instagram_carousel':
      return formatCarousel(content);
    case 'linkedin_post':
      return formatLinkedIn(content);
    case 'twitter_thread':
      return formatTwitterThread(content);
    case 'instagram_caption':
      return formatInstagramCaption(content);
    default:
      return content;
  }
}

function formatCarousel(slides: any[]): any[] {
  if (!Array.isArray(slides)) return slides;

  return slides.map((slide, index) => {
    const formatted = { ...slide };
    const isLast = index === slides.length - 1;

    // Normalize type field
    if (!formatted.type) {
      formatted.type = index === 0 ? 'cover' : isLast ? 'cta' : 'content';
    }

    // Normalize slide_number
    formatted.slide_number = index + 1;
    formatted.slideNumber  = index + 1;

    // Ensure last slide is typed as CTA with a default action
    if (isLast) {
      if (formatted.type !== 'cta') formatted.type = 'cta';
      if (!formatted.cta) {
        formatted.cta = { action: 'Follow for more', handle: '' };
      }
    }

    // Max 80 words per slide body — enough for detailed, specific copy
    const words = (formatted.body || '').split(/\s+/);
    if (words.length > 80) {
      formatted.body = words.slice(0, 80).join(' ') + '…';
    }

    // Preserve structured points array if present
    if (Array.isArray(slide.points)) {
      formatted.points = slide.points;
    }

    return formatted;
  });
}

function formatLinkedIn(post: any): any {
  if (!post || typeof post !== 'object') return post;

  const formatted = { ...post };

  // Ensure hook is in first 2 lines
  if (formatted.hook && !formatted.hook.includes('\n')) {
    formatted.hook = formatted.hook.trim();
  }

  // Add line breaks every 2-3 sentences in body
  if (formatted.body) {
    const sentences = formatted.body.split(/(?<=[.!?])\s+/);
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      paragraphs.push(sentences.slice(i, i + 2).join(' '));
    }
    formatted.body = paragraphs.join('\n\n');
  }

  // Limit to 5 hashtags
  if (formatted.hashtags && formatted.hashtags.length > 5) {
    formatted.hashtags = formatted.hashtags.slice(0, 5);
  }

  // Ensure hashtags have # prefix
  if (formatted.hashtags) {
    formatted.hashtags = formatted.hashtags.map((tag: string) =>
      tag.startsWith('#') ? tag : `#${tag}`
    );
  }

  return formatted;
}

function formatTwitterThread(thread: any): any {
  if (!thread || !thread.tweets) return thread;

  const formatted = { ...thread };

  formatted.tweets = formatted.tweets.map((tweet: any, index: number) => {
    const t = { ...tweet };
    const n = index + 1;
    const prefix = `${n}/`;

    // Only prepend numbering if the model hasn't already added it.
    // The writer prompt asks for numbered tweets, so avoid double-prefixing
    // (e.g. "1/ 1/ text" or "2/ 2/ text").
    const alreadyNumbered = /^\d+\/\s/.test(String(t.text));
    if (!alreadyNumbered) {
      t.text = `${prefix} ${t.text}`;
    }

    // Enforce 280-char hard limit
    if (t.text.length > 280) {
      t.text = t.text.slice(0, 277) + '...';
    }

    t.number = n;
    return t;
  });

  return formatted;
}

function formatInstagramCaption(caption: any): any {
  if (!caption || typeof caption !== 'object') return caption;

  const formatted = { ...caption };

  // Limit hashtags to 30
  if (formatted.hashtags && formatted.hashtags.length > 30) {
    formatted.hashtags = formatted.hashtags.slice(0, 30);
  }

  // Ensure hashtags have # prefix
  if (formatted.hashtags) {
    formatted.hashtags = formatted.hashtags.map((tag: string) =>
      tag.startsWith('#') ? tag : `#${tag}`
    );
  }

  // Ensure 3-5 emojis
  if (!formatted.emojis || formatted.emojis.length < 3) {
    formatted.emojis = ['✨', '💫', '🔥', '💡', '🎯'];
  }

  return formatted;
}
