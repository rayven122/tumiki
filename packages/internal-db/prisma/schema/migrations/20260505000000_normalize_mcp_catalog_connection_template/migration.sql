-- Align internal-manager MCP catalog connection templates with the Desktop catalog shape.
ALTER TABLE "McpCatalog"
  ADD COLUMN "command" TEXT,
  ADD COLUMN "args" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "url" TEXT;

UPDATE "McpCatalog"
SET
  "command" = CASE
    WHEN jsonb_typeof("configTemplate") = 'object'
      AND jsonb_typeof("configTemplate"->'command') = 'string'
    THEN "configTemplate"->>'command'
    ELSE NULL
  END,
  "url" = CASE
    WHEN jsonb_typeof("configTemplate") = 'object'
      AND jsonb_typeof("configTemplate"->'url') = 'string'
    THEN "configTemplate"->>'url'
    ELSE NULL
  END,
  "args" = CASE
    WHEN jsonb_typeof("configTemplate") = 'object'
      AND jsonb_typeof("configTemplate"->'args') = 'array'
    THEN ARRAY(
      SELECT jsonb_array_elements_text("configTemplate"->'args')
    )
    ELSE ARRAY[]::TEXT[]
  END;

ALTER TABLE "McpCatalog" DROP COLUMN "configTemplate";
