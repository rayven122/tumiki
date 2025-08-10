# 個人ユーザーの組織化改修計画

## 1. 概要

個人利用ユーザーも1人の組織として扱うことで、データモデルを統一し、コードの複雑性を削減する改修を実施します。

### 現状分析結果

データベーススキーマ調査により以下の現状が判明しました：

- **Organizationモデル**は既に存在し、個人組織フラグやメンバー管理機能が実装済み
- **UserMcpServerConfig, UserToolGroup, UserMcpServerInstance**は`userId`と`organizationId`の両方のフィールドを持つ設計
- **Subscriptionモデル**が現在のスキーマには存在しない（決済関連は別途対応が必要）
- tRPCのクエリでは`userId`ベースでフィルタリングされており、`organizationId`への完全移行が必要

## 2. 改修の目的

- **データモデルの統一**: userId/organizationIdの二重管理を解消
- **コードの簡素化**: ビジネスロジックの重複を削除
- **スケーラビリティ向上**: 個人→チームへのスムーズな移行を実現
- **保守性向上**: 統一されたAPIとデータ構造

## 3. フェーズ別改修計画

### Phase 1: スキーマ設計の更新（1-2日）

#### 1.1 Organizationモデルの拡張

**現状**: 基本的な組織機能は実装済み
**追加が必要な項目**:

```prisma
model Organization {
  // 既存フィールド...

  // 追加フィールド
  isPersonal     Boolean  @default(false)  // 個人組織フラグ
  maxMembers     Int      @default(1)      // 最大メンバー数
  ownerUserId    String?  @unique          // 個人組織の所有者（個人組織の場合のみ）
  ownerUser      User?    @relation("PersonalOrganization", fields: [ownerUserId], references: [id])

  @@index([isPersonal])
  @@index([ownerUserId])
}
```

#### 1.2 Userモデルの更新

**現状**: 基本的なユーザー管理は実装済み
**追加が必要な項目**:

```prisma
model User {
  // 既存フィールド...

  // 追加フィールド
  personalOrganization   Organization? @relation("PersonalOrganization")
  defaultOrganizationId  String?       // デフォルト組織ID

  @@index([defaultOrganizationId])
}
```

**注意**: `stripeCustomerId`や`subscription`関連は現在のスキーマに存在しないため、決済機能は別途検討が必要

#### 1.3 Subscriptionモデルの作成

**現状**: Subscriptionモデルが存在しないため、決済機能が必要な場合は新規作成
**将来的な実装案**:

```prisma
model Subscription {
  id                     String             @id @default(cuid())
  organizationId         String             @unique  // 組織ベースの決済管理
  stripeCustomerId       String?
  stripeSubscriptionId   String?            @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
  status                 String?
  
  organization           Organization       @relation(fields: [organizationId], references: [id])
  
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt
}
```

**注意**: 現在のシステムに決済機能がないため、この実装は任意

#### 1.4 依存モデルの更新方針

**現状**: 以下のモデルは既に`userId`と`organizationId`の両方を持つ
- `UserMcpServerConfig`: 両フィールド存在、`organizationId`は任意
- `UserToolGroup`: 両フィールド存在、`organizationId`は任意  
- `UserMcpServerInstance`: 両フィールド存在、`organizationId`は任意

**更新方針**: 
- `organizationId`を必須化
- `userId`は当面保持（互換性のため）
- 段階的に`userId`ベースのクエリを`organizationId`ベースに移行

### Phase 2: マイグレーション準備（2-3日）

#### 2.1 マイグレーションスクリプトの作成

```typescript
// packages/scripts/src/migrateToOrganizationModel.ts

async function migrateUsersToOrganizations() {
  const users = await prisma.user.findMany({
    include: {
      subscription: true,
      mcpServerConfigs: true,
      toolGroups: true,
      mcpServerInstances: true,
    },
  });

  for (const user of users) {
    // 1. 個人組織を作成
    const personalOrg = await prisma.organization.create({
      data: {
        name: `${user.name || user.email}'s Workspace`,
        isPersonal: true,
        ownerUserId: user.id,
        createdBy: user.id,
        maxMembers: 1,
        stripeCustomerId: user.stripeCustomerId,
      },
    });

    // 2. 組織メンバーとして追加
    await prisma.organizationMember.create({
      data: {
        organizationId: personalOrg.id,
        userId: user.id,
        isAdmin: true,
      },
    });

    // 3. サブスクリプションを移行
    if (user.subscription) {
      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          organizationId: personalOrg.id,
          userId: null,
        },
      });
    }

    // 4. MCPサーバー設定を移行
    await prisma.userMcpServerConfig.updateMany({
      where: { userId: user.id },
      data: { organizationId: personalOrg.id },
    });

    // 5. ツールグループを移行
    await prisma.userToolGroup.updateMany({
      where: { userId: user.id },
      data: { organizationId: personalOrg.id },
    });

    // 6. MCPサーバーインスタンスを移行
    await prisma.userMcpServerInstance.updateMany({
      where: { userId: user.id },
      data: { organizationId: personalOrg.id },
    });

    // 7. デフォルト組織を設定
    await prisma.user.update({
      where: { id: user.id },
      data: { defaultOrganizationId: personalOrg.id },
    });
  }
}
```

#### 2.2 ロールバックスクリプトの作成

```typescript
// packages/scripts/src/rollbackOrganizationMigration.ts
// 緊急時のロールバック用スクリプト
```

### Phase 3: アプリケーションコードの更新（3-4日）

#### 3.1 認証フローの更新

**現状**: Auth0統合認証が実装済み
**更新内容**:

```typescript
// packages/auth/src/server.ts または適切な認証処理ファイル

export const handleUserSignup = async (userData: UserData) => {
  const user = await prisma.user.create({ data: userData });

  // 個人組織を自動作成
  const personalOrg = await createPersonalOrganization(user);

  // デフォルト組織として設定
  await prisma.user.update({
    where: { id: user.id },
    data: { defaultOrganizationId: personalOrg.id },
  });

  return { user, organization: personalOrg };
};

const createPersonalOrganization = async (user: User) => {
  const personalOrg = await prisma.organization.create({
    data: {
      name: `${user.name || user.email}'s Workspace`,
      isPersonal: true,
      ownerUserId: user.id,
      createdBy: user.id,
      maxMembers: 1,
    },
  });

  // 組織メンバーとして追加
  await prisma.organizationMember.create({
    data: {
      organizationId: personalOrg.id,
      userId: user.id,
      isAdmin: true,
    },
  });

  return personalOrg;
};
```

#### 3.2 tRPCルーターの更新

**現状**: `findOfficialServers`等で`userId`と`organizationId: null`でフィルタリング
**更新内容**:

```typescript
// apps/manager/src/server/api/routers/userMcpServerInstance/findOfficialServers.ts

// Before:
where: {
  serverType: ServerType.OFFICIAL,
  userId: ctx.session.user.id,
  deletedAt: null,
  organizationId: null, // 個人のMCPサーバーのみを取得
}

// After:
where: {
  serverType: ServerType.OFFICIAL,
  organizationId: ctx.session.currentOrganizationId, // 現在の組織のサーバーを取得
  deletedAt: null,
}
```

**更新が必要なファイル**:
- `findOfficialServers.ts`
- `findCustomServers.ts`  
- その他の`userId`ベースクエリを持つルーター

**セッション管理の更新**:
- `ctx.session`に`currentOrganizationId`の追加
- 組織切り替え機能の実装

#### 3.3 決済システムの実装（任意）

**現状**: Stripe統合が存在しない
**将来的な実装案**:

```typescript
// apps/manager/src/server/stripe/subscription.ts（新規作成の場合）

export const createSubscription = async (
  organizationId: string,
  priceId: string,
) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // Stripe顧客の作成または取得
  let stripeCustomerId = organization.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: organization.ownerUser?.email,
      name: organization.name,
    });
    stripeCustomerId = customer.id;
    
    // 組織にStripe顧客IDを保存
    await prisma.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId },
    });
  }

  // サブスクリプション作成
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: priceId }],
  });

  // Subscriptionレコードを作成
  return await prisma.subscription.create({
    data: {
      organizationId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
    },
  });
};
```

**注意**: 現在決済機能がないため、この実装は必要に応じて

### Phase 4: UI/UXの調整（2-3日）

#### 4.1 組織切り替えUIの追加

**実装予定コンポーネント**:

```typescript
// apps/manager/src/components/OrganizationSwitcher.tsx（新規作成）

import { Select, SelectItem } from "@/components/ui/select";
import { trpc } from "@/utils/trpc";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

export const OrganizationSwitcher = () => {
  const { data: organizations } = trpc.organization.getUserOrganizations.useQuery();
  const { currentOrganization, setCurrentOrganization } = useOrganizationContext();

  if (!organizations?.length) return null;

  return (
    <Select 
      value={currentOrganization?.id} 
      onValueChange={setCurrentOrganization}
    >
      {organizations.map(org => (
        <SelectItem key={org.id} value={org.id}>
          {org.isPersonal ? "個人ワークスペース" : org.name}
        </SelectItem>
      ))}
    </Select>
  );
};
```

**必要な追加実装**:
- `OrganizationContext`の作成
- `getUserOrganizations` tRPCエンドポイントの実装
- セッション管理での組織状態管理

#### 4.2 個人組織の表示調整

- 個人組織では「メンバー管理」を非表示
- 組織名を「個人ワークスペース」として表示
- アップグレード時に組織タイプを変更可能に

### Phase 5: テストとデプロイ（2-3日）

#### 5.1 テスト計画

1. **単体テスト**
   - マイグレーションスクリプトのテスト
   - 新規ユーザー登録フローのテスト
   - 組織切り替え機能のテスト

2. **統合テスト**
   - 個人→チームアップグレードのテスト
   - Stripe決済フローのテスト
   - MCPサーバー管理のテスト

3. **E2Eテスト**
   - 新規ユーザーの完全なフロー
   - 既存ユーザーのマイグレーション後の動作

#### 5.2 段階的デプロイ計画

1. **Stage 1**: 開発環境でのテスト
2. **Stage 2**: ステージング環境での検証
3. **Stage 3**: 本番環境でのカナリアデプロイ（5%のユーザー）
4. **Stage 4**: 全ユーザーへの展開

## 4. リスクと対策

### リスク1: 既存データの破損

**対策**:

- 完全なバックアップの取得
- ロールバックスクリプトの準備
- 段階的なマイグレーション実行

### リスク2: パフォーマンスの低下

**対策**:

- インデックスの最適化
- クエリの最適化
- キャッシュ戦略の見直し

### リスク3: 互換性の問題

**対策**:

- APIバージョニングの実装
- 移行期間中の後方互換性維持
- クライアント側の段階的更新

## 5. タイムライン

| フェーズ                      | 期間 | 開始日 | 終了日 |
| ----------------------------- | ---- | ------ | ------ |
| Phase 1: スキーマ設計         | 2日  | Day 1  | Day 2  |
| Phase 2: マイグレーション準備 | 3日  | Day 3  | Day 5  |
| Phase 3: アプリケーション更新 | 4日  | Day 6  | Day 9  |
| Phase 4: UI/UX調整            | 3日  | Day 10 | Day 12 |
| Phase 5: テスト・デプロイ     | 3日  | Day 13 | Day 15 |

**合計期間**: 約3週間（バッファ含む）

## 6. 成功指標

- ✅ 全ユーザーの個人組織への移行完了率: 100%
- ✅ APIレスポンスタイムの維持: ±10%以内
- ✅ エラー率: 0.1%未満
- ✅ ユーザー体験の向上: サポート問い合わせ減少
- ✅ 既存機能の動作確認: MCPサーバー管理、ツール管理等
- ✅ 新機能の動作確認: 組織切り替え、個人→チーム移行

## 7. フォローアップ

改修完了後:

1. パフォーマンスモニタリング（2週間）
2. ユーザーフィードバックの収集
3. 追加最適化の実施
4. ドキュメントの更新
5. 決済機能の検討・実装（必要に応じて）

## 8. 実装上の重要な注意事項

### 8.1 現在のシステムとの差分
- Subscriptionモデルが存在しないため、決済関連の実装は任意
- tRPCルーターで`organizationId: null`条件が使用されており、これを適切に更新する必要がある
- セッション管理で`currentOrganizationId`の概念を新規実装する必要がある

### 8.2 段階的移行戦略
1. **Phase 1**: スキーマ拡張とマイグレーション
2. **Phase 2**: API更新（`userId` + `organizationId`の並行運用）
3. **Phase 3**: UI更新と組織切り替え機能
4. **Phase 4**: `userId`ベースクエリの完全廃止

### 8.3 開発時の確認事項
- 既存のMCPサーバー設定が正常に移行されることを確認
- 組織切り替え後もユーザーのデータが適切に表示されることを確認
- 個人組織での制限機能（メンバー管理非表示等）が正常に動作することを確認
