1. 会員登録しているユーザごとに、api key を発行する
2. APIキー ごとに、mcp server proxy に接続してAPIを呼び出す時のアクセストークンを切り替える

- tool を動的に増やしたり減らしたりする検証をする必要あり
- session 管理のみ、外部にすることで、サーバーレスでも問題なさそうなので、vercel への移行を検討する
  - next auth 側の session を利用するか要検討


- 各種toolの増減による権限管理をした API キーを発行する。このAPIキーを使うと、どのユーザでも同一のアクセストークンで、API呼び出し可能

## データベース構造

```mermaid
erDiagram
    users ||--o{ api_keys : has
    api_keys ||--o{ api_key_access_tokens : uses
    mcp_servers ||--o{ access_tokens : has
    access_tokens ||--o{ api_key_access_tokens : used_by
    api_keys ||--o{ api_key_tool_permissions : has
    tool_permissions ||--o{ api_key_tool_permissions : has
    mcp_servers ||--o{ tools : has
    tools ||--o{ tool_permissions : has

    users {
        int id PK
        string email
        string password_hash
        datetime created_at
        datetime updated_at
    }

    api_keys {
        int id PK
        int user_id FK
        string api_key
        string name
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime expires_at
    }

    mcp_servers {
        int id PK
        string name
        string host
        int port
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    access_tokens {
        int id PK
        int mcp_server_id FK
        string token
        string provider
        datetime created_at
        datetime updated_at
        datetime expires_at
    }

    api_key_access_tokens {
        int id PK
        int api_key_id FK
        int access_token_id FK
        datetime created_at
        datetime updated_at
    }

    tools {
        int id PK
        int mcp_server_id FK
        string name
        string description
        string endpoint
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    tool_permissions {
        int id PK
        int tool_id FK
        string name
        string description
        datetime created_at
        datetime updated_at
    }

    api_key_tool_permissions {
        int id PK
        int api_key_id FK
        int tool_permission_id FK
        boolean can_read
        boolean can_write
        datetime created_at
        datetime updated_at
    }
```
