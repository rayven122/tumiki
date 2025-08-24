# Tumiki コーディング規約

## フロントエンド規約

### コンポーネント設計
- **形式**: 関数コンポーネント + アロー関数
- **型定義**: Props型は必須定義
- **配置**: 
  - 呼び出す側と同一階層の `_components/` ディレクトリに配置
  - 共通コンポーネントは一つ上の階層の `_components/` に配置

### 関数定義
- **必須**: 全ての関数はアロー関数で記述
```typescript
// 正しい
const handleClick = () => {}
const calculateTotal = (items: Item[]) => {}

// 間違い
function handleClick() {}
```

### スタイリング
- **メイン**: Tailwind CSS使用
- **カスタムスタイル**: `styles/globals.css`に記載
- **条件分岐**: `clsx`ライブラリを使用
```typescript
import { clsx } from 'clsx'
const className = clsx('base-class', { 'active': isActive })
```

### データ管理
- **データフェッチング**: tRPC使用
  - `trpc.useQuery()` - データ取得
  - `trpc.useMutation()` - データ更新
- **状態管理**:
  - ローカル状態: `useState`
  - グローバル状態: Jotai

### 型定義
- **方法**: `type`のみ使用（`interface`は使用禁止）
- **共有型**: `@tumiki/db`から import
- **ID管理**: branded typeを使用
  - 定義場所: `@apps/manager/src/schema/ids.ts`

```typescript
// 正しい
type User = {
  id: UserId
  name: string
}

// 間違い
interface User {
  id: string
  name: string
}
```

## テスト規約

### Vitest使用
- **記法**: `test`使用（`it`ではない）
- **テスト名**: 日本語で記載
- **構造**: 関数ごとに`describe`ブロック
- **アサーション**: `toStrictEqual`使用（`toEqual`ではない）
- **アプローチ**: 古典派単体テスト

```typescript
describe('calculateTotal', () => {
  test('商品の合計金額を正しく計算する', () => {
    const result = calculateTotal(items)
    expect(result).toStrictEqual(1000)
  })
})
```

### カバレッジ目標
- 実装ロジックのカバレッジ100%を目標

## 設計原則

### プログラミングパラダイム
- **関数型プログラミング**: クラスは使用しない
- **DRY原則**: Don't Repeat Yourself
- **SOLID原則**: 単一責任、オープン・クローズド等

### モジュール構成
- `utils/`や`libs/`には`index.ts`でエントリーポイントを用意
- インポートを簡潔にする

```typescript
// index.ts
export * from './validation'
export * from './formatting'

// 使用側
import { validate, format } from '@/utils'
```

## データベース・API規約

### Prismaスキーマ
- 複数ファイルに分割（`packages/db/prisma/schema/`）
- 各ファイルは機能ごとに分離

### tRPCルーター
- 配置: `apps/manager/src/server/api/routers/`
- 型安全性: フルスタック型安全性を維持

## セキュリティ
- 機密データ（APIキー、トークン）はフィールドレベル暗号化
- 環境変数は`.env`ファイルで管理
- シークレットのハードコーディング禁止

## 開発環境
- **Node.js**: >=22.14.0必須
- **pnpm**: 10.11.0以上
- **TypeScript**: strict モード必須
- **コミット前**: `pnpm check`実行必須

## 特記事項
- Prisma型は`@tumiki/db`からimport（`@prisma/client`ではない）
- `@tumiki/`パッケージのimportエラー時は該当パッケージのビルドが必要
- ローカル開発URL: `https://local.tumiki.cloud:3000`