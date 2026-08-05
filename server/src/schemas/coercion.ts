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
export const CS = () => z.coerce.string().catch(''); // coerce-string-or-empty
export const CN = () => z.coerce.number().catch(0);  // coerce-number-or-zero
