// WHY: split into PartA/PartB: the CSS string alone exceeded the 400-line hard
// cap (CLAUDE.md). Library.tsx still imports LIBRARY_STYLES from this barrel.
import { LIBRARY_STYLES_A } from './libraryStylesPartA';
import { LIBRARY_STYLES_B } from './libraryStylesPartB';

export const LIBRARY_STYLES = `${LIBRARY_STYLES_A}${LIBRARY_STYLES_B}`;
