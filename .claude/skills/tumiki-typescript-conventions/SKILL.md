---
name: tumiki-typescript-conventions
description: |
  TumikiプロジェクトのTypeScriptコーディング規約。
  型定義、設定ファイル構成、設計原則のガイドラインを提供。
  「TypeScript規約」「型定義」「tsconfig」などのリクエスト時にトリガー。
sourcePatterns:
  - "**/*.ts"
  - "**/*.tsx"
  - tsconfig.json
  - tsconfig.build.json
---

# TypeScript コーディング規約

## 基本ルール

| ルール | 説明 |
|-------|------|
| `any`禁止 | `unknown`またはジェネリック型を使用 |
| strict mode | tsconfig.jsonで有効化済み |
| 型推論優先 | ただし関数の引数と戻り値は明示的に型付け |
| 日本語コメント | コード内のコメントは日本語で記述 |
| `@example`禁止 | TSDocの使用例はテストコードで表現 |

## 型定義ルール

### `any`の代替

```typescript
// ❌ 悪い例 - anyは使用禁止
const process = (data: any): any => {
  return data;
};

// ✅ 良い例 - ジェネリック型を使用
const process = <T>(data: T): T => {
  return data;
};

// ✅ 良い例 - unknownを使用
const process = (data: unknown): string => {
  if (typeof data === "string") {
    return data;
  }
  return String(data);
};
```

### `type` vs `interface`

**`type`のみ使用**（`interface`禁止）:

```typescript
// ❌ 悪い例
interface User {
  id: string;
  name: string;
}

// ✅ 良い例
type User = {
  id: UserId;
  name: string;
};
```

### branded type

IDには branded type を使用（`@apps/manager/src/schema/ids.ts` に定義）:

```typescript
// 定義
type UserId = string & { readonly brand: unique symbol };

// 使用
type User = {
  id: UserId;
  name: string;
};
```

## 関数定義

**全ての関数はアロー関数で定義**:

```typescript
// ❌ 悪い例
function handleClick() {
  // ...
}

// ✅ 良い例
const handleClick = () => {
  // ...
};

// ✅ 良い例 - 型付き
const getUser = (id: UserId): Promise<User> => {
  // ...
};
```

## TypeScript 設定ファイル構成

各パッケージ・アプリでは**2つのファイルに分割**:

| ファイル | 用途 | 対象 |
|---------|------|------|
| `tsconfig.json` | 型チェック用 | テストファイルを含む全ファイル |
| `tsconfig.build.json` | ビルド用 | テストファイルを除外 |

### package.json設定

```json
{
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "typecheck": "tsc --noEmit"
  }
}
```

## 型インポート

**共有型は `@tumiki/db` から import**:

```typescript
// ❌ 悪い例 - @prisma/clientから直接
import { User } from '@prisma/client';

// ✅ 良い例 - @tumiki/dbから
import type { User } from '@tumiki/db';
```

## 設計原則

### 遵守すべき原則

- **DRY原則** - Don't Repeat Yourself
- **SOLID原則** - 単一責任、開放閉鎖、リスコフ置換、インターフェース分離、依存性逆転

### プログラミングパラダイム

**関数型プログラミング**（クラス禁止）:

```typescript
// ❌ 悪い例 - クラス
class UserService {
  getUser(id: string) { /* ... */ }
}

// ✅ 良い例 - 関数
const getUser = (id: string): User => { /* ... */ };
```

### モジュール構成

**`index.ts`にエントリーポイントを用意**:

```text
lib/
├── utils/
│   ├── date.ts
│   ├── string.ts
│   └── index.ts    # 全てをre-export
└── index.ts        # エントリーポイント
```

---

## チェックリスト

- [ ] `any`型を使用していない
- [ ] 関数はアロー関数で定義
- [ ] `type`を使用（`interface`ではない）
- [ ] IDにはbranded typeを使用
- [ ] コメントは日本語
- [ ] `tsconfig.json`と`tsconfig.build.json`が分離されている
