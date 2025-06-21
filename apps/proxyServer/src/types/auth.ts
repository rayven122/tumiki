import type { Request, Response } from "express";
import type { AuthUser } from "@tumiki/auth";
import type { MCPAuthInfo } from "../auth/oauth-verifier.js";

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export interface AuthenticatedWithJWTRequest extends AuthenticatedRequest {
  jwt: string;
}

/**
 * MCP認証情報付きのリクエスト
 * MCP SDKの標準仕様に準拠
 */
export interface MCPAuthenticatedRequest extends AuthenticatedRequest {
  auth: MCPAuthInfo;
}

export interface AuthenticatedResponse extends Response {
  locals: {
    user?: AuthUser;
    jwt?: string;
  };
}

/**
 * OAuth Client情報
 */
export interface OAuthClientInfo {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  response_types: string[];
  grant_types: string[];
  scope?: string;
}

/**
 * OAuth Authorization Request
 */
export interface OAuthAuthorizationRequest {
  client_id: string;
  response_type: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}