-- Remove unique constraints to allow multiple configurations and OAuth accounts
-- This enables users to create multiple MCP server configurations with different:
-- - Environment variables (API keys, tokens, etc.)
-- - OAuth accounts (different credentials for the same service)

-- Step 1: Remove unique constraint from McpConfig
-- Allows multiple configurations for the same MCP server template per user/organization
DROP INDEX IF EXISTS "McpConfig_mcpServerTemplateId_organizationId_userId_key";

-- Step 2: Remove unique constraint from McpOAuthToken
-- Allows multiple OAuth tokens for the same client per user/organization
-- Note: The actual index name is truncated by PostgreSQL
DROP INDEX IF EXISTS "McpOAuthToken_userId_organizationId_oauthClientId_tokenPurp_key";
