// WHY: a separate sub-router, not inline in manage.ts: extracted (2026-08-05,
// alongside versions.ts) to keep manage.ts under the 400-line split threshold
// — this route's search/filter/sort/score-subquery logic was ~170 lines on
// its own. Same "split when it grows, mirror the routes/jobs/ sub-router
// pattern" convention as render.ts/stream.ts/insights.ts/versions.ts.
import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.js';
import { db } from '../../db/index.js';
import { contentJobs, contentOutputs } from '../../db/schema.js';
import { eq, and, sql, ilike, desc, asc, inArray } from 'drizzle-orm';
import {
  jobsMemory,
  getJobFromStore,
  assembleJobFromDB,
  toClientJob,
  isValidUUID,
  type MemoryJob,
  type AssembledJob,
  requireAuthUserId,
} from './ownership.js';
import { VALID_PLATFORMS } from '../../schemas/index.js';
import { readOutputs } from '../content/shared.js';
import { getLatestQualityScore } from '../../lib/qualityScore.js';
import { isJobInFlightStatus } from '../../lib/jobInFlight.js';
import { isLiveFailedResult } from '../../lib/pipelineRepersist.js';

const router = Router({ mergeParams: true });

// WHY: zod coerce + bounds: `parseInt(page) || 1` accepted NaN/negative/huge
// offsets that wasted DB work; max 10_000 is far past any real Library UI need.
const listPageSchema = z.coerce.number().int().min(1).max(10_000);

// WHY: these two: FUNCTIONAL_AUDIT_2026-07.md finding #4 — Library.tsx's search box,
// platform pills, and sort dropdown previously only filtered/sorted whatever page of
// jobs happened to already be loaded (10 rows), silently missing everything on other
// pages. `search`/`platform` now run as real WHERE clauses in the DB query below;
// `sort` is applied DB-side for date/platform.
// WHY: sort=score was previously a special case: quality score lives on a joined
// contentOutputs row, not a contentJobs column, so a heavier two-step query was
// needed. As of 2026-08-04, sort=score is now a true global sort (not page-scoped)
// implemented via a LEFT JOIN score subquery — see the score branch below.
type JobSortKey = 'date' | 'score' | 'platform';

// GET / — paginated, searchable, filterable, sortable job list
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const pageParsed = listPageSchema.safeParse(req.query.page ?? 1);
    if (!pageParsed.success) {
      return res.status(400).json({
        error: 'page must be an integer between 1 and 10000',
        code: 'VALIDATION_ERROR',
        retryable: false,
      });
    }
    const page = pageParsed.data;
    const limit = 10;
    const userId = requireAuthUserId(req, res);
    if (!userId) return;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 500) : '';
    // SECURITY: escape ILIKE wildcards so a user typing % or _ can't broaden the match set.
    const searchPattern = search ? `%${search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%` : '';
    const platformFilter = typeof req.query.platform === 'string' && (VALID_PLATFORMS as readonly string[]).includes(req.query.platform)
      ? req.query.platform
      : undefined;
    const tagFilter = typeof req.query.tag === 'string' ? req.query.tag.trim().slice(0, 30) : '';
    const sort: JobSortKey = req.query.sort === 'score' || req.query.sort === 'platform' ? req.query.sort : 'date';
    // WHY: opt-out (`counts=0`): the platformCounts GROUP BY below costs a second
    // aggregate scan of the user's jobs on every list fetch, but Calendar (which
    // fetches up to 4 pages to build its month grid) never reads platformCounts —
    // it only consumes jobs/total/totalPages. Library is the only consumer that
    // renders the per-platform pills, so it stays on the default (counts included);
    // Calendar opts out to drop 4 redundant aggregate queries per page load (perf audit).
    const includePlatformCounts = req.query.counts !== '0';

    // WHY: the DB fetch always uses the fixed page `limit`, not a shrunk one:
    // an earlier version reserved room on page 1 for prepended in-flight
    // memory jobs by fetching fewer DB rows there (dbLimit = limit - count).
    // But every page's offset is still `(page - 1) * limit` — only page 1's
    // fetch size changed — so the DB rows in the gap between the shrunk
    // fetch and the next page's offset were permanently skipped, and
    // totalPages (computed from totalCount + memory jobs) disagreed between
    // page 1 and later pages. Fetching the full `limit` on every page and
    // trimming the combined list down to `limit` after prepending (below)
    // keeps offsets simple and consistent across all pages.
    // WHY: skip the jobsMemory scan when durable in-flight DB rows already
    // cover pending work (create persists pending before setJobInStore) —
    // avoids O(all users' jobsMemory) on every Library page-1 fetch.
    const runningMemJobs: MemoryJob[] = [];
    const wantMemMerge = page === 1 && !search && !platformFilter && !tagFilter;

    if (db && isValidUUID(userId)) {
      try {
        const whereClauses = [eq(contentJobs.userId, userId), eq(contentJobs.deleted, 0)];
        if (searchPattern) whereClauses.push(ilike(contentJobs.topic, searchPattern));
        if (platformFilter) whereClauses.push(eq(contentJobs.platform, platformFilter as (typeof VALID_PLATFORMS)[number]));
        if (tagFilter) whereClauses.push(eq(contentJobs.tag, tagFilter));
        const whereClause = and(...whereClauses);

        const [{ total: totalCount }] = await db
          .select({ total: sql<number>`cast(count(*) as int)` })
          .from(contentJobs)
          .where(whereClause);

        let platformCounts: Record<string, number> | undefined;
        let tagCounts: Record<string, number> | undefined;
        if (includePlatformCounts) {
          // WHY: a separate grouped query, ignoring platformFilter: this backs the
          // toolbar's per-platform pill badges (e.g. "LinkedIn 23"), which need the
          // true count for every platform regardless of which one is currently
          // selected — computing counts from only the already-platform-filtered
          // page would make every pill except the active one always read 0.
          const countWhereClauses = [eq(contentJobs.userId, userId), eq(contentJobs.deleted, 0)];
          if (searchPattern) countWhereClauses.push(ilike(contentJobs.topic, searchPattern));
          if (tagFilter) countWhereClauses.push(eq(contentJobs.tag, tagFilter));
          const platformCountRows = await db
            .select({ platform: contentJobs.platform, count: sql<number>`cast(count(*) as int)` })
            .from(contentJobs)
            .where(and(...countWhereClauses))
            .groupBy(contentJobs.platform);
          platformCounts = {};
          for (const row of platformCountRows) platformCounts[row.platform] = row.count;

          // WHY: ignore the active tagFilter here (same as platformCounts ignoring
          // platformFilter): pill badges need the full tag vocabulary for the
          // current search/platform scope so users can switch tags without the
          // other pills disappearing.
          const tagCountWhere = [eq(contentJobs.userId, userId), eq(contentJobs.deleted, 0)];
          if (searchPattern) tagCountWhere.push(ilike(contentJobs.topic, searchPattern));
          if (platformFilter) tagCountWhere.push(eq(contentJobs.platform, platformFilter as (typeof VALID_PLATFORMS)[number]));
          const tagCountRows = await db
            .select({ tag: contentJobs.tag, count: sql<number>`cast(count(*) as int)` })
            .from(contentJobs)
            .where(and(...tagCountWhere, sql`${contentJobs.tag} is not null`, sql`${contentJobs.tag} <> ''`))
            .groupBy(contentJobs.tag);
          tagCounts = {};
          for (const row of tagCountRows) {
            if (row.tag) tagCounts[row.tag] = row.count;
          }
        }

        // WHY: two-step for sort=score: qualityScore lives on contentOutputs
        // (final / critique), not on contentJobs — a LEFT JOIN subquery fetches
        // the per-job score for ordering, then a relational findMany loads
        // the full output data for those specific IDs. This is the fix for
        // FUTURE_FEATURES.md's "sort=score not a true global sort" — it was
        // previously an in-memory re-sort of whatever page was already fetched.
        // idx_content_outputs_job_type / type_job cover the subquery filters.
        let assembledDbJobs: ReturnType<typeof assembleJobFromDB>[];
        if (sort === 'score') {
          // WHY: the innerJoin on contentJobs + userId WHERE: without it the score
          // aggregate scanned EVERY critique/final row in the shared content_outputs
          // table (all users), then filtered the page later. Joining to the caller's
          // own jobs and filtering by userId + deleted in the subquery itself
          // restricts the aggregate to this user's data (perf audit).
          // WHY: prefer latest final.qualityScore, else latest critique — same
          // contract as getLatestQualityScore (CORR-004). MAX(critique) alone
          // sorted by peak retry score and ignored the delivered final.
          const scoreSubq = db
            .select({
              jobId: contentOutputs.jobId,
              score: sql<number>`COALESCE(
                MAX(CASE WHEN ${contentOutputs.outputType} = 'final' THEN ${contentOutputs.qualityScore} END),
                (
                  array_agg(${contentOutputs.qualityScore} ORDER BY ${contentOutputs.createdAt} DESC)
                  FILTER (
                    WHERE ${contentOutputs.outputType} = 'critique'
                    AND ${contentOutputs.qualityScore} IS NOT NULL
                  )
                )[1]
              )`.as('score'),
            })
            .from(contentOutputs)
            .innerJoin(contentJobs, eq(contentJobs.id, contentOutputs.jobId))
            .where(and(
              inArray(contentOutputs.outputType, ['final', 'critique']),
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
            // SECURITY: re-assert userId + deleted=0 even though orderedIds came
            // from a user-scoped first query — defense-in-depth if that filter
            // ever regresses (IDOR via crafted score-sort ID list).
            const fullJobs = await db.query.contentJobs.findMany({
              where: and(
                inArray(contentJobs.id, orderedIds),
                eq(contentJobs.userId, userId),
                eq(contentJobs.deleted, 0),
              ),
              with: { outputs: { columns: { agentName: true, outputType: true, qualityScore: true, partial: true } } },
            });
            // WHY: re-map by orderedIds: findMany doesn't preserve insertion order;
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

        // WHY: overlay memory-failed onto DB in-flight rows during
        // backgroundFailedRepersist — Library must not show pending while Result
        // already shows failed.
        assembledDbJobs = assembledDbJobs.map((job) => {
          const mem = getJobFromStore(job.id) || jobsMemory.get(job.id);
          if (mem && isLiveFailedResult(mem) && isJobInFlightStatus(job.status)) {
            return { ...job, status: 'failed' };
          }
          return job;
        });

        let finalJobs: Array<MemoryJob | AssembledJob> = assembledDbJobs;
        let finalTotal = totalCount;
        // WHY: page===1 only, and only when no search/filter is active: in-flight
        // memory-only jobs (not yet persisted) have no DB row to match a WHERE
        // clause against, so folding them into a filtered/searched result would be
        // inconsistent — they'd appear regardless of whether they actually match.
        // They still show up in the default (no search/filter) page-1 view, same
        // as before this fix.
        if (wantMemMerge) {
          // WHY: EXISTS-style probe — if any non-terminal DB row exists for this
          // user, skip jobsMemory entirely (durable pending already appears in
          // assembledDbJobs). Only scan memory when the DB has no in-flight work.
          const inFlightStatuses = [
            'pending',
            'researching',
            'writing',
            'formatting',
            'critiquing',
          ] as const;
          const [inFlight] = await db
            .select({ id: contentJobs.id })
            .from(contentJobs)
            .where(and(
              eq(contentJobs.userId, userId),
              eq(contentJobs.deleted, 0),
              inArray(contentJobs.status, [...inFlightStatuses]),
            ))
            .limit(1);

          if (!inFlight) {
            // WHY: single-pass for…of — never Array.from(values()) which
            // materializes every user's jobs before filtering.
            for (const j of jobsMemory.values()) {
              if (
                j.userId === userId
                && j.deleted !== 1
                && j.status !== 'done'
                && j.status !== 'failed'
              ) {
                runningMemJobs.push(j);
              }
            }
          }

          const assembledIds = new Set(assembledDbJobs.map((d) => d.id));
          const dedupedMemJobs = runningMemJobs.filter((j) => !assembledIds.has(j.id));
          if (dedupedMemJobs.length > 0) {
            // WHY: slice to `limit`: the DB fetch above always pulls a full page
            // (see the dbLimit removal note), so prepending memory jobs on top
            // can push the combined list past `limit` — trim here rather than
            // shrinking the DB fetch, which desynced offsets on later pages.
            finalJobs = [...dedupedMemJobs, ...assembledDbJobs].slice(0, limit);
            finalTotal += dedupedMemJobs.length;
          }
        }

        // WHY: still sort in-memory for score: in-flight memory jobs (prepended
        // above) have no qualityScore — they sort last (getJobScore returns -1).
        // The DB jobs are already in score order from the two-step query above;
        // this re-sort just ensures any prepended memory jobs end up after them.
        if (sort === 'score') {
          finalJobs = [...finalJobs].sort((a, b) => getJobScore(b) - getJobScore(a));
        }

        return res.json({
          // SECURITY: assembled rows still carry sourceMaterial for workers;
          // this response must not.
          jobs: finalJobs.map((job) => toClientJob(job)),
          total: finalTotal,
          page,
          totalPages: Math.ceil(finalTotal / limit),
          platformCounts,
          tagCounts,
        });
      } catch (dbErr) {
        // WHY: never return process-local jobsMemory as the Library list on a
        // Neon blip — that looked like a full (tiny) library and hid durable rows.
        console.error('[DB] GET /jobs failed:', dbErr);
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          code: 'DB_UNAVAILABLE',
          retryable: true,
        });
      }
    }

    // WHY: single-pass collect — no-DB / local-dev memory path only (db unset).
    // Must not allocate an array of every cross-user job before filtering.
    let allJobs: MemoryJob[] = [];
    for (const j of jobsMemory.values()) {
      if (j.deleted !== 1 && j.userId === userId) allJobs.push(j);
    }
    if (search) {
      const needle = search.toLowerCase();
      allJobs = allJobs.filter((j) => (j.topic || '').toLowerCase().includes(needle));
    }
    const memPlatformCounts: Record<string, number> = {};
    const memTagCounts: Record<string, number> = {};
    for (const j of allJobs) {
      memPlatformCounts[j.platform] = (memPlatformCounts[j.platform] || 0) + 1;
      const t = typeof j.tag === 'string' ? j.tag : '';
      if (t) memTagCounts[t] = (memTagCounts[t] || 0) + 1;
    }
    if (platformFilter) {
      allJobs = allJobs.filter((j) => j.platform === platformFilter);
    }
    if (tagFilter) {
      allJobs = allJobs.filter((j) => j.tag === tagFilter);
    }
    // WHY: new Date(j.createdAt ?? 0): a running in-memory job's createdAt is
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
    return res.json({
      jobs: jobs.map((job) => toClientJob(job)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      platformCounts: memPlatformCounts,
      tagCounts: memTagCounts,
    });
  } catch (error) {
    console.error('[GET /jobs] Unhandled error:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to fetch jobs', code: 'SERVER_ERROR', retryable: true });
  }
});

function getJobScore(job: MemoryJob | AssembledJob): number {
  // WHY: latest (CORR-004): align list sort with Result / Library score helpers.
  const score = getLatestQualityScore(readOutputs(job));
  return typeof score === 'number' ? score : -1;
}

export default router;
