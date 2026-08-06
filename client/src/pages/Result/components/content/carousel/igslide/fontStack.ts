import type { Typography } from '../../../../../../lib/templateSystem';

// WHY only two real font faces: the SSR export bundle (client/src/ssr/renderSlideHtml.tsx)
// only embeds Plus Jakarta Sans and Playfair Display as @font-face data URIs — the same
// two fonts the legacy carousel system (IGCarouselPreview.tsx's FONT constant) has always
// used. templateSystem.ts's Typography type also allows 'Inter'/'DM Sans', but those were
// never embedded for export: locally they'd render via whatever the browser/OS happens to
// have installed (or silently fall back), while the exported PNG has no such font available
// at all — silently diverging from the live preview and looking inconsistent with the rest
// of the app's carousel typography. Resolving every template's font choice through this one
// helper guarantees what's on screen is exactly what gets exported.
export function resolveTemplateFont(font: Typography['headingFont'] | Typography['bodyFont']): string {
  return font === 'Playfair Display'
    ? "'Playfair Display', serif"
    : "'Plus Jakarta Sans', system-ui, sans-serif";
}
