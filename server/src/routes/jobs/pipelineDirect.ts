// WHY: thin re-export — canonical implementation lives in lib/pipelineDirect.ts
// so lib/repurposeJobs (and other non-route callers) can run direct-mode
// pipelines without lib → routes. create.ts keeps importing this path.
export {
  runPipelineDirect,
  DirectPipelineOverloadedError,
} from '../../lib/pipelineDirect.js';
