# APIキー認証システム実装計画書

## 概要

現在のTumikiアーキテクチャにAPIキー認証機能を追加し、MCPサーバーへのセキュアなアクセスを実現する計画書。
既存のNextAuth.js認証システム、tRPCルーター、SSE実装を活用しつつ、新しいAPIキー管理機能を統合します。

## 現在のアーキテクチャ分析

### 既存実装状況

#### ✅ 実装済み
- **Prisma暗号化**: `@encrypted`アノテーションで機能済み（UserMcpServerConfig.envVars で使用中）
- **NextAuth.js**: JWT戦略でユーザー認証・ロール管理
- **SSE実装**: ProxyServerでSSE接続確立とメッセージ処理
- **tRPCルーター**: mcpServer、userMcpServerConfig、userMcpServerInstance ルーター

#### ❌ 未実装
- **APIキー管理テーブル**: McpApiKeyモデルが存在しない
- **APIキー認証**: 現在はUserMcpServerInstance.idを直接使用
- **APIキー管理UI**: ユーザーがAPIキーを作成・管理する画面
- **APIキー用tRPCルーター**: APIキー操作用のAPI

### 技術スタック
- **フロントエンド**: Next.js 15 + React 19 + tRPC + Tailwind CSS + Radix UI
- **バックエンド**: Express + MCP SDK + SSE
- **データベース**: PostgreSQL + Prisma（暗号化済み）
- **認証**: NextAuth.js（JWT戦略）
- **モノレポ**: Turbo + pnpm

## 1. データベース設計

### 1.1 新規Prismaスキーマ（packages/db/prisma/schema/apiKey.prisma）

現在のスキーマ構造に合わせて、apiKey.prisma として新規ファイルを作成します。

```prisma
/**
 * @namespace ApiKey
 * APIキー認証システム用のテーブル
 */

/// APIキー管理テーブル
/// @namespace ApiKey
model McpApiKey {
  id                       String                  @id @default(cuid())
  /// APIキー名（ユーザーが設定）
  name                     String
  /// 暗号化されたAPIキー（共通鍵暗号化）
  apiKey                   String                  @unique /// @encrypted
  /// APIキーのメタデータ
  metadata                 Json?                   /// @encrypted
  /// APIキーが有効かどうか
  isActive                 Boolean                 @default(true)
  /// 最後に使用された日時
  lastUsedAt               DateTime?
  /// APIキーの有効期限
  expiresAt                DateTime?
  /// 許可されたIPアドレス一覧
  allowedIPs               String[]                @default([]) /// @encrypted
  /// 使用統計情報
  usageStats               Json?                   /// @encrypted
  /// 関連するUserMcpServerInstanceのID
  userMcpServerInstanceId  String
  userMcpServerInstance    UserMcpServerInstance   @relation(fields: [userMcpServerInstanceId], references: [id], onDelete: Cascade)
  /// 作成者のユーザーID
  userId                   String
  user                     User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// 組織ID（マルチテナント対応）
  organizationId           String?
  organization             Organization?           @relation(fields: [organizationId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userMcpServerInstanceId])
  @@index([userId])
}
```

### 1.2 既存スキーマの更新

#### UserMcpServerInstance（packages/db/prisma/schema/userMcpServer.prisma）への追加

```prisma
model UserMcpServerInstance {
  // ... 既存フィールド
  /// APIキー一覧
  apiKeys            McpApiKey[]
  // ... 残りのフィールド
}
```

#### User（packages/db/prisma/schema/nextAuth.prisma）への追加

```prisma
model User {
  // ... 既存フィールド
  /// 作成したAPIキー一覧
  apiKeys            McpApiKey[]
  // ... 残りのフィールド
}
```

#### Organization（packages/db/prisma/schema/organization.prisma）への追加

```prisma
model Organization {
  // ... 既存フィールド
  /// 組織内のAPIキー一覧
  apiKeys            McpApiKey[]
  // ... 残りのフィールド
}
```

### 1.3 環境変数設定

既存の暗号化設定を使用します。Prismaの`@encrypted`アノテーションが自動的に共通鍵暗号化を行います。

```bash
# .env（既存設定で暗号化は自動対応）
# アプリケーション設定
API_KEY_PREFIX=mcp_live_
API_KEY_LENGTH=32
```

## 2. tRPC APIキー管理ルーター

### 2.1 APIキー管理tRPCルーター（apps/manager/src/server/api/routers/mcpApiKey/index.ts）

既存のtRPCアーキテクチャに合わせてAPIキー管理ルーターを実装します。

```typescript
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import crypto from "crypto";

const API_KEY_PREFIX = process.env.API_KEY_PREFIX || "mcp_live_";
const API_KEY_LENGTH = parseInt(process.env.API_KEY_LENGTH || "32");

// APIキー生成用のスキーマ
const CreateApiKeyInput = z.object({
  name: z.string().min(1).max(100),
  userMcpServerInstanceId: z.string(),
  expiresInDays: z.number().optional(),
  allowedIPs: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// APIキー一覧取得用のスキーマ
const ListApiKeysInput = z.object({
  userMcpServerInstanceId: z.string().optional(),
});

// APIキー更新用のスキーマ
const UpdateApiKeyInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  allowedIPs: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// APIキー生成関数
const generateApiKey = () => {
  const rawKey = crypto.randomBytes(API_KEY_LENGTH).toString("base64url");
  const fullKey = `${API_KEY_PREFIX}${rawKey}`;
  return fullKey;
};

// APIキー検証関数
export const validateApiKey = async (providedKey: string, clientIP?: string) => {
  const apiKey = await db.mcpApiKey.findFirst({
    where: {
      apiKey: providedKey,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      userMcpServerInstance: {
        include: {
          user: true,
          toolGroup: {
            include: {
              toolGroupTools: {
                include: {
                  tool: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!apiKey) {
    return { valid: false, error: "Invalid API key" };
  }

  // IP制限チェック
  if (apiKey.allowedIPs.length > 0 && clientIP) {
    if (!apiKey.allowedIPs.includes(clientIP)) {
      return { valid: false, error: "IP not allowed" };
    }
  }

  // 最終使用日時を更新
  await db.mcpApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    userMcpServerInstance: apiKey.userMcpServerInstance,
  };
};

export const mcpApiKeyRouter = createTRPCRouter({
  // APIキー生成
  create: protectedProcedure
    .input(CreateApiKeyInput)
    .mutation(async ({ ctx, input }) => {
      const { name, userMcpServerInstanceId, expiresInDays, allowedIPs, metadata } = input;
      
      // ユーザーがこのMCPサーバーインスタンスの所有者かチェック
      const instance = await db.userMcpServerInstance.findFirst({
        where: {
          id: userMcpServerInstanceId,
          userId: ctx.session.user.id,
        },
      });

      if (!instance) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "MCP Server Instance not found",
        });
      }

      const fullKey = generateApiKey();
      
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const apiKey = await db.mcpApiKey.create({
        data: {
          name,
          apiKey: fullKey,
          allowedIPs: allowedIPs || [],
          metadata: metadata || {},
          expiresAt,
          userMcpServerInstanceId,
          userId: ctx.session.user.id,
          organizationId: instance.organizationId,
        },
      });

      return { 
        apiKey: {
          ...apiKey,
          apiKey: undefined, // セキュリティのため暗号化キーは返さない
        }, 
        secretKey: fullKey // 初回のみ返す
      };
    }),

  // APIキー一覧取得
  list: protectedProcedure
    .input(ListApiKeysInput)
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.session.user.id,
      };

      if (input.userMcpServerInstanceId) {
        where.userMcpServerInstanceId = input.userMcpServerInstanceId;
      }

      return await db.mcpApiKey.findMany({
        where,
        select: {
          id: true,
          name: true,
          isActive: true,
          lastUsedAt: true,
          expiresAt: true,
          allowedIPs: true,
          metadata: true,
          userMcpServerInstance: {
            select: {
              id: true,
              name: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  // APIキー更新
  update: protectedProcedure
    .input(UpdateApiKeyInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // ユーザーがこのAPIキーの所有者かチェック
      const existingKey = await db.mcpApiKey.findFirst({
        where: {
          id,
          userId: ctx.session.user.id,
        },
      });

      if (!existingKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      return await db.mcpApiKey.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          isActive: true,
          lastUsedAt: true,
          expiresAt: true,
          allowedIPs: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }),

  // APIキー削除
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // ユーザーがこのAPIキーの所有者かチェック
      const existingKey = await db.mcpApiKey.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!existingKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      await db.mcpApiKey.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
```

## 3. ProxyServer認証システムの更新

### 3.1 既存getServer関数の更新（apps/proxyServer/src/services/proxy.ts）

現在のgetServer関数をAPIキー認証に対応させます。

```typescript
// apps/proxyServer/src/services/proxy.ts に validateApiKey 関数をインポート
import { validateApiKey } from "../../../manager/src/server/api/routers/mcpApiKey/index.js";

// 既存のgetServerConfigs関数を更新
const getServerConfigs = async (apiKey: string) => {
  // APIキー検証
  const validation = await validateApiKey(apiKey);
  
  if (!validation.valid) {
    throw new Error(`Invalid API key: ${validation.error}`);
  }

  const { userMcpServerInstance } = validation;

  // 残りのロジックは既存のまま（serverInstanceを使用）
  const serverConfigIds = userMcpServerInstance.toolGroup.toolGroupTools.map(
    ({ userMcpServerConfigId }) => userMcpServerConfigId,
  );

  // ... 既存のコードと同じ
};

// getMcpClients関数とgetServer関数は変更なし（APIキー文字列を受け取る）
```

### 3.2 SSE接続の認証更新（apps/proxyServer/src/services/connection.ts）

既存のSSE実装でAPIキー認証を強化します。

```typescript
// apps/proxyServer/src/services/connection.ts の establishSSEConnection 関数を更新

export const establishSSEConnection = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // API key を複数の方法で取得
  const apiKey = 
    (req.query["api-key"] as string) ||
    (req.headers["api-key"] as string) ||
    (req.headers.authorization?.startsWith("Bearer ") 
      ? req.headers.authorization.substring(7) 
      : undefined);

  const clientId =
    (req.headers["x-client-id"] as string) || req.ip || "unknown";

  logger.info("SSE connection request received", {
    hasApiKey: !!apiKey,
    clientId,
    userAgent: req.headers["user-agent"],
  });

  if (!apiKey) {
    res.status(401).json({
      error: "API key required",
      hint: "Use api-key query parameter, api-key header, or Authorization: Bearer header",
    });
    return;
  }

  if (!canCreateNewSession()) {
    res.status(503).send("Server at capacity");
    return;
  }

  try {
    // APIキー検証
    const validation = await validateApiKey(apiKey, req.ip);
    
    if (!validation.valid) {
      res.status(401).json({ 
        error: "Invalid API key",
        details: validation.error 
      });
      return;
    }

    // 残りのSSE接続確立ロジックは既存のまま
    // ...
  } catch (error) {
    // エラーハンドリング
  }
};
```

## 4. APIキー管理UI実装

### 4.1 Radix UI + TailwindでのAPIキー管理コンポーネント

現在のUIアーキテクチャに合わせたAPIキー管理画面を実装します。

```typescript
// apps/manager/src/app/_components/mcp/ApiKeyManager.tsx
"use client";

import { useState } from "react";
import { Button } from "@tumiki/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@tumiki/ui/dialog";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@tumiki/ui/card";
import { Badge } from "@tumiki/ui/badge";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger 
} from "@tumiki/ui/alert-dialog";
import { Copy, Eye, EyeOff, Trash2, Plus, Key } from "lucide-react";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

interface ApiKeyManagerProps {
  userMcpServerInstanceId: string;
}

export const ApiKeyManager = ({ userMcpServerInstanceId }: ApiKeyManagerProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // tRPC クエリ・ミューテーション
  const { data: apiKeys, refetch } = trpc.mcpApiKey.list.useQuery({ 
    userMcpServerInstanceId 
  });
  
  const createApiKey = trpc.mcpApiKey.create.useMutation({
    onSuccess: (data) => {
      setGeneratedKey(data.secretKey);
      refetch();
      setNewKeyName("");
      toast.success("APIキーが生成されました");
      
      // 30秒後に自動非表示
      setTimeout(() => setGeneratedKey(null), 30000);
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const deleteApiKey = trpc.mcpApiKey.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("APIキーを削除しました");
    },
    onError: (error) => {
      toast.error(`削除エラー: ${error.message}`);
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("APIキー名を入力してください");
      return;
    }
    
    createApiKey.mutate({
      name: newKeyName,
      userMcpServerInstanceId,
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}をクリップボードにコピーしました`);
    } catch (error) {
      toast.error("コピーに失敗しました");
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          APIキー管理
        </CardTitle>
        <CardDescription>
          MCPサーバーへのアクセス用APIキーを管理します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 新規生成されたAPIキー表示 */}
        {generatedKey && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-sm text-green-800">
                新しいAPIキーが生成されました
              </CardTitle>
              <CardDescription className="text-green-600">
                このキーは一度だけ表示されます。安全な場所に保存してください。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input 
                  value={generatedKey} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedKey, "APIキー")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* APIキー作成ボタン */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新しいAPIキーを作成
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいAPIキーを作成</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">APIキー名</Label>
                <Input
                  id="keyName"
                  placeholder="例: 本番環境用"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={createApiKey.isLoading}
                >
                  {createApiKey.isLoading ? "作成中..." : "作成"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* APIキー一覧 */}
        <div className="space-y-3">
          {apiKeys?.map((key) => (
            <Card key={key.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{key.name}</h3>
                    <Badge variant={key.isActive ? "default" : "secondary"}>
                      {key.isActive ? "有効" : "無効"}
                    </Badge>
                    {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                      <Badge variant="destructive">期限切れ</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      ••••••••••••（暗号化済み）
                    </span>
                    <Button
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(key.id, "キーID")}
                      title="キーIDをコピー"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {key.lastUsedAt && (
                    <p className="text-xs text-muted-foreground">
                      最終使用: {new Date(key.lastUsedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>APIキーを削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        この操作は取り消せません。APIキー「{key.name}」を削除すると、
                        このキーを使用しているアプリケーションはアクセスできなくなります。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteApiKey.mutate({ id: key.id })}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        削除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>

        {apiKeys?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            APIキーがありません。新しいキーを作成してください。
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### 4.2 既存の管理画面への統合

```typescript
// apps/manager/src/app/_components/mcp/ServerInstanceDetail.tsx に統合

import { ApiKeyManager } from "./ApiKeyManager";

export const ServerInstanceDetail = ({ instanceId }: { instanceId: string }) => {
  return (
    <div className="space-y-6">
      {/* 既存のサーバー設定UI */}
      
      {/* APIキー管理セクションを追加 */}
      <ApiKeyManager userMcpServerInstanceId={instanceId} />
    </div>
  );
};
```

## 5. 実装手順（Tumikiアーキテクチャ対応）

### Phase 1: データベース設計とマイグレーション（2-3日）

#### 1.1 Prismaスキーマの実装
```bash
# 1. 新しいAPIキースキーマファイルを作成
# packages/db/prisma/schema/apiKey.prisma

# 2. 既存スキーマにリレーションを追加
# packages/db/prisma/schema/userMcpServer.prisma
# packages/db/prisma/schema/nextAuth.prisma  
# packages/db/prisma/schema/organization.prisma

# 3. 環境変数の追加
echo "API_KEY_HASH_SALT=$(openssl rand -hex 32)" >> .env

# 4. マイグレーション実行
cd packages/db
pnpm db:migrate
pnpm db:generate
```

#### 1.2 完了条件
- [ ] apiKey.prismaファイル作成
- [ ] マイグレーション成功
- [ ] Zod スキーマ自動生成
- [ ] 型安全性確認

### Phase 2: tRPCルーター実装（3-4日）

#### 2.1 APIキー管理ルーター作成
```bash
# 1. APIキー管理ルーターディレクトリ作成
mkdir -p apps/manager/src/server/api/routers/mcpApiKey

# 2. ルーター実装
# apps/manager/src/server/api/routers/mcpApiKey/index.ts

# 3. メインルーターに追加
# apps/manager/src/server/api/root.ts
```

#### 2.2 完了条件
- [ ] CRUD操作実装（create, list, update, delete）
- [ ] APIキー検証関数実装
- [ ] セキュリティ（所有者チェック、IP制限）
- [ ] エラーハンドリング
- [ ] 型安全性確認

### Phase 3: ProxyServer認証統合（2-3日）

#### 3.1 既存ProxyServerの更新
```bash
# 1. proxy.ts の getServerConfigs 関数更新
# 2. connection.ts の establishSSEConnection 関数更新
# 3. validateApiKey 関数の統合
```

#### 3.2 完了条件
- [ ] APIキー認証の統合
- [ ] SSE接続での認証確認
- [ ] HTTP/MCP エンドポイントでの認証確認
- [ ] 後方互換性の維持

### Phase 4: UI実装（4-5日）

#### 4.1 APIキー管理コンポーネント
```bash
# 1. APIキー管理コンポーネント作成
# apps/manager/src/app/_components/mcp/ApiKeyManager.tsx

# 2. 既存のサーバー管理画面に統合
# apps/manager/src/app/_components/mcp/ServerInstanceDetail.tsx

# 3. UIテスト
```

#### 4.2 完了条件
- [ ] APIキー作成・削除・表示機能
- [ ] セキュアなコピー機能
- [ ] レスポンシブデザイン
- [ ] トースト通知
- [ ] アクセシビリティ対応

### Phase 5: テストとドキュメント（2-3日）

#### 5.1 テスト実装
```bash
# 1. APIキーロジックのユニットテスト
# 2. tRPCルーターの統合テスト  
# 3. UI コンポーネントテスト
# 4. E2Eテスト

# テスト実行
pnpm test
pnpm typecheck
pnpm lint
```

#### 5.2 完了条件
- [ ] 100% テストカバレッジ
- [ ] 型チェック通過
- [ ] Lint エラーなし
- [ ] ドキュメント更新

## 6. セキュリティとベストプラクティス

### 6.1 セキュリティチェックリスト

#### データ保護
- [x] APIキー共通鍵暗号化（prisma-field-encryption）
- [x] 機密データの暗号化（prisma-field-encryption）
- [x] 暗号化済み表示（UI）
- [x] 生成キーの一回のみ表示

#### アクセス制御
- [x] ユーザー所有者チェック
- [x] NextAuth.js セッション認証
- [x] IP制限機能
- [x] API キー有効期限

#### 監査
- [x] 最終使用日時記録
- [x] 使用統計（JSON）
- [x] ログ記録（ProxyServer）

### 6.2 環境変数設定確認

```bash
# 必須環境変数チェック関数
# apps/manager/src/lib/security.ts
export function validateSecuritySetup() {
  const required = ["DATABASE_URL", "AUTH_SECRET", "PRISMA_FIELD_ENCRYPTION_KEY"];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
```

## 7. 運用とメンテナンス

### 7.1 監視とアラート

#### メトリクス
- APIキー使用頻度
- 認証失敗率
- ProxyServer接続数
- エラー率

#### アラート条件
- 異常なAPIキー使用パターン
- 大量の認証失敗
- 期限切れ間近のキー

### 7.2 定期メンテナンス

#### 月次
- 期限切れAPIキー削除
- 使用統計レポート
- セキュリティ監査

#### 年次
- 暗号化キーローテーション
- セキュリティペネトレーションテスト

## 8. 今後の拡張計画

### Phase 2（将来）
- APIキー自動ローテーション
- 詳細な使用統計ダッシュボード
- Webhook 通知
- OAuth2.0 統合

### パフォーマンス最適化
- APIキー検証のキャッシュ化
- バッチ処理による使用統計更新
- 非同期ログ記録

## 9. トラブルシューティング

### よくある問題

#### 1. マイグレーションエラー
```bash
# 解決策：依存関係を確認
pnpm db:reset
pnpm db:migrate
```

#### 2. 暗号化エラー
```bash
# 解決策：環境変数を確認
echo $PRISMA_FIELD_ENCRYPTION_KEY
```

#### 3. tRPC 型エラー
```bash
# 解決策：型生成を再実行
pnpm db:generate
pnpm build
```

#### 4. ProxyServer 接続エラー
```bash
# 解決策：ログを確認
docker logs tumiki-proxy-server
```
