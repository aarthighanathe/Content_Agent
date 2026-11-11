import type { LibraryJob } from './libraryHelpers';
import { getQualityScore } from './libraryHelpers';
import { MAX_LIBRARY_JOB_PAGES } from './libraryFetch';

export function buildLibraryCsv(jobs: LibraryJob[]): string {
  const rows = [['Topic', 'Platform', 'Status', 'Score', 'Date', 'URL']];
  jobs.forEach((j) => {
    rows.push([
      `"${(j.topic || '').replace(/"/g, '""')}"`,
      j.platform,
      j.status,
      String(getQualityScore(j) ?? ''),
      new Date(j.createdAt).toLocaleDateString(),
      `${window.location.origin}/result/${j.id}`,
    ]);
  });
  return rows.map((r) => r.join(',')).join('\n');
}

export function downloadLibraryCsv(csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'content_library.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCapNote(hitCap: boolean): string {
  if (!hitCap) return '';
  return ` (capped at ${MAX_LIBRARY_JOB_PAGES * 10} most recent matches)`;
}
