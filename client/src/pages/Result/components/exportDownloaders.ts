// WHY extracted from ExportModal.tsx: download helpers (~160 lines) pushed the
// modal past the 400-line hard cap; the UI shell stays in ExportModal.
import { api } from '../../../api';
import { flattenContentToText } from '../../../lib/contentFlattener.js';
import type { ColorSystem } from '../../../lib/colorSystem';
import type { ContentJob } from '../../../types/job';
import type { ResultContent as ExportContent } from './ContentColumn';
import { buildSlideOutlineHtml } from './exportHtmlOutline';

export const THEME_KEYS = [
  'aurora', 'magazine', 'split', 'bold', 'minimal', 'neon', 'violet', 'crimson', 'rose',
] as const;

export interface ExportDownloadContext {
  content: ExportContent | undefined;
  jobData: ContentJob | null;
  colorTheme: number;
  brandName: string;
  handle: string;
  colorSystem: ColorSystem;
  designPreset: number;
  templateId?: string;
  paletteId?: string;
}

function safeFileName(jobData: ContentJob | null): string {
  return (jobData?.topic || 'content').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
}

function triggerDownload(data: Blob, filename: string, mimeType: string): void {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function errorMessageFromParsedBody(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== 'object' || !('error' in parsed)) return null;
  const message = (parsed as { error: unknown }).error;
  return typeof message === 'string' ? message : null;
}

async function messageFromExportBlobError(err: unknown): Promise<string | null> {
  if (!err || typeof err !== 'object' || !('response' in err)) return null;
  const response = (err as { response?: { data?: unknown } }).response;
  const data = response?.data;
  if (!(data instanceof Blob)) return null;
  try {
    const text = await data.text();
    return errorMessageFromParsedBody(JSON.parse(text));
  } catch {
    // Not JSON — fall through to the generic export error.
  }
  return null;
}

export async function exportPNG(ctx: ExportDownloadContext): Promise<void> {
  const { content, jobData, colorTheme, brandName, handle, colorSystem, designPreset, templateId, paletteId } = ctx;
  if (!Array.isArray(content)) throw new Error('No carousel content');
  const jobId = jobData?.id;
  if (!jobId) throw new Error('Missing job id');
  const themeKey = THEME_KEYS[colorTheme] ?? 'minimal';
  try {
    // WHY generic <Blob>: api.post's response type defaults to `any`-shaped axios data;
    // the export route always returns a ZIP blob (responseType: 'blob' below).
    const response = await api.post<Blob>(
      `/jobs/${jobId}/export/carousel-png`,
      // WHY these extra fields: the server renders the same slide component the preview
      // uses, so it needs the exact palette, brand identity and design preset on screen.
      {
        theme: themeKey,
        slides: content,
        colors: colorSystem,
        brandName,
        handle,
        designPreset,
        templateId,
        paletteId,
      },
      { responseType: 'blob' },
    );
    const exportWarning = response.headers?.['x-export-warning'];
    if (typeof exportWarning === 'string' && exportWarning.length > 0) {
      throw new Error(exportWarning);
    }
    triggerDownload(response.data, `${safeFileName(jobData)}_slides.zip`, 'application/zip');
  } catch (err: unknown) {
    // WHY: responseType:'blob' turns JSON error bodies into Blobs, so the modal
    // used to show a blank "Error" with no reason after a partial render failure.
    const fromBody = await messageFromExportBlobError(err);
    if (fromBody) throw new Error(fromBody);
    throw err instanceof Error ? err : new Error('Export failed');
  }
}

export function exportText(ctx: ExportDownloadContext): void {
  const { content, jobData } = ctx;
  if (!content) throw new Error('No content');
  const text = flattenContentToText(content);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `${safeFileName(jobData)}.txt`, 'text/plain');
}

export async function exportPDF(ctx: ExportDownloadContext): Promise<void> {
  const { content, jobData } = ctx;
  const { buildContentPdf } = await import('./exportPdf');
  const doc = await buildContentPdf(content, jobData);
  doc.save(`${safeFileName(jobData)}.pdf`);
}

export function exportHTML(ctx: ExportDownloadContext): void {
  const { content, jobData } = ctx;
  if (!Array.isArray(content)) throw new Error('HTML export is only available for carousels');
  const html = buildSlideOutlineHtml(content, jobData);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, `${safeFileName(jobData)}.html`, 'text/html');
}
