---
name: tumiki-frontend-conventions
description: |
  Tumikiプロジェクトのフロントエンドコーディング規約。
  Reactコンポーネント、スタイリング、状態管理のガイドラインを提供。
  「フロントエンド規約」「コンポーネント配置」「Tailwind」などのリクエスト時にトリガー。
sourcePatterns:
  - apps/manager/src/**/*.tsx
  - apps/manager/src/app/**/*.tsx
  - packages/ui/src/**/*.tsx
---

# フロントエンド コーディング規約

## コンポーネント

### 基本ルール

- **関数コンポーネント + アロー関数**
- **必須の Props 型定義**

```typescript
type Props = {
  title: string;
  onClick: () => void;
};

export const Button = ({ title, onClick }: Props) => {
  return <button onClick={onClick}>{title}</button>;
};
```

### コンポーネント配置ルール

| 配置場所 | 用途 |
|---------|------|
| 呼び出し側と同一階層の `_components/` | そのページ/機能専用 |
| 呼び出し側の一つ上の `_components/` | 複数箇所で共通利用 |
| `packages/ui/` | アプリ横断で使用 |

```text
app/[orgSlug]/agents/
├── page.tsx
├── _components/           # このページ専用
│   └── AgentHeader.tsx
└── [agentSlug]/
    ├── page.tsx
    └── _components/       # このページ専用
        └── AgentDetail.tsx

app/[orgSlug]/_components/ # agents配下で共通利用
└── SharedComponent.tsx
```

## スタイリング

**すべてのスタイリングにTailwind CSSクラスを使用**:

```typescript
// ❌ 悪い例 - インラインスタイル
<div style={{ padding: '16px' }}>

// ❌ 悪い例 - CSSモジュール
import styles from './Component.module.css';

// ✅ 良い例 - Tailwind CSS
<div className="p-4">
```

### Tailwind CSS v4

- **プラグイン**: `@tailwindcss/postcss`
- **設定**: `globals.css`内の`@theme`ディレクティブで行う

## モバイルファースト設計

| 要件 | 値 |
|-----|-----|
| 最大幅 | 428px（スマートフォン向け） |
| タップターゲット | 最小44x44px |

## データフェッチング

**tRPC使用**:

```typescript
// Query
const { data } = trpc.user.getById.useQuery({ id: userId });

// Mutation
const mutation = trpc.user.update.useMutation();
```

## 状態管理

| スコープ | 使用技術 |
|---------|---------|
| ローカル状態 | `useState` |
| グローバル状態 | Jotai |

```typescript
// ローカル状態
const [isOpen, setIsOpen] = useState(false);

// グローバル状態（Jotai）
import { atom, useAtom } from 'jotai';

const userAtom = atom<User | null>(null);
const [user, setUser] = useAtom(userAtom);
```

## Server Components vs Client Components

| 種類 | 用途 | 例 |
|-----|------|-----|
| Server Components（デフォルト） | データ取得、初期レンダリング | 一覧表示、カード |
| Client Components（`'use client'`） | インタラクティブUI | フォーム、モーダル |

```typescript
// Server Component（デフォルト）
export const AgentList = async ({ orgId }: Props) => {
  const agents = await db.agent.findMany({ where: { orgId } });
  return <div>{agents.map(...)}</div>;
};

// Client Component
'use client';
export const CreateAgentForm = () => {
  const [name, setName] = useState('');
  return <form>...</form>;
};
```

---

## チェックリスト

- [ ] コンポーネントにProps型定義がある
- [ ] スタイリングはTailwind CSSのみ
- [ ] コンポーネントは`_components/`ディレクトリに配置
- [ ] 共通コンポーネントは適切な階層に配置
- [ ] tRPCでデータフェッチング
- [ ] グローバル状態はJotai使用
