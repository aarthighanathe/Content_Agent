// WHY a separate sub-router, not inline in manage.ts: extracted (2026-08-05,
// alongside versions.ts) to keep manage.ts under the 400-line split threshold
// — this route's search/filter/sort/score-subquery logic was ~170 lines on
// its own. Same "split when it grows, mirror the routes/jobs/ sub-router
// pattern" convention as render.ts/stream.ts/insights.ts/versions.ts.
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { db } from '../../db/index.js';
import { contentJobs, contentOutputs } from '../../db/schema.js';
import { eq, and, sql, ilike, desc, asc, inArray } from 'drizzle-orm';
import { jobsMemory, assembleJobFromDB, isValidUUID, type MemoryJob, type AssembledJob } from './ownership.js';
import { VALID_PLATFORMS } from '../../schemas/index.js';
import { readOutputs } from '../content/shared.js';

const router = Router({ mergeParams: true });

// WHY these two: FUNCTIONAL_AUDIT_2026-07.md finding #4 — Library.tsx's search box,
// platform pills, and sort dropdown previously only filtered/sorted whatever page of
// jobs happened to already be loaded (10 rows), silently missing everything on other
// pages. `search`/`platform` now run as real WHERE clauses in the DB query below;
// `sort` is applied DB-side for date/platform.
// WHY sort=score was previously a special case: quality score lives on a joined
// contentOutputs row, not a contentJobs column, so a heavier two-step query was
// needed. As of 2026-08-04, sort=score is now a true global sort (not page-scoped)
// implemented via a LEFT JOIN score subquery — see the score branch below.
type JobSortKey = 'date' | 'score' | 'platform';

// GET / — paginated, searchable, filterable, sortable job list
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = 10;
    const userId = req.dbUserId || req.userId || 'demo';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 500) : '';
    const platformFilter = typeof req.query.platform === 'string' && (VALID_PLATFORMS as readonly string[]).includes(req.query.platform)
      ? req.query.platform
      : undefined;
    const sort: JobSortKey = req.query.sort === 'score' || req.query.sort === 'platform' ? req.query.sort : 'date';
    // WHY opt-out (`counts=0`): the platformCounts GROUP BY below costs a second
    // aggregate scan of the user's jobs on every list fetch, but Calendar (which
    // fetches up to 4 pages to build its month grid) never reads platformCounts —
    // it only consumes jobs/total/totalPages. Library is the only consumer that
    // renders the per-platform pills, so it stays on the default (counts included);
    // Calendar opts out to drop 4 redundant aggregate queries per page load (perf audit).
    const includePlatformCounts = req.query.counts !== '0';

    // WHY the DB fetch always uses the fixed page `limit`, not a shrunk one:
    // an earlier version reserved room on page 1 for prepended in-flight
    // memory jobs by fetching fewer DB rows there (dbLimit = limit - count).
    // But every page's offset is still `(page - 1) * limit` — only page 1's
    // fetch size changed — so the DB rows in the gap between the shrunk
    // fetch and the next page's offset were permanently skipped, and
    // totalPages (computed from totalCount + memory jobs) disagreed between
    // page 1 and later pages. Fetching the full `limit` on every page and
    // trimming the combined list down to `limit` after prepending (below)
    // keeps offsets simple and consistent across all pages.
    const runningMemJobs: MemoryJob[] =
      page === 1 && !search && !platformFilter
        ? Array.from(jobsMemory.values()).filter(
            (j) => j.userId === userId && j.deleted !== 1 && j.status !== 'done' && j.status !== 'failed',
          )
        : [];

    if (db && isValidUUID(userId)) {
      try {
        const whereClauses = [eq(contentJobs.userId, userId), eq(contentJobs.deleted, 0)];
        if (search) whereClauses.push(ilike(contentJobs.topic, `%${search}%`));
        if (platformFilter) whereClauses.push(eq(contentJobs.platform, platformFilter as (typeof VALID_PLATFORMS)[number]));
        const whereClause = and(...whereClauses);

        const [{ total: totalCount }] = await db
          .select({ total: sql<number>`cast(count(*) as int)` })
          .from(contentJobs)
          .where(whereClause);

        let platformCounts: Record<string, number> | undefined;
        if (includePlatformCounts) {
          // WHY a separate grouped query, ignoring platformFilter: this backs the
          // toolbar's per-platform pill badges (e.g. "LinkedIn 23"), which need the
          // true count for every platform regardless of which one is currently
          // selected — computing counts from only the already-platform-filtered
          // page would make every pill except the active one always read 0.
          const countWhereClauses = [eq(contentJobs.userId, userId), eq(contentJobs.deleted, 0)];
          if (search) countWhereClauses.push(ilike(contentJobs.topic, `%${search}%`));
          const platformCountRows = await db
            .select({ platform: contentJobs.platform, count: sql<number>`cast(count(*) as int)` })
            .from(contentJobs)
            .where(and(...countWhereClauses))
            .groupBy(contentJobs.platform);
          platformCounts = {};
          for (const row of platformCountRows) platformCounts[row.platform] = row.count;
        }

        // WHY two-step for sort=score: qualityScore lives on contentOutputs
        // (type='critique'), not on contentJobs — a LEFT JOIN subquery fetches
        // the per-job max score for ordering, then a relational findMany loads
        // the full output data for those specific IDs. This is the fix for
        // FUTURE_FEATURES.md's "sort=score not a true global sort" — it was
        // previously an in-memory re-sort of whatever page was already fetched.
        // idx_content_outputs_job_type on (jobId, outputType) already covers the
        // subquery's WHERE + GROUP BY — no new migration needed.
        let assembledDbJobs: ReturnType<typeof assembleJobFromDB>[];
        if (sort === 'score') {
          // WHY the innerJoin on contentJobs + userId WHERE: without it the score
          // aggregate scanned EVERY critique row in the shared content_outputs table
          // (all users), then filtered the page later. Joining to the caller's own
          // jobs and filtering by userId + deleted in the subquery itself restricts
          // the aggregate to this user's data (perf audit).
          const scoreSubq = db
            .select({
              jobId: contentOutputs.jobId,
              score: sql<number>`MAX(COALESCE(${contentOutputs.qualityScore}, 0))`.as('score'),
            })
            .from(contentOutputs)
            .innerJoin(contentJobs, eq(contentJobs.id, contentOutputs.jobId))
            .where(and(
              eq(contentOutputs.outputType, 'critique'),
              eq(contentJobs.userId, userId),
              eq(contentJobs.deleted, 0),
            ))
            .groupBy(contentOutputs.jobId)
            .as('score_sub');

          const scoredRows = await db
            .select({ id: contentJobs.id })
            .from(contentJobs)
            .leftJoin(scoreSubq, eq(contentJobs.id, scoreSubq.jobId))
            .where(whereClause)
            // NULLS LAST: jobs with no critique output (still in-flight or failed
            // before the critic ran) sort below scored jobs, not above them.
            .orderBy(sql`${scoreSubq.score} DESC NULLS LAST`, desc(contentJobs.createdAt))
            .offset((page - 1) * limit)
            .limit(limit);

          const orderedIds = scoredRows.map((r) => r.id);
          if (orderedIds.length > 0) {
            const fullJobs = await db.query.contentJobs.findMany({
              where: inArray(contentJobs.id, orderedIds),
              with: { outputs: { columns: { agentName: true, outputType: true, qualityScore: true, partial: true } } },
            });
            // WHY re-map by orderedIds: findMany doesn't preserve insertion order;
            // re-establishing score order requires a Map lookup keyed on the
            // score-ordered IDs from the first query.
            const jobMap = new Map(fullJobs.map((j) => [j.id, j]));
            assembledDbJobs = orderedIds
              .map((id) => jobMap.get(id))
              .filter((j): j is NonNullable<typeof j> => j !== undefined)
              .map(assembleJobFromDB);
          } else {
            assembledDbJobs = [];
          }
        } else {
          const dbJobs = await db.query.contentJobs.findMany({
            where: whereClause,
            orderBy: sort === 'platform' ? [asc(contentJobs.platform), desc(contentJobs.createdAt)] : [desc(contentJobs.createdAt)],
            offset: (page - 1) * limit,
            limit,
            with: { outputs: { columns: { agentName: true, outputType: true, qualityScore: true, partial: true } } },
          });
          assembledDbJobs = dbJobs.map(assembleJobFromDB);
        }

        let finalJobs: Array<MemoryJob | AssembledJob> = assembledDbJobs;
        let finalTotal = totalCount;
        // WHY page===1 only, and only when no search/filter is active: in-flight
        // memory-only jobs (not yet persisted) have no DB row to match a WHERE
        // clause against, so folding them into a filtered/searched result would be
        // inconsistent — they'd appear regardless of whether they actually match.
        // They still show up in the default (no search/filter) page-1 view, same
        // as before this fix.
        if (page === 1 && !search && !platformFilter) {
          // WHY filter out overlaps here instead of re-scanning jobsMemory: this
          // reuses the single scan already taken above (runningMemJobs) rather
          // than iterating the whole cross-user Map a second time with a nearly
          // identical predicate.
          const dedupedMemJobs = runningMemJobs.filter((j) => !assembledDbJobs.find((d) => d.id === j.id));
          if (dedupedMemJobs.length > 0) {
            // WHY slice to `limit`: the DB fetch above always pulls a full page
            // (see the dbLimit removal note), so prepending memory jobs on top
            // can push the combined list past `limit` — trim here rather than
            // shrinking the DB fetch, which desynced offsets on later pages.
            finalJobs = [...dedupedMemJobs, ...assembledDbJobs].slice(0, limit);
            finalTotal += dedupedMemJobs.length;
          }
        }

        // WHY still sort in-memory for score: in-flight memory jobs (prepended
        // above) have no qualityScore — they sort last (getJobScore returns -1).
        // The DB jobs are already in score order from the two-step query above;
        // this re-sort just ensures any prepended memory jobs end up after them.
        if (sort === 'score') {
          finalJobs = [...finalJobs].sort((a, b) => getJobScore(b) - getJobScore(a));
        }

        return res.json({ jobs: finalJobs, total: finalTotal, page, totalPages: Math.ceil(finalTotal / limit), platformCounts });
      } catch (dbErr) {
        console.error('[DB] GET /jobs failed, falling back to memory:', dbErr);
      }
    }

    let allJobs = Array.from(jobsMemory.values()).filter((j) => j.deleted !== 1 && j.userId === userId);
    if (search) {
      const needle = search.toLowerCase();
      allJobs = allJobs.filter((j) => (j.topic || '').toLowerCase().includes(needle));
    }
    const memPlatformCounts: Record<string, number> = {};
    for (const j of allJobs) memPlatformCounts[j.platform] = (memPlatformCounts[j.platform] || 0) + 1;
    if (platformFilter) {
      allJobs = allJobs.filter((j) => j.platform === platformFilter);
    }
    // WHY new Date(j.createdAt ?? 0): a running in-memory job's createdAt is
    // always set by create.ts (see job construction there), but the field is
    // optional at the type level since jobsMemory can also hold a
    // PersistedJobResult, which doesn't carry createdAt on its own — falling
    // back to epoch keeps the sort total instead of throwing on `undefined`.
    if (sort === 'platform') {
      allJobs = allJobs.sort((a, b) => a.platform.localeCompare(b.platform) || new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    } else if (sort === 'score') {
      allJobs = allJobs.sort((a, b) => getJobScore(b) - getJobScore(a));
    } else {
      allJobs = allJobs.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }
    const total = allJobs.length;
    const jobs = allJobs.slice((page - 1) * limit, page * limit);
    return res.json({ jobs, total, page, totalPages: Math.ceil(total / limit), platformCounts: memPlatformCounts });
  } catch (error) {
    console.error('[GET /jobs] Unhandled error:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to fetch jobs', code: 'SERVER_ERROR', retryable: true });
  }
});

function getJobScore(job: MemoryJob | AssembledJob): number {
  const critique = readOutputs(job).find((o) => o.outputType === 'critique');
  if (!critique) return -1;
  if (typeof critique.qualityScore === 'number' && critique.qualityScore > 0) return critique.qualityScore;
  const c = critique.content;
  if (c !== null && typeof c === 'object' && 'totalScore' in c && typeof c.totalScore === 'number') return c.totalScore;
  return -1;
}

export default router;
