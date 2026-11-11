import { z } from 'zod';

// WHY every leaf field across agentResponses.ts/contentResponses.ts is wrapped
// in .catch(default) via these helpers rather than left as bare .optional():
// Zod's default behavior is all-or-nothing per object/array — ONE malformed
// field fails validation for the entire structure containing it (e.g. one bad
// field on one carousel slide would otherwise discard all 8 real slides).
// Applied uniformly via these two shared helpers so every schema across both
// files gets the same per-field tolerance from one implementation, instead of
// each file declaring its own copy that could quietly diverge (e.g. one
// picking up a max-length cap or a trim() and the other not).

// WHY NOT z.coerce.string(): on Zod 4, coerce runs String(undefined) →
// "undefined" and String(null) → "null" BEFORE .optional()/.catch, so an
// omitted hookAlt or tweet text was persisted as the literal word "undefined"
// and LinkedInContent treated it as a real A/B hook. z.string() rejects those
// and .catch('') supplies the empty default we actually want.
export const CS = () => z.string().catch('');

// WHY z.coerce.number for CN: numeric strings like "18" from the LLM should
// become 18 (critic previously used bare z.number().catch(0), which treated
// "18" as invalid and stored 0). Coerce is correct for numbers; the string
// bug above was specific to String(undefined).
export const CN = () => z.coerce.number().catch(0);
