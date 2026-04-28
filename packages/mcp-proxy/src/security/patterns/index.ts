import type { PIIPattern } from "openredaction";

import { japanPatterns } from "./japan.js";
import { curatedSecretPatterns } from "./secrets-curated.js";

export { japanPatterns } from "./japan.js";
export { curatedSecretPatterns } from "./secrets-curated.js";
// 後方互換: 旧 secretPatterns 名で参照しているコード向け（DEV-1584 までの呼称）
export { curatedSecretPatterns as secretPatterns } from "./secrets-curated.js";

// OpenRedaction に customPatterns として渡すための束ね
// curated TOML 由来の vendor シークレット + TS 直書きの日本特化 PII
export const allCustomPatterns: PIIPattern[] = [
  ...curatedSecretPatterns,
  ...japanPatterns,
];
