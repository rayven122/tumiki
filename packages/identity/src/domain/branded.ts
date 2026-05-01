// Branded types: domain ID を構造的に区別する
// 同じ string 型でも UserId と GroupId は混同できないようにする

declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type TenantId = Brand<string, "TenantId">;
export type UserId = Brand<string, "UserId">;
export type IdentityId = Brand<string, "IdentityId">;
export type GroupId = Brand<string, "GroupId">;
export type PermissionId = Brand<string, "PermissionId">;

// 外部 IdP 由来の識別子。source と external_id の組で一意性を保つ
export type ExternalId = Brand<string, "ExternalId">;

// IdP 経路を表す source ID
// 形式: "<protocol>:<provider>" 例: "scim:okta", "saml:gws", "oidc:keycloak", "pull:gws-dir"
// JIT は "jit:<provider>"
export type SourceId = Brand<string, "SourceId">;

export const tenantId = (value: string): TenantId => value as TenantId;
export const userId = (value: string): UserId => value as UserId;
export const identityId = (value: string): IdentityId => value as IdentityId;
export const groupId = (value: string): GroupId => value as GroupId;
export const permissionId = (value: string): PermissionId =>
  value as PermissionId;
export const externalId = (value: string): ExternalId => value as ExternalId;
export const sourceId = (value: string): SourceId => value as SourceId;
