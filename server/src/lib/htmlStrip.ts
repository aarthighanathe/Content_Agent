// WHY: ASCII-only lowercase keeps indices aligned with the original string;
// String#toLowerCase can change length for some Unicode chars (e.g. 'İ').
function asciiLower(s: string): string {
  return s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z0-9_]/.test(ch);
}

// SECURITY: linear-time replacement for /<tag\b[^>]*>[\s\S]*?<\/tag\s*>/gi, which is
// quadratic on input with many openers and no closers (ReDoS on untrusted HTML).
// NOTE: unterminated blocks are left untouched, matching the old regex; callers run
// further passes (entity decode, tag strip) that neutralize the remainder.
export function stripTagBlocks(html: string, tag: string): string {
  const lower = asciiLower(html);
  const open = `<${tag}`;
  const close = `</${tag}`;
  let out = '';
  let cursor = 0;
  let from = 0;

  while (from < lower.length) {
    const start = lower.indexOf(open, from);
    if (start === -1) break;
    if (isWordChar(lower[start + open.length])) {
      from = start + open.length;
      continue;
    }
    const openEnd = lower.indexOf('>', start + open.length);
    // WHY: no '>' after this opener means none after any later opener either — stop.
    if (openEnd === -1) break;

    let end = -1;
    let search = openEnd + 1;
    while (search < lower.length) {
      const closeStart = lower.indexOf(close, search);
      if (closeStart === -1) break;
      let i = closeStart + close.length;
      while (i < lower.length && /\s/.test(lower[i] as string)) i++;
      if (lower[i] === '>') {
        end = i + 1;
        break;
      }
      search = closeStart + close.length;
    }
    // WHY: a failed closer search covers the whole remaining string, so later openers
    // cannot succeed either; breaking keeps the scan O(n).
    if (end === -1) break;

    out += html.slice(cursor, start);
    cursor = end;
    from = end;
  }

  return out + html.slice(cursor);
}
