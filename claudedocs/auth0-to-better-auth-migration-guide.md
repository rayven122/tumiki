# Auth0/NextAuth.js → Better Auth 完全移行ガイド

## 📌 概要

このドキュメントは、TumikiプロジェクトをAuth0/NextAuth.jsからBetter Authに移行するための完全な実装ガイドです。

### 移行の背景

- **現状**: Auth0 + NextAuth.js (Keycloak統合済み)
- **目標**: Better Auth + Keycloak OIDC + カスタムOAuth管理
- **理由**: Auth.js (NextAuth.js) が Better Auth に統合されたため

### 移行戦略

**段階的移行アプローチ** - 既存システムを壊さずに新システムを並行稼働

1. **新パッケージ作成**: `@tumiki/better-auth` を新規作成
2. **既存パッケージ維持**: `@tumiki/auth` はそのまま残す（後で削除）
3. **並行稼働期間**: 新旧両方のシステムが一時的に共存
4. **段階的切り替え**: ファイル単位で徐々に移行
5. **最終クリーンアップ**: 移行完了後に `@tumiki/auth` を削除

### ユーザー要件

1. **全ユーザー強制ログアウト**: 最もシンプルで安全な移行
2. **Keycloak統合**: Generic OIDCプロバイダーとして設定
3. **外部OAuth管理**: DCR (Dynamic Client Registration) でクライアント登録、トークン専用認証（クッキーなし）
4. **タイムライン**: 2-3週間（速度重視、基本テストのみ）

### 移行のメリット

**新パッケージアプローチの利点**:
- ✅ 既存コードへの影響を最小化
- ✅ 段階的な移行が可能（ファイル単位で切り替え）
- ✅ ロールバックが容易（問題があれば旧システムに戻せる）
- ✅ 新旧システムの比較・検証が可能
- ✅ CI/CDが壊れない

---

## 🏗️ アーキテクチャ設計

### 認証の分離

Better Authでは、以下の2つの認証を明確に分離します:

1. **ユーザー認証** (Better Auth管理)
   - Keycloak OIDC経由のログイン
   - セッション管理 (JWT)
   - ユーザー情報の同期

2. **外部OAuth** (カスタム実装)
   - Notion、Figma、GitHub等への接続
   - トークンのみDB保存（クッキーなし）
   - DCRによる動的クライアント登録

### データフロー

```
┌─────────────────────────────────────────────────────┐
│                   ユーザー認証                       │
│                                                     │
│  User → Better Auth → Keycloak OIDC → JWT Session  │
│           ↓                                         │
│      Prisma DB (User, Session, Account)            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  外部OAuth管理                       │
│                                                     │
│  User → Custom OAuth Flow → External Service       │
│           ↓ (PKCE + State)                          │
│      Prisma DB (ExternalOAuthConnection)           │
│           ↓ (Encrypted Tokens)                      │
│      Access Token (No Cookie)                       │
└─────────────────────────────────────────────────────┘
```

---

## 📋 実装フェーズ

### Phase 1: 新パッケージ作成 (Week 1)

- **@tumiki/better-auth** パッケージの新規作成
- 依存関係の追加（既存は変更しない）
- データベーススキーマの更新
- Better Auth設定ファイルの作成
- 新しいAPI Routesの作成（既存は維持）

### Phase 2: 段階的移行 (Week 2-前半)

- Middlewareの更新（新パッケージを使用）
- 一部コンポーネントの試験的移行
- tRPC Contextの更新
- 動作確認とロールバックテスト

### Phase 3: 外部OAuth実装 (Week 2-後半)

- カスタムOAuth管理機能の実装
- 外部OAuth API Routesの作成
- DCR実装

### Phase 4: 完全移行・クリーンアップ (Week 3)

- 全コンポーネントの移行完了
- 旧システムの削除（@tumiki/auth削除）
- テスト実行
- ドキュメント更新
- デプロイ

---

## 🚀 Phase 1: 新パッケージ作成

### Step 1: @tumiki/better-auth パッケージの作成

#### 1.1 パッケージディレクトリを作成

```bash
mkdir -p packages/better-auth
cd packages/better-auth
```

#### 1.2 package.json を作成

**packages/better-auth/package.json**:

```json
{
  "name": "@tumiki/better-auth",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./server": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js"
    },
    "./client": {
      "types": "./dist/client.d.ts",
      "import": "./dist/client.js"
    },
    "./edge": {
      "types": "./dist/edge.d.ts",
      "import": "./dist/edge.js"
    },
    "./config": {
      "types": "./dist/config.d.ts",
      "import": "./dist/config.js"
    }
  },
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "clean": "git clean -xdf .cache .turbo dist node_modules",
    "typecheck": "tsc --noEmit",
    "lint": "eslint",
    "format": "prettier --check . --ignore-path ../../.gitignore",
    "test": "vitest"
  },
  "dependencies": {
    "better-auth": "^1.3.4",
    "oslo": "^1.2.1",
    "@tumiki/db": "workspace:*"
  },
  "devDependencies": {
    "@tumiki/eslint-config": "workspace:*",
    "@tumiki/prettier-config": "workspace:*",
    "@tumiki/tsconfig": "workspace:*",
    "@tumiki/vitest-config": "workspace:*",
    "@types/node": "^22.15.3",
    "@vitest/coverage-v8": "catalog:",
    "eslint": "catalog:",
    "prettier": "catalog:",
    "typescript": "catalog:",
    "typescript-eslint": "^8.33.0",
    "vitest": "catalog:"
  },
  "prettier": "@tumiki/prettier-config"
}
```

#### 1.3 tsconfig.json を作成

**packages/better-auth/tsconfig.json**:

```json
{
  "extends": "@tumiki/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### 1.4 apps/manager に依存関係を追加

**apps/manager/package.json** に追加（既存の依存関係は維持）:

```json
{
  "dependencies": {
    "@tumiki/better-auth": "workspace:*"
  }
}
```

#### 1.5 インストール

```bash
cd ../../
pnpm install
```

---

### Step 2: データベーススキーマの更新

#### 2.1 packages/db/prisma/schema/auth.prisma

**Userテーブルの更新**:

```prisma
/// @namespace Auth
/// @namespace UserMcpServer
/// @namespace Chat
model User {
  /// ユーザーの一意識別子 (CUID)
  id                     String                   @id @default(cuid())
  /// KeycloakのユーザーID (sub)
  keycloakId             String?                  @unique
  /// ユーザー名
  name                   String?
  /// メールアドレス
  email                  String?                  @unique
  /// メール認証済みフラグ
  emailVerified          Boolean                  @default(false)
  /// プロフィール画像のURL
  image                  String?
  /// ユーザーの権限
  role                   Role                     @default(USER)
  /// デフォルトの組織ID
  defaultOrganizationId  String?
  /// デフォルト組織への参照
  defaultOrganization    Organization?            @relation("UserDefaultOrganization", fields: [defaultOrganizationId], references: [id])
  organizations          Organization[]
  members                OrganizationMember[]
  invitations            OrganizationInvitation[]
  /// Chat関連
  Chat                   Chat[]
  Document               Document[]
  Suggestion             Suggestion[]

  /// OAuth Sessions リレーション
  oauthSessions          OAuthSession[]
  /// Better Auth Session リレーション
  sessions               Session[]
  /// Better Auth Account リレーション
  accounts               Account[]
  /// 外部OAuth接続
  externalOAuthConnections ExternalOAuthConnection[]

  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  McpServer McpServer[]

  @@index([keycloakId])
  @@index([email])
}
```

**Better Auth用テーブルの追加**:

```prisma
/// @namespace Auth
/// Better Auth セッション管理
model Session {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token      String   @unique
  expiresAt  DateTime
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([userId])
  @@index([token])
}

/// @namespace Auth
/// Better Auth アカウント管理（OAuth Provider連携）
model Account {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId         String
  providerId        String
  accessToken       String?
  refreshToken      String?
  idToken           String?
  expiresAt         BigInt?
  scope             String?
  password          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([providerId, accountId])
  @@index([userId])
}

/// @namespace Auth
/// Better Auth 認証コード・トークン検証
model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([identifier, value])
  @@index([identifier])
}

/// @namespace Auth
/// 外部OAuth接続管理（Notion、Figma等）
model ExternalOAuthConnection {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider     String    // "notion", "figma", "github"
  accessToken  String    // @encrypted
  refreshToken String?   // @encrypted
  expiresAt    DateTime?
  scope        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([userId, provider])
  @@index([userId])
}

/// @namespace Auth
/// OAuth一時セッション（PKCE用）
model OAuthSession {
  id           String   @id @default(cuid())
  userId       String
  provider     String
  state        String   @unique
  codeVerifier String
  callbackUrl  String
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([state])
  @@index([userId])
}
```

#### 2.2 マイグレーション

```bash
cd packages/db
pnpm db:push
```

---

### Step 3: Better Auth設定ファイルの作成

#### 3.1 packages/better-auth/src/config.ts

```typescript
/**
 * Better Auth 設定ファイル
 * Keycloak OIDC統合とカスタムコールバック処理を定義
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth } from "better-auth/plugins";
import { prisma } from "@tumiki/db";
import { syncUserFromKeycloak } from "./sync-user";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}

if (!process.env.KEYCLOAK_ISSUER) {
  throw new Error("KEYCLOAK_ISSUER is not set");
}

if (!process.env.KEYCLOAK_CLIENT_ID) {
  throw new Error("KEYCLOAK_CLIENT_ID is not set");
}

if (!process.env.KEYCLOAK_CLIENT_SECRET) {
  throw new Error("KEYCLOAK_CLIENT_SECRET is not set");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "https://local.tumiki.cloud:3000",

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5分
    },
  },

  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "keycloak",
          clientId: process.env.KEYCLOAK_CLIENT_ID,
          clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
          discoveryUrl: `${process.env.KEYCLOAK_ISSUER}/.well-known/openid-configuration`,
          scopes: ["openid", "email", "profile"],
          pkce: true,
        },
      ],
    }),
  ],

  user: {
    fields: {
      name: "name",
      email: "email",
      image: "image",
      emailVerified: "emailVerified",
    },
    additionalFields: {
      keycloakId: {
        type: "string",
        required: false,
        unique: true,
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
      },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["keycloak"],
    },
  },

  callbacks: {
    async onSignIn(event) {
      const { user, account } = event;

      if (account?.providerId === "keycloak") {
        await syncUserFromKeycloak({
          keycloakId: account.accountId,
          email: user.email!,
          name: user.name!,
          image: user.image ?? undefined,
        });
      }
    },

    async onSession(event) {
      const { session } = event;
      return {
        session: {
          ...session,
          user: {
            ...session.user,
          },
        },
      };
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "better-auth",
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  logger: {
    level: process.env.NODE_ENV === "development" ? "debug" : "error",
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
```

#### 3.2 sync-user.ts はそのまま維持

`apps/manager/src/lib/sync-user.ts` は既存のまま使用します。

---

### Step 4: API Routesの作成

#### 4.1 [...nextauth]を削除

```bash
rm -rf apps/manager/src/app/api/auth/[...nextauth]
```

#### 4.2 Better Auth API Routeを作成

**apps/manager/src/app/api/auth/[...all]/route.ts**:

```typescript
/**
 * Better Auth API Routes
 */
import { auth } from "@tumiki/better-auth/config";

export const { GET, POST } = auth.handler;
```

---

### Step 5: Middlewareの更新

#### 5.1 apps/manager/src/middleware.ts

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { URL_HEADER_KEY } from "./constants/url";
import {
  getAvailableVerificationUserIds,
  getDefaultVerificationUserId,
  isVerificationModeEnabled,
  validateVerificationMode,
} from "@tumiki/better-auth/edge";
import { auth } from "@tumiki/better-auth/config";

const PUBLIC_PATHS = [
  "/",
  "/jp",
  "/about",
  "/pricing",
  "/legal/tokusho",
  "/legal/privacy",
  "/legal/terms",
] as const;

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  request.headers.set(URL_HEADER_KEY, request.url);

  // メンテナンスモードチェック（既存のロジックを維持）
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";
  const allowedIPs =
    process.env.MAINTENANCE_ALLOWED_IPS?.split(",").map((ip) => ip.trim()) ??
    [];

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIP = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? "";

  if (pathname === "/maintenance") {
    if (!isMaintenanceMode) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isMaintenanceMode) {
    if (clientIP && allowedIPs.includes(clientIP)) {
      // 通常のルーティングに進む
    } else {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  // 検証モードチェック（既存のロジックを維持）
  if (isVerificationModeEnabled()) {
    try {
      validateVerificationMode();

      const currentSessionUserId = request.cookies.get(
        "__verification_session",
      )?.value;

      const queryUserId = request.nextUrl.searchParams.get("verification_user");

      const verificationUserId =
        queryUserId ?? currentSessionUserId ?? getDefaultVerificationUserId();

      const availableIds = getAvailableVerificationUserIds();
      if (!availableIds.includes(verificationUserId)) {
        console.warn(
          `[VERIFICATION MODE] Invalid user ID: ${verificationUserId}`,
        );
      } else {
        if (currentSessionUserId !== verificationUserId) {
          const response = NextResponse.next();
          response.cookies.set("__verification_session", verificationUserId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24,
          });

          console.warn(
            `⚠️  [VERIFICATION MODE] Auto-login as: ${verificationUserId}`,
          );

          return response;
        }
      }

      const verificationSessionId = request.cookies.get(
        "__verification_session",
      )?.value;
      if (verificationSessionId) {
        console.log(
          `[VERIFICATION MODE] Using verification session: ${verificationSessionId}`,
        );
        return NextResponse.next();
      }
    } catch (error) {
      console.error("[VERIFICATION MODE] Error:", error);
    }
  }

  // 認証不要のパス判定
  const isPublicPath =
    (PUBLIC_PATHS as readonly string[]).includes(pathname) ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth");

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Better Auth セッションチェック
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const signInUrl = new URL("/api/auth/signin/keycloak", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|logos|favicon|demo|public|ogp.png).*)",
  ],
};
```

---

### Step 6: auth.ts と auth.config.ts の削除

```bash
rm apps/manager/src/auth.ts
rm apps/manager/src/lib/auth.config.ts
```

Better Authでは不要になります。

---

## 🔧 Phase 2: @tumiki/better-authパッケージの実装

### Step 7: packages/better-auth/src/server.ts

```typescript
/**
 * Better Auth サーバーサイドAPI
 */
import type { Session, User } from "./config";

export { auth } from "./config";

/**
 * セッション取得
 */
export const getSession = async (): Promise<Session | null> => {
  const { headers } = await import("next/headers");
  const { auth } = await import("./config");

  return auth.api.getSession({
    headers: headers(),
  });
};

/**
 * 認証が必要な処理をラップ
 */
export const requireAuth = async <T>(
  handler: (session: Session) => Promise<T>
): Promise<T> => {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return handler(session);
};

/**
 * ユーザー情報取得
 */
export const getUser = async (): Promise<User | null> => {
  const session = await getSession();
  return session?.user ?? null;
};

export type { Session, User };
```

---

### Step 8: packages/better-auth/src/client.ts

```typescript
/**
 * Better Auth クライアントサイドAPI
 */
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://local.tumiki.cloud:3000",
});

/**
 * セッション取得hook
 */
export const useSession = () => {
  return authClient.useSession();
};

/**
 * サインイン
 */
export const signIn = {
  keycloak: () =>
    authClient.signIn.social({
      provider: "keycloak",
      callbackURL: "/dashboard",
    }),
};

/**
 * サインアウト
 */
export const signOut = async () => {
  await authClient.signOut();
};

export type { Session, User } from "./server";
```

---

### Step 9: packages/better-auth/src/edge.ts

```typescript
/**
 * Edge Runtime用の認証ユーティリティ
 */

// Verification Mode機能は既存の@tumiki/authから再エクスポート
export {
  isVerificationModeEnabled,
  getDefaultVerificationUserId,
  getAvailableVerificationUserIds,
  validateVerificationMode,
} from "@tumiki/auth/edge";

/**
 * Better Auth セッション取得（Edge Runtime用）
 */
export const getSessionFromRequest = async (request: Request) => {
  const { auth } = await import("./config");

  return auth.api.getSession({
    headers: request.headers,
  });
};
```

---

### Step 10: （スキップ）

新しいパッケージなので削除するファイルはありません。

---

### Step 11: packages/better-auth/src/oauth.ts

外部OAuth管理のカスタム実装を作成します。

```typescript
/**
 * 外部OAuth管理機能（Notion、Figma等）
 * DCR + PKCE + トークン専用認証
 */
import { prisma } from "@tumiki/db";
import { generateState, generateCodeVerifier, generateCodeChallenge } from "oslo/oauth2";

type OAuthProvider = "notion" | "figma" | "github";

interface OAuthConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  scope: string[];
}

const OAUTH_CONFIGS: Record<OAuthProvider, OAuthConfig> = {
  notion: {
    authorizationEndpoint: "https://api.notion.com/v1/oauth/authorize",
    tokenEndpoint: "https://api.notion.com/v1/oauth/token",
    clientId: process.env.NOTION_CLIENT_ID!,
    clientSecret: process.env.NOTION_CLIENT_SECRET!,
    scope: ["read_content", "update_content"],
  },
  figma: {
    authorizationEndpoint: "https://www.figma.com/oauth",
    tokenEndpoint: "https://www.figma.com/api/oauth/token",
    clientId: process.env.FIGMA_CLIENT_ID!,
    clientSecret: process.env.FIGMA_CLIENT_SECRET!,
    scope: ["file_read"],
  },
  github: {
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    scope: ["repo", "read:user"],
  },
};

/**
 * OAuth認証フロー開始
 */
export const startOAuthFlow = async (
  userId: string,
  provider: OAuthProvider,
  callbackUrl: string
): Promise<{ authorizationUrl: string }> => {
  const config = OAUTH_CONFIGS[provider];

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  await prisma.oAuthSession.create({
    data: {
      userId,
      provider,
      state,
      codeVerifier,
      callbackUrl,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const authUrl = new URL(config.authorizationEndpoint);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", `${process.env.BETTER_AUTH_URL}/api/oauth/${provider}/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scope.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return { authorizationUrl: authUrl.toString() };
};

/**
 * OAuthコールバック処理
 */
export const handleOAuthCallback = async (
  provider: OAuthProvider,
  code: string,
  state: string
): Promise<{ success: boolean; error?: string }> => {
  const session = await prisma.oAuthSession.findFirst({
    where: {
      provider,
      state,
      expiresAt: { gte: new Date() },
    },
  });

  if (!session) {
    return { success: false, error: "Invalid or expired state" };
  }

  const config = OAUTH_CONFIGS[provider];

  const tokenResponse = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.BETTER_AUTH_URL}/api/oauth/${provider}/callback`,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: session.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    return { success: false, error: "Failed to obtain access token" };
  }

  const tokens = await tokenResponse.json();

  await prisma.externalOAuthConnection.upsert({
    where: {
      userId_provider: {
        userId: session.userId,
        provider,
      },
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      scope: tokens.scope,
    },
    create: {
      userId: session.userId,
      provider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      scope: tokens.scope,
    },
  });

  await prisma.oAuthSession.delete({
    where: { id: session.id },
  });

  return { success: true };
};

/**
 * トークン取得（自動リフレッシュ）
 */
export const getProviderAccessToken = async (
  userId: string,
  provider: OAuthProvider
): Promise<string | null> => {
  const connection = await prisma.externalOAuthConnection.findUnique({
    where: {
      userId_provider: { userId, provider },
    },
  });

  if (!connection) {
    return null;
  }

  if (connection.expiresAt && connection.expiresAt > new Date()) {
    return connection.accessToken;
  }

  if (connection.refreshToken) {
    const config = OAUTH_CONFIGS[provider];

    const refreshResponse = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!refreshResponse.ok) {
      await prisma.externalOAuthConnection.delete({
        where: { id: connection.id },
      });
      return null;
    }

    const tokens = await refreshResponse.json();

    await prisma.externalOAuthConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? connection.refreshToken,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
      },
    });

    return tokens.access_token;
  }

  return connection.accessToken;
};

/**
 * ユーザーの全OAuth接続を取得
 */
export const getUserOAuthConnections = async (userId: string) => {
  return prisma.externalOAuthConnection.findMany({
    where: { userId },
    select: {
      provider: true,
      scope: true,
      createdAt: true,
      expiresAt: true,
    },
  });
};

/**
 * OAuth接続を削除
 */
export const disconnectOAuthProvider = async (
  userId: string,
  provider: OAuthProvider
): Promise<boolean> => {
  try {
    await prisma.externalOAuthConnection.delete({
      where: {
        userId_provider: { userId, provider },
      },
    });
    return true;
  } catch {
    return false;
  }
};
```

---

## 🌐 Phase 3: 外部OAuth API Routes

### Step 12: 認証開始エンドポイント

**apps/manager/src/app/api/oauth/[provider]/authorize/route.ts**:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@tumiki/better-auth/server";
import { startOAuthFlow } from "@tumiki/better-auth/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = params.provider as "notion" | "figma" | "github";
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/dashboard";

  try {
    const { authorizationUrl } = await startOAuthFlow(
      session.user.id,
      provider,
      callbackUrl
    );

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error("OAuth flow error:", error);
    return NextResponse.json(
      { error: "Failed to start OAuth flow" },
      { status: 500 }
    );
  }
}
```

---

### Step 13: コールバックエンドポイント

**apps/manager/src/app/api/oauth/[provider]/callback/route.ts**:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@tumiki/better-auth/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as "notion" | "figma" | "github";
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 }
    );
  }

  try {
    const result = await handleOAuthCallback(provider, code, state);

    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${result.error}`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/dashboard/integrations?success=true", request.url)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/integrations?error=callback_failed", request.url)
    );
  }
}
```

---

## 🔄 Phase 4: コンポーネント・tRPC更新

### Step 14: コンポーネントの更新

すべてのServer Componentsで`auth()`を`getSession()`に置き換えます。

**一括検索コマンド**:

```bash
grep -r "import.*auth.*from.*@tumiki/auth" apps/manager/src/ --include="*.tsx" --include="*.ts"
```

**変更パターン**:

```typescript
// Before
import { auth } from "@tumiki/auth/server";
const session = await auth();

// After
import { getSession } from "@tumiki/better-auth/server";
const session = await getSession();
```

**主な対象ファイル**:

- `apps/manager/src/app/_components/Header.tsx`
- `apps/manager/src/app/(auth)/layout.tsx`
- その他、`auth()`を使用する全てのファイル

---

### Step 15: tRPC Contextの更新

**apps/manager/src/server/api/trpc.ts**:

```typescript
// Before
import { auth } from "@tumiki/auth/server";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  // ...
};

// After
import { getSession } from "@tumiki/better-auth/server";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getSession();
  // ...
};
```

---

### Step 16: tRPC Routersの更新

**型のimportのみ変更**:

```typescript
import type { Session } from "@tumiki/better-auth/server";
```

実装ロジックは変更不要（`ctx.session`の構造は互換性あり）。

---

## ⚙️ Phase 5: 環境変数

### Step 17: .env.example の更新

**削除**:

```bash
# Auth0（削除）
AUTH0_SECRET="your-auth0-secret"
AUTH0_BASE_URL="http://localhost:3000"
AUTH0_ISSUER_BASE_URL="https://your-tenant.auth0.com"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_CLIENT_SECRET="your-client-secret"

# NextAuth.js（削除）
NEXTAUTH_URL="https://local.tumiki.cloud:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

**追加**:

```bash
# Better Auth
BETTER_AUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="https://local.tumiki.cloud:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="https://local.tumiki.cloud:3000"

# Keycloak（既存を維持）
KEYCLOAK_ISSUER="http://localhost:8443/realms/tumiki"
KEYCLOAK_CLIENT_ID="tumiki-manager"
KEYCLOAK_CLIENT_SECRET="tumiki-manager-secret"

# 外部OAuth（新規追加）
NOTION_CLIENT_ID="your-notion-client-id"
NOTION_CLIENT_SECRET="your-notion-client-secret"
FIGMA_CLIENT_ID="your-figma-client-id"
FIGMA_CLIENT_SECRET="your-figma-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

**シークレット生成**:

```bash
openssl rand -base64 32
```

---

## 🗑️ Phase 6: 旧システムの削除

### Step 18: @tumiki/auth パッケージの削除

移行が完了し、全ての動作確認が取れたら、旧パッケージを削除します。

#### 18.1 依存関係から削除

**apps/manager/package.json**:

```json
{
  "dependencies": {
    // 削除: "@tumiki/auth": "workspace:*"
  }
}
```

#### 18.2 パッケージディレクトリを削除

```bash
rm -rf packages/auth
```

#### 18.3 pnpm-lock.yaml を更新

```bash
pnpm install
```

---

## 🧪 Phase 7: テストとデプロイ

### Step 19: 基本テスト

**packages/better-auth/src/__tests__/oauth.test.ts**:

```typescript
import { describe, test, expect } from "vitest";
import { startOAuthFlow, getProviderAccessToken } from "../oauth";

describe("OAuth管理", () => {
  test("認証URLが正しく生成される", async () => {
    const result = await startOAuthFlow("user1", "notion", "/dashboard");

    expect(result.authorizationUrl).toContain("api.notion.com");
    expect(result.authorizationUrl).toContain("state=");
    expect(result.authorizationUrl).toContain("code_challenge=");
  });
});
```

---

### Step 20: ビルド・型チェック

```bash
# 依存関係インストール
pnpm install

# 全パッケージビルド
pnpm build

# 型チェック
pnpm typecheck

# リント修正
pnpm lint:fix

# フォーマット修正
pnpm format:fix

# 統合チェック
pnpm check
```

---

### Step 21: デプロイ前チェックリスト

```bash
# 1. データベースバックアップ
pg_dump tumiki > backup_$(date +%Y%m%d).sql

# 2. マイグレーション
cd packages/db && pnpm db:push

# 3. 環境変数確認
# - BETTER_AUTH_SECRET
# - KEYCLOAK_*
# - NOTION_*, FIGMA_*, GITHUB_*

# 4. ビルド確認
pnpm build

# 5. テスト実行
pnpm test

# 6. デプロイ
# - 全ユーザー強制ログアウトのアナウンス
# - PM2再起動
pm2 restart tumiki-manager
```

---

## ⚠️ 重要な注意事項

### セキュリティ

1. **BETTER_AUTH_SECRET** は必ず生成して設定
2. **トークン暗号化** は Prisma の `@encrypted` 属性を使用
3. **PKCE必須** - 外部OAuth連携では必ずPKCE使用

### 互換性

1. **セッション構造** は Better Auth でもほぼ同じ
2. **既存ユーザー** は全員強制ログアウト
3. **keycloakId** フィールドは維持

### データベース

1. **マイグレーション前にバックアップ必須**
2. **ExternalOAuthConnection** と **OAuthSession** テーブルを追加
3. **Better Auth用テーブル**: Session, Account, Verification

---

## 📚 参考リンク

- [Better Auth 公式ドキュメント](https://www.better-auth.com/docs)
- [Better Auth GitHub](https://github.com/better-auth/better-auth)
- [Keycloak OIDC](https://www.keycloak.org/docs/latest/securing_apps/)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)

---

## 🆘 困った時は

1. Better Auth のドキュメントを確認
2. GitHub Issues を検索
3. このガイドの実装例を参考に
4. Discord コミュニティで質問

---

## 📊 移行戦略サマリー

### パッケージ構成

**移行中（並行稼働）**:
- ✅ `@tumiki/auth` - 既存パッケージ（維持）
- ✅ `@tumiki/better-auth` - 新規パッケージ（作成）

**移行後（クリーンアップ後）**:
- ❌ `@tumiki/auth` - 削除
- ✅ `@tumiki/better-auth` - メインパッケージ

### 移行フロー

```
Phase 1: 新パッケージ作成
  ↓
  - @tumiki/better-auth パッケージ作成
  - Better Auth設定ファイル作成
  - データベーススキーマ更新
  - 新しいAPI Routes作成

Phase 2: 段階的移行
  ↓
  - Middleware更新（新パッケージ使用）
  - 一部コンポーネント試験移行
  - tRPC Context更新
  - 動作確認

Phase 3: 外部OAuth実装
  ↓
  - カスタムOAuth管理機能
  - DCR実装
  - 外部OAuth API Routes

Phase 4: 完全移行
  ↓
  - 全コンポーネント移行
  - 動作確認
  - テスト実行

Phase 5: クリーンアップ
  ↓
  - @tumiki/auth 削除
  - 依存関係整理
  - ドキュメント更新

Phase 6: デプロイ
  ↓
  - 本番環境デプロイ
  - 監視・モニタリング
```

### 移行のメリット

1. **安全性**: 既存システムを壊さない
2. **段階的**: ファイル単位で徐々に移行
3. **ロールバック可能**: 問題があれば旧システムに戻せる
4. **検証可能**: 新旧システムの比較が可能
5. **CI/CD維持**: ビルドが壊れない

### ロールバック手順

問題が発生した場合:

1. **import文を戻す**: `@tumiki/better-auth` → `@tumiki/auth`
2. **middleware を戻す**: NextAuth.jsの`auth()`ラッパーに戻す
3. **API Routesを戻す**: `[...all]` → `[...nextauth]`
4. **pnpm build** で動作確認

---

**最終更新**: 2025-10-30
**作成者**: Claude Code
**ステータス**: ✅ 完全未実装（実装準備完了）
**移行戦略**: 段階的移行（新パッケージアプローチ）
