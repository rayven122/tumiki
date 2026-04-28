export { createRedactionFilter } from "./redaction-filter.js";
export type {
  RedactionPolicy,
  RedactionFilterOptions,
} from "./redaction-filter.js";
export { createFileLogger, combineLoggers } from "./file-logger.js";
export {
  DEFAULT_PII_MASKING_ENABLED,
  DEFAULT_REDACTION_POLICY,
  DEFAULT_REDACTOR_OPTIONS,
  DEFAULT_ALLOWLIST_TOOLS,
} from "./config.js";
export {
  allCustomPatterns,
  japanPatterns,
  secretPatterns,
} from "./patterns/index.js";
