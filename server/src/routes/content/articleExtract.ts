// WHY: thin re-export — canonical implementation lives in lib/articleExtract.ts
// so feed monitors and repurpose routes share one fetch/extract path.
export {
  fetchAndExtractArticle,
  buildSourceMaterial,
  type ExtractedArticle,
} from '../../lib/articleExtract.js';
