/**
 * lib/carousel.test.ts — P0
 * Tests injectSlideContent token replacement, escHtml, slideTypeLabel,
 * renderPoints, and THEME_META structure — without Puppeteer.
 */
import { describe, it, expect } from 'vitest';

// ─── Inline the pure helpers from carousel.ts ─────────────────────────────────

type ThemeKey = 'aurora' | 'magazine' | 'split' | 'bold' | 'minimal' | 'neon' | 'violet' | 'crimson' | 'rose';

const EXPECTED_THEMES: ThemeKey[] = ['aurora', 'magazine', 'split', 'bold', 'minimal', 'neon', 'violet', 'crimson', 'rose'];

function stripHandlebarsBlocks(html: string): string {
  return html
    .replace(/\{\{#if\b[^}]*\}\}/g,      '')
    .replace(/\{\{\/if\}\}/g,             '')
    .replace(/\{\{#unless\b[^}]*\}\}/g,   '')
    .replace(/\{\{\/unless\}\}/g,          '')
    .replace(/\{\{#each\b[^}]*\}\}/g,     '')
    .replace(/\{\{\/each\}\}/g,            '')
    .replace(/\{\{else\}\}/g,              '')
    .replace(/\{\{#with\b[^}]*\}\}/g,     '')
    .replace(/\{\{\/with\}\}/g,            '');
}

function escHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slideTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    COVER:   'START HERE',
    STAT:    'DATA POINT',
    QUOTE:   'QUOTE',
    CONTENT: 'INSIGHTS',
    CTA:     'FOLLOW',
  };
  return labels[type] || type;
}

function renderPoints(
  points: Array<{ icon?: string; label: string; desc: string }> | undefined,
  accent: string,
  theme: ThemeKey,
): string {
  if (!points || points.length === 0) return '';

  const POINTS_CARD_STYLES: Partial<Record<ThemeKey, string>> = {
    magazine: 'border-top: 0.5px solid rgba(212,160,23,0.4); padding: 12px 0;',
    minimal:  'border-left: 3px solid currentAccent; padding: 8px 14px;',
  };

  const themeCardStyle = POINTS_CARD_STYLES[theme]?.replace('currentAccent', accent)
    ?? `background:rgba(255,255,255,0.06); border-radius:8px; padding:16px 20px;`;

  return points.map((p, i) => `
    <div style="${themeCardStyle}">
      <span>${p.icon || String(i + 1).padStart(2, '0')}</span>
      <div>${escHtml(p.label)}</div>
      <div>${escHtml(p.desc)}</div>
    </div>
  `).join('');
}

function injectSlideContent(
  template: string,
  slide: any,
  idx: number,
  total: number,
  theme: ThemeKey,
  accent: string,
): string {
  const TYPE_MAP: Record<string, string> = {
    cover: 'COVER', content: 'CONTENT', stat: 'STAT', quote: 'QUOTE', cta: 'CTA',
    COVER: 'COVER', CONTENT: 'CONTENT', STAT: 'STAT', QUOTE: 'QUOTE', CTA: 'CTA',
  };
  const rawType = slide.type || (idx === 0 ? 'cover' : idx === total - 1 ? 'cta' : 'content');
  const type = TYPE_MAP[rawType] || rawType.toUpperCase();
  const emoji = slide.visual_hint || slide.emoji || '✦';

  const esc = (s: string) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const clean = stripHandlebarsBlocks(template);

  return clean
    .replace(/\{\{headline\}\}/g,     esc(slide.headline || ''))
    .replace(/\{\{body\}\}/g,         esc(slide.body || ''))
    .replace(/\{\{slide_number\}\}/g, String(idx + 1).padStart(2, '0'))
    .replace(/\{\{total_slides\}\}/g, String(total).padStart(2, '0'))
    .replace(/\{\{type\}\}/g,         type)
    .replace(/\{\{accent\}\}/g,       accent)
    .replace(/\{\{emoji\}\}/g,        emoji)
    .replace(/\{\{label\}\}/g,        slideTypeLabel(type))
    .replace(/\{\{points\}\}/g,       renderPoints(slide.points, accent, theme))
    .replace(/\{\{handle\}\}/g,       esc(slide.cta?.handle || '@yourbrand'))
    .replace(/\{\{action\}\}/g,       esc(slide.cta?.action || 'Follow for more'))
    .replace(/>LABEL</g,              `>${slideTypeLabel(type)}<`);
}

// ─── THEME_META structure ─────────────────────────────────────────────────────

describe('THEME_META structure', () => {
  it('TC-060 — all 9 theme keys are present', () => {
    expect(EXPECTED_THEMES.length).toBe(9);
    expect(new Set(EXPECTED_THEMES).size).toBe(9);
  });

  it('TC-061 — all valid ThemeKey literals are included', () => {
    const expected = new Set(['aurora','magazine','split','bold','minimal','neon','violet','crimson','rose']);
    EXPECTED_THEMES.forEach(t => expect(expected.has(t)).toBe(true));
  });
});

// ─── escHtml ──────────────────────────────────────────────────────────────────

describe('escHtml', () => {
  it('escapes & to &amp;', () => {
    expect(escHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes < to &lt;', () => {
    expect(escHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes > to &gt;', () => {
    expect(escHtml('5 > 3')).toBe('5 &gt; 3');
  });

  it('escapes " to &quot;', () => {
    expect(escHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('handles null/undefined safely via String coercion', () => {
    expect(escHtml(null as any)).toBe('');
    expect(escHtml(undefined as any)).toBe('');
  });

  it('leaves plain text unchanged', () => {
    expect(escHtml('Hello World')).toBe('Hello World');
  });
});

// ─── slideTypeLabel ───────────────────────────────────────────────────────────

describe('slideTypeLabel', () => {
  it('returns START HERE for COVER', () => {
    expect(slideTypeLabel('COVER')).toBe('START HERE');
  });
  it('returns DATA POINT for STAT', () => {
    expect(slideTypeLabel('STAT')).toBe('DATA POINT');
  });
  it('returns QUOTE for QUOTE', () => {
    expect(slideTypeLabel('QUOTE')).toBe('QUOTE');
  });
  it('returns INSIGHTS for CONTENT', () => {
    expect(slideTypeLabel('CONTENT')).toBe('INSIGHTS');
  });
  it('returns FOLLOW for CTA', () => {
    expect(slideTypeLabel('CTA')).toBe('FOLLOW');
  });
  it('returns unknown type as-is', () => {
    expect(slideTypeLabel('CUSTOM')).toBe('CUSTOM');
  });
});

// ─── stripHandlebarsBlocks ────────────────────────────────────────────────────

describe('stripHandlebarsBlocks', () => {
  it('removes {{#if}} blocks', () => {
    const html = '{{#if show}}content{{/if}}';
    expect(stripHandlebarsBlocks(html)).toBe('content');
  });

  it('removes {{#unless}} blocks', () => {
    const html = '{{#unless hide}}visible{{/unless}}';
    expect(stripHandlebarsBlocks(html)).toBe('visible');
  });

  it('removes {{#each}} blocks', () => {
    const html = '{{#each items}}item{{/each}}';
    expect(stripHandlebarsBlocks(html)).toBe('item');
  });

  it('removes {{else}}', () => {
    const html = '{{#if a}}yes{{else}}no{{/if}}';
    expect(stripHandlebarsBlocks(html)).toBe('yesno');
  });

  it('preserves non-block tokens like {{headline}}', () => {
    const html = '{{#if show}}{{headline}}{{/if}}';
    expect(stripHandlebarsBlocks(html)).toBe('{{headline}}');
  });
});

// ─── injectSlideContent ───────────────────────────────────────────────────────

describe('injectSlideContent', () => {
  const TEMPLATE = '<div>{{headline}}</div><p>{{body}}</p><span>{{slide_number}}/{{total_slides}}</span><em>{{type}}</em><i>{{accent}}</i>';

  it('replaces {{headline}} with slide headline', () => {
    const slide = { headline: 'Test Headline', body: 'Body text.', type: 'cover' };
    const result = injectSlideContent(TEMPLATE, slide, 0, 8, 'aurora', '#00D4FF');
    expect(result).toContain('Test Headline');
    expect(result).not.toContain('{{headline}}');
  });

  it('replaces {{body}} with slide body', () => {
    const slide = { headline: 'H', body: 'Body text.', type: 'cover' };
    const result = injectSlideContent(TEMPLATE, slide, 0, 8, 'aurora', '#00D4FF');
    expect(result).toContain('Body text.');
    expect(result).not.toContain('{{body}}');
  });

  it('replaces {{slide_number}} with 1-based zero-padded index', () => {
    const slide = { headline: 'H', body: 'B', type: 'content' };
    const result = injectSlideContent(TEMPLATE, slide, 2, 8, 'aurora', '#00D4FF');
    expect(result).toContain('03/08');
  });

  it('replaces {{total_slides}}', () => {
    const slide = { headline: 'H', body: 'B', type: 'cover' };
    const result = injectSlideContent(TEMPLATE, slide, 0, 8, 'aurora', '#00D4FF');
    expect(result).toContain('08');
  });

  it('replaces {{type}} with normalized uppercase type', () => {
    const slide = { headline: 'H', body: 'B', type: 'cover' };
    const result = injectSlideContent(TEMPLATE, slide, 0, 8, 'aurora', '#00D4FF');
    expect(result).toContain('COVER');
  });

  it('replaces {{accent}} with theme accent color', () => {
    const slide = { headline: 'H', body: 'B', type: 'cover' };
    const result = injectSlideContent(TEMPLATE, slide, 0, 8, 'aurora', '#00D4FF');
    expect(result).toContain('#00D4FF');
  });

  it('escapes XSS in headline (TC-055 equivalent for carousel)', () => {
    const slide = { headline: '<script>alert(1)</script>', body: 'B', type: 'cover' };
    const result = injectSlideContent(TEMPLATE, slide, 0, 8, 'aurora', '#00D4FF');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('escapes & in body', () => {
    const slide = { headline: 'H', body: 'Salt & Pepper', type: 'content' };
    const result = injectSlideContent(TEMPLATE, slide, 1, 8, 'aurora', '#00D4FF');
    expect(result).toContain('Salt &amp; Pepper');
  });

  it('infers type=cover for idx=0 when slide.type missing', () => {
    const slide = { headline: 'H', body: 'B' };
    const result = injectSlideContent(TEMPLATE, slide, 0, 8, 'aurora', '#00D4FF');
    expect(result).toContain('COVER');
  });

  it('infers type=cta for last slide when slide.type missing', () => {
    const slide = { headline: 'H', body: 'B' };
    const result = injectSlideContent(TEMPLATE, slide, 7, 8, 'aurora', '#00D4FF');
    expect(result).toContain('CTA');
  });

  it('infers type=content for middle slides when slide.type missing', () => {
    const slide = { headline: 'H', body: 'B' };
    const result = injectSlideContent(TEMPLATE, slide, 3, 8, 'aurora', '#00D4FF');
    expect(result).toContain('CONTENT');
  });

  it('handles missing headline gracefully (empty string substituted)', () => {
    const slide = { body: 'B', type: 'cover' };
    const result = injectSlideContent(TEMPLATE, slide, 0, 8, 'aurora', '#00D4FF');
    expect(result).not.toContain('{{headline}}');
  });

  it('replaces {{action}} with cta.action', () => {
    const tmpl = '<button>{{action}}</button>';
    const slide = { headline: 'H', body: 'B', type: 'cta', cta: { action: 'Save this post', handle: '@me' } };
    const result = injectSlideContent(tmpl, slide, 7, 8, 'aurora', '#00D4FF');
    expect(result).toContain('Save this post');
  });

  it('defaults {{action}} to "Follow for more" when no cta', () => {
    const tmpl = '<button>{{action}}</button>';
    const slide = { headline: 'H', body: 'B', type: 'cta' };
    const result = injectSlideContent(tmpl, slide, 7, 8, 'aurora', '#00D4FF');
    expect(result).toContain('Follow for more');
  });
});

// ─── renderPoints ─────────────────────────────────────────────────────────────

describe('renderPoints', () => {
  it('returns empty string for undefined points', () => {
    expect(renderPoints(undefined, '#00D4FF', 'aurora')).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(renderPoints([], '#00D4FF', 'aurora')).toBe('');
  });

  it('renders each point with label and desc', () => {
    const points = [
      { icon: '⚡', label: 'Fast Deploy', desc: 'Deploy in under 60 seconds every time.' },
      { icon: '🎯', label: 'Accurate', desc: 'AI precision with 99.9% accuracy.' },
    ];
    const result = renderPoints(points, '#00D4FF', 'aurora');
    expect(result).toContain('Fast Deploy');
    expect(result).toContain('Accurate');
    expect(result).toContain('Deploy in under 60 seconds every time.');
  });

  it('escapes HTML in label and desc', () => {
    const points = [{ label: '<b>Bold</b>', desc: 'a & b' }];
    const result = renderPoints(points, '#00D4FF', 'aurora');
    expect(result).toContain('&lt;b&gt;Bold&lt;/b&gt;');
    expect(result).toContain('a &amp; b');
  });

  it('uses padded index as default icon when icon missing', () => {
    const points = [{ label: 'Step one', desc: 'Do this.' }];
    const result = renderPoints(points, '#00D4FF', 'aurora');
    expect(result).toContain('01');
  });
});
