import type { PIIPattern } from "openredaction";

import { japanPatterns } from "./japan.js";
import { secretPatterns } from "./secrets.js";

export { japanPatterns } from "./japan.js";
export { secretPatterns } from "./secrets.js";

// OpenRedaction に customPatterns として渡すための束ね
export const allCustomPatterns: PIIPattern[] = [
  ...japanPatterns,
  ...secretPatterns,
];
