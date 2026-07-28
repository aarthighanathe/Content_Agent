/**
 * IDOR Security Test — AGContentAgent
 * =====================================
 * Verifies that every job route using :jobId enforces ownership.
 *
 * Strategy:
 *   1. Create a job as User A  (POST /api/jobs/create with tokenA)
 *   2. Wait briefly so the job lands in DB (or memory)
 *   3. Attempt GET, DELETE, PATCH, regenerate, and export as User B (tokenB)
 *   4. Every User B request must receive HTTP 404 — nothing else.
 *
 * Usage:
 *   node idor-test.mjs <tokenA> <tokenB>
 *
 * Obtain tokens from the browser:
 *   Open DevTools → Application → Cookies / Local Storage
 *   or copy from a network request's Authorization header (without "Bearer ").
 *
 * Both users must already exist in the DB (sign in at least once via the UI).
 */

const BASE = 'http://localhost:3001';

const [,, TOKEN_A, TOKEN_B] = process.argv;

if (!TOKEN_A || !TOKEN_B) {
  console.error('Usage: node idor-test.mjs <tokenA> <tokenB>');
  console.error('Both tokens must belong to DIFFERENT Clerk users already seeded in the DB.');
  process.exit(1);
}

if (TOKEN_A === TOKEN_B) {
  console.error('ERROR: tokenA and tokenB are identical — they must be for DIFFERENT users.');
  process.exit(1);
}

const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';

let passed = 0;
let failed = 0;

/**
 * Performs a fetch and returns { status, body }.
 * Handles JSON + non-JSON bodies gracefully.
 */
async function req(method, path, token, body) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, body: json };
}

/**
 * Assert that the response status is 404.
 */
function assert404(label, status, body) {
  if (status === 404) {
    console.log(`${PASS}  ${label} → 404`);
    passed++;
  } else {
    console.log(`${FAIL}  ${label} → got ${status} (expected 404)`);
    if (body) console.log('         body:', JSON.stringify(body).slice(0, 200));
    failed++;
  }
}

// ── Step 0: Smoke-test auth tokens ──────────────────────────────────────────
// Confirm both tokens are valid; /api/users/me doesn't expose user IDs
// so we verify distinctness by checking that both tokens are accepted and differ.
console.log('\n\x1b[1m[0] Verifying both tokens are valid Clerk JWTs…\x1b[0m');

const whoA = await req('GET', '/api/users/me', TOKEN_A);
const whoB = await req('GET', '/api/users/me', TOKEN_B);

if (whoA.status !== 200) {
  console.error(`${FAIL}  Token A rejected (HTTP ${whoA.status}) — ensure this is a valid Clerk JWT`);
  process.exit(1);
}
if (whoB.status !== 200) {
  console.error(`${FAIL}  Token B rejected (HTTP ${whoB.status}) — ensure this is a valid Clerk JWT`);
  process.exit(1);
}

console.log(`${PASS}  Token A accepted (200)`);
console.log(`${PASS}  Token B accepted (200)`);
console.log(`   Note: Confirm tokens belong to DIFFERENT Clerk accounts before trusting results.`);

// ── Step 1: Create a job as User A ──────────────────────────────────────────
console.log('\n\x1b[1m[1] Creating job as User A…\x1b[0m');

const createRes = await req('POST', '/api/jobs/create', TOKEN_A, {
  topic: 'IDOR Security Test Post — do not publish',
  platform: 'linkedin_post',
  tone: 'professional',
  targetAudience: 'security engineers',
});

if (createRes.status !== 201 || !createRes.body?.jobId) {
  console.error(`${FAIL}  Job creation failed: HTTP ${createRes.status}`);
  console.error('         body:', JSON.stringify(createRes.body));
  process.exit(1);
}

const JOB_ID = createRes.body.jobId;
console.log(`${PASS}  Job created: ${JOB_ID}`);

// Small wait to ensure DB write has had a chance to commit.
// In-memory store is immediate; DB persist is async but usually <200 ms.
await new Promise(r => setTimeout(r, 500));

// ── Step 2: Verify User A can actually read the job (sanity check) ──────────
console.log('\n\x1b[1m[2] Sanity: User A should read their own job (expect 200)…\x1b[0m');
const selfRead = await req('GET', `/api/jobs/${JOB_ID}`, TOKEN_A);
if (selfRead.status === 200) {
  console.log(`${PASS}  User A can read job → 200`);
} else {
  console.log(`\x1b[33m⚠️  WARN\x1b[0m  User A got ${selfRead.status} — job may not be fully persisted yet. Continuing IDOR tests.`);
}

// ── Step 3: IDOR tests as User B ────────────────────────────────────────────
console.log('\n\x1b[1m[3] IDOR tests — all must return 404 for User B…\x1b[0m');

// 3a. GET /api/jobs/:jobId
const getRes = await req('GET', `/api/jobs/${JOB_ID}`, TOKEN_B);
assert404('GET    /api/jobs/:jobId', getRes.status, getRes.body);

// 3b. DELETE /api/jobs/:jobId
const delRes = await req('DELETE', `/api/jobs/${JOB_ID}`, TOKEN_B);
assert404('DELETE /api/jobs/:jobId', delRes.status, delRes.body);

// 3c. PATCH /api/jobs/:jobId/content
const patchRes = await req('PATCH', `/api/jobs/${JOB_ID}/content`, TOKEN_B, { content: 'HACKED' });
assert404('PATCH  /api/jobs/:jobId/content', patchRes.status, patchRes.body);

// 3d. POST /api/jobs/:jobId/regenerate
const regenRes = await req('POST', `/api/jobs/${JOB_ID}/regenerate`, TOKEN_B, { feedback: 'test' });
assert404('POST   /api/jobs/:jobId/regenerate', regenRes.status, regenRes.body);

// 3e. POST /api/jobs/:jobId/export/carousel-png
//     (Will fail with 400 if ownership check passes — but it must fail with 404 first)
const exportRes = await req('POST', `/api/jobs/${JOB_ID}/export/carousel-png`, TOKEN_B, {
  theme: 'ocean',
  slides: [{ title: 'Hack', body: 'IDOR test' }],
});
assert404('POST   /api/jobs/:jobId/export/carousel-png', exportRes.status, exportRes.body);

// ── Step 4: Bonus — multiply route ──────────────────────────────────────────
console.log('\n\x1b[1m[4] Bonus: POST /api/jobs/:jobId/multiply (User B) → expect 404…\x1b[0m');
const mulRes = await req('POST', `/api/jobs/${JOB_ID}/multiply`, TOKEN_B, {
  targetPlatform: 'twitter_thread',
});
assert404('POST   /api/jobs/:jobId/multiply', mulRes.status, mulRes.body);

// ── Step 5: Bonus — render-slides route ─────────────────────────────────────
console.log('\n\x1b[1m[5] Bonus: POST /api/jobs/:jobId/render-slides (User B) → expect 404…\x1b[0m');
const renderRes = await req('POST', `/api/jobs/${JOB_ID}/render-slides`, TOKEN_B, {
  theme: 'ocean',
  slides: [{ title: 'Hack', body: 'IDOR test' }],
});
assert404('POST   /api/jobs/:jobId/render-slides', renderRes.status, renderRes.body);

// ── Step 6: Cleanup — delete the test job as User A ─────────────────────────
console.log('\n\x1b[1m[6] Cleanup: Delete test job as User A…\x1b[0m');
const cleanRes = await req('DELETE', `/api/jobs/${JOB_ID}`, TOKEN_A);
if (cleanRes.status === 200) {
  console.log(`${PASS}  Test job deleted.`);
} else {
  console.log(`\x1b[33m⚠️  WARN\x1b[0m  Could not delete test job (HTTP ${cleanRes.status}) — manual cleanup may be needed.`);
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(55));
const total = passed + failed;
if (failed === 0) {
  console.log(`\x1b[32m\x1b[1m🔒 ALL ${total}/${total} IDOR TESTS PASSED — ownership enforcement is correct.\x1b[0m`);
} else {
  console.log(`\x1b[31m\x1b[1m⚠️  ${failed}/${total} TESTS FAILED — IDOR vulnerability detected!\x1b[0m`);
  process.exit(1);
}
