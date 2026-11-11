// WHY extracted: the outline used to be a left-rail of dark cards with only
// headline+body. Building a full reading document here keeps exportDownloaders
// thin and makes the HTML export match the PDF's content completeness.
import type { SlideData } from './content/carousel/IGSlide';
import type { ContentJob } from '../../../types/job';

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slidePointsHtml(slide: SlideData): string {
  const points = Array.isArray(slide.points) ? slide.points : [];
  if (points.length === 0) return '';
  const items = points
    .map((point, index) => {
      const label = esc((point.label ?? '').trim());
      const desc = esc((point.desc ?? '').trim());
      if (!label && !desc) return '';
      return `<li>
          <span class="point-index">${index + 1}</span>
          <div class="point-copy">
            ${label ? `<div class="point-label">${label}</div>` : ''}
            ${desc ? `<p class="point-desc">${desc}</p>` : ''}
          </div>
        </li>`;
    })
    .filter((item) => item.length > 0)
    .join('\n');
  if (!items) return '';
  return `<ol class="points">${items}</ol>`;
}

function slideCtaHtml(slide: SlideData): string {
  const action = (slide.cta?.action ?? '').trim();
  const handle = (slide.cta?.handle ?? '').trim();
  if (!action && !handle) return '';
  const text = [action, handle ? `@${handle}` : ''].filter((part) => part.length > 0).join(' · ');
  return `<p class="cta">${esc(text)}</p>`;
}

function metaLine(jobData: ContentJob | null, slideCount: number): string {
  const parts = [
    jobData?.platform,
    jobData?.tone,
    jobData?.targetAudience,
    `${slideCount} slide${slideCount === 1 ? '' : 's'}`,
  ].filter((part): part is string => typeof part === 'string' && part.length > 0);
  return parts.map((part) => esc(part)).join(' · ');
}

export function buildSlideOutlineHtml(
  slides: SlideData[],
  jobData: ContentJob | null,
): string {
  const topic = esc(jobData?.topic || 'Carousel outline');
  const meta = metaLine(jobData, slides.length);
  const toc = slides
    .map((slide, index) => {
      const title = esc((slide.headline || `Slide ${index + 1}`).trim());
      const kind = slide.type ? esc(slide.type) : '';
      return `<li>
          <a href="#slide-${index + 1}">
            <span class="toc-num">${String(index + 1).padStart(2, '0')}</span>
            <span class="toc-title">${title}</span>
            ${kind ? `<span class="toc-kind">${kind}</span>` : ''}
          </a>
        </li>`;
    })
    .join('\n');

  const sections = slides
    .map((slide, index) => {
      const kind = slide.type ? esc(slide.type) : 'slide';
      const headline = esc((slide.headline ?? '').trim());
      const body = esc((slide.body ?? '').trim());
      return `<article class="slide" id="slide-${index + 1}">
        <header class="slide-head">
          <div class="slide-index">${String(index + 1).padStart(2, '0')}</div>
          <div class="slide-meta">
            <span class="slide-kind">${kind}</span>
            <span class="slide-pos">${index + 1} / ${slides.length}</span>
          </div>
        </header>
        ${headline ? `<h2 class="slide-title">${headline}</h2>` : ''}
        ${body ? `<p class="slide-body">${body}</p>` : ''}
        ${slidePointsHtml(slide)}
        ${slideCtaHtml(slide)}
      </article>`;
    })
    .join('\n');

  // WHY standalone CSS (no Tailwind): this file opens via file:// with no app
  // bundle. Keep one readable column, print styles, and system font stacks so
  // it works offline without a CDN.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${topic}</title>
<style>
  :root {
    --bg: #f3efe6;
    --bg-ink: #1c1915;
    --paper: #fffdf8;
    --rule: #d9d0c2;
    --muted: #6f675c;
    --accent: #0f6b5c;
    --accent-soft: #e4f2ee;
    --shadow: 0 18px 40px rgba(28, 25, 21, 0.08);
    --font-display: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
    --font-body: "Avenir Next", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    min-height: 100vh;
    color: var(--bg-ink);
    font-family: var(--font-body);
    background:
      radial-gradient(1200px 500px at 10% -10%, #efe6d4 0%, transparent 55%),
      radial-gradient(900px 480px at 100% 0%, #e7eee9 0%, transparent 50%),
      var(--bg);
    line-height: 1.55;
  }
  .shell {
    width: min(760px, calc(100% - 40px));
    margin: 0 auto;
    padding: 48px 0 72px;
  }
  .hero {
    margin-bottom: 36px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--rule);
  }
  .eyebrow {
    margin: 0 0 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    margin: 0 0 14px;
    font-family: var(--font-display);
    font-size: clamp(28px, 5vw, 40px);
    line-height: 1.15;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .meta {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
  }
  .toc {
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: 18px;
    box-shadow: var(--shadow);
    padding: 22px 24px;
    margin-bottom: 28px;
  }
  .toc h2 {
    margin: 0 0 14px;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .toc ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .toc a {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: baseline;
    text-decoration: none;
    color: inherit;
    padding: 8px 10px;
    border-radius: 10px;
  }
  .toc a:hover { background: var(--accent-soft); }
  .toc-num {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--accent);
  }
  .toc-title {
    font-weight: 600;
    line-height: 1.35;
  }
  .toc-kind {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .slide {
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: 18px;
    box-shadow: var(--shadow);
    padding: 28px 28px 26px;
    margin-bottom: 18px;
  }
  .slide-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }
  .slide-index {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .slide-meta {
    display: flex;
    gap: 12px;
    align-items: center;
    color: var(--muted);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .slide-kind { font-weight: 700; color: var(--bg-ink); }
  .slide-title {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: clamp(22px, 3.5vw, 28px);
    line-height: 1.2;
    letter-spacing: -0.015em;
  }
  .slide-body {
    margin: 0;
    font-size: 16px;
    color: #3a342c;
  }
  .points {
    list-style: none;
    margin: 20px 0 0;
    padding: 0;
    display: grid;
    gap: 12px;
  }
  .points li {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 12px;
    padding: 14px 14px 12px;
    border-radius: 14px;
    background: #f7f3ea;
    border: 1px solid #ebe3d4;
  }
  .point-index {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: var(--bg-ink);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }
  .point-label {
    font-weight: 700;
    margin-bottom: 2px;
  }
  .point-desc {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
  }
  .cta {
    margin: 18px 0 0;
    padding-top: 14px;
    border-top: 1px dashed var(--rule);
    font-weight: 700;
    color: var(--accent);
  }
  .footer {
    margin-top: 28px;
    color: var(--muted);
    font-size: 12px;
    text-align: center;
  }
  @media (max-width: 640px) {
    .shell { width: min(100% - 28px, 760px); padding-top: 28px; }
    .slide, .toc { padding: 20px; border-radius: 14px; }
    .toc a { grid-template-columns: 36px minmax(0, 1fr); }
    .toc-kind { display: none; }
  }
  @media print {
    body { background: #fff; }
    .shell { width: 100%; padding: 0; }
    .slide, .toc {
      box-shadow: none;
      break-inside: avoid;
      border-color: #ccc;
    }
    .toc a:hover { background: transparent; }
  }
</style>
</head>
<body>
  <main class="shell">
    <header class="hero">
      <p class="eyebrow">Slide outline</p>
      <h1>${topic}</h1>
      ${meta ? `<p class="meta">${meta}</p>` : ''}
    </header>
    <nav class="toc" aria-label="Slides">
      <h2>Contents</h2>
      <ol>
        ${toc}
      </ol>
    </nav>
    ${sections}
    <p class="footer">Exported from Pensieve · readable outline, not the Instagram PNG layout</p>
  </main>
</body>
</html>`;
}
