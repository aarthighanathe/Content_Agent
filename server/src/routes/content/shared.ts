// WHY: thin re-export — canonical implementation lives in lib/contentHelpers.ts
// so workers and routes share helpers without workers → routes imports.
export {
  readOutputs,
  sanitizeContentDeep,
  parseAIJson,
  extractBalancedJson,
} from '../../lib/contentHelpers.js';
