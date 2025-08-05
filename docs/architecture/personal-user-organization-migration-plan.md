# 個人ユーザーの組織化改修計画

## 1. 概要

個人利用ユーザーも1人の組織として扱うことで、データモデルを統一し、コードの複雑性を削減する改修を実施します。

## 2. 改修の目的

- **データモデルの統一**: userId/organizationIdの二重管理を解消
- **コードの簡素化**: ビジネスロジックの重複を削除
- **スケーラビリティ向上**: 個人→チームへのスムーズな移行を実現
- **保守性向上**: 統一されたAPIとデータ構造

## 3. フェーズ別改修計画

### Phase 1: スキーマ設計の更新（1-2日）

#### 1.1 Organizationモデルの拡張
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
```prisma
model User {
  // 既存フィールド...
  
  // stripeCustomerIdを削除（Organizationで管理）
  // subscriptionリレーションを削除
  
  // 追加フィールド
  personalOrganization Organization? @relation("PersonalOrganization")
  defaultOrganizationId String?      // デフォルト組織ID
  
  @@index([defaultOrganizationId])
}
```

#### 1.3 Subscriptionモデルの簡素化
```prisma
model Subscription {
  id                     String             @id @default(cuid())
  organizationId         String             @unique  // 必須フィールドに変更
  // userIdフィールドを削除
  // その他は変更なし
}
```

#### 1.4 依存モデルの更新
- `UserMcpServerConfig`: userIdフィールドを削除、organizationId必須化
- `UserToolGroup`: userIdフィールドを削除、organizationId必須化
- `UserMcpServerInstance`: userIdフィールドを削除、organizationId必須化

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
    }
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
      }
    });

    // 2. 組織メンバーとして追加
    await prisma.organizationMember.create({
      data: {
        organizationId: personalOrg.id,
        userId: user.id,
        isAdmin: true,
      }
    });

    // 3. サブスクリプションを移行
    if (user.subscription) {
      await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: {
          organizationId: personalOrg.id,
          userId: null,
        }
      });
    }

    // 4. MCPサーバー設定を移行
    await prisma.userMcpServerConfig.updateMany({
      where: { userId: user.id },
      data: { organizationId: personalOrg.id }
    });

    // 5. ツールグループを移行
    await prisma.userToolGroup.updateMany({
      where: { userId: user.id },
      data: { organizationId: personalOrg.id }
    });

    // 6. MCPサーバーインスタンスを移行
    await prisma.userMcpServerInstance.updateMany({
      where: { userId: user.id },
      data: { organizationId: personalOrg.id }
    });

    // 7. デフォルト組織を設定
    await prisma.user.update({
      where: { id: user.id },
      data: { defaultOrganizationId: personalOrg.id }
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

```typescript
// packages/auth/src/server.ts

export async function handleUserSignup(userData: UserData) {
  const user = await prisma.user.create({ data: userData });
  
  // 個人組織を自動作成
  const personalOrg = await createPersonalOrganization(user);
  
  // デフォルト組織として設定
  await prisma.user.update({
    where: { id: user.id },
    data: { defaultOrganizationId: personalOrg.id }
  });
  
  return { user, organization: personalOrg };
}
```

#### 3.2 tRPCルーターの更新

```typescript
// apps/manager/src/server/api/routers/userMcpServerInstance/index.ts

// Before: userId または organizationId で検索
// After: organizationId のみで検索

export const userMcpServerInstanceRouter = router({
  findAll: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = ctx.session.currentOrganizationId;
    
    return await ctx.db.userMcpServerInstance.findMany({
      where: { organizationId },
      // userId条件を削除
    });
  }),
});
```

#### 3.3 Stripeインテグレーションの更新

```typescript
// apps/manager/src/server/stripe/subscription.ts

export async function createSubscription(
  organizationId: string,
  priceId: string
) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId }
  });
  
  // organizationのstripeCustomerIdを使用
  const subscription = await stripe.subscriptions.create({
    customer: organization.stripeCustomerId,
    items: [{ price: priceId }],
  });
  
  // Subscriptionレコードを作成（organizationIdのみ）
  return await prisma.subscription.create({
    data: {
      organizationId,
      stripeSubscriptionId: subscription.id,
      // userIdは設定しない
    }
  });
}
```

### Phase 4: UI/UXの調整（2-3日）

#### 4.1 組織切り替えUIの追加

```typescript
// apps/manager/src/components/OrganizationSwitcher.tsx

export const OrganizationSwitcher = () => {
  const { data: organizations } = trpc.organization.findUserOrganizations.useQuery();
  const { currentOrganization, setCurrentOrganization } = useOrganizationContext();
  
  return (
    <Select value={currentOrganization.id} onValueChange={setCurrentOrganization}>
      {organizations.map(org => (
        <SelectItem key={org.id} value={org.id}>
          {org.isPersonal ? "個人ワークスペース" : org.name}
        </SelectItem>
      ))}
    </Select>
  );
};
```

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

| フェーズ | 期間 | 開始日 | 終了日 |
|---------|------|--------|--------|
| Phase 1: スキーマ設計 | 2日 | Day 1 | Day 2 |
| Phase 2: マイグレーション準備 | 3日 | Day 3 | Day 5 |
| Phase 3: アプリケーション更新 | 4日 | Day 6 | Day 9 |
| Phase 4: UI/UX調整 | 3日 | Day 10 | Day 12 |
| Phase 5: テスト・デプロイ | 3日 | Day 13 | Day 15 |

**合計期間**: 約3週間（バッファ含む）

## 6. 成功指標

- ✅ 全ユーザーの個人組織への移行完了率: 100%
- ✅ APIレスポンスタイムの維持: ±10%以内
- ✅ エラー率: 0.1%未満
- ✅ ユーザー体験の向上: サポート問い合わせ減少

## 7. フォローアップ

改修完了後:
1. パフォーマンスモニタリング（2週間）
2. ユーザーフィードバックの収集
3. 追加最適化の実施
4. ドキュメントの更新