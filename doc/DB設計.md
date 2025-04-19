# データベース構造

```mermaid
erDiagram
    users ||--o{ api_keys : has
    users ||--o{ accounts : has
    users ||--o{ sessions : has
    api_keys ||--o{ api_key_access_tokens : uses
    api_keys ||--o{ api_key_logs : has
    mcp_servers ||--o{ access_tokens : has
    access_tokens ||--o{ api_key_access_tokens : used_by
    api_keys ||--o{ api_key_tool_permissions : has
    tool_permissions ||--o{ api_key_tool_permissions : has
    mcp_servers ||--o{ tools : has
    tools ||--o{ tool_permissions : has

    users {
        string id PK
        string name
        string email
        datetime email_verified
        string image
        enum role
        enum membership
        datetime created_at
        datetime updated_at
    }

    accounts {
        string id PK
        string user_id FK
        string type
        string provider
        string provider_account_id
        string refresh_token
        string access_token
        int expires_at
        string token_type
        string scope
        string id_token
        string session_state
        int refresh_token_expires_in
    }

    sessions {
        string id PK
        string session_token
        string user_id FK
        datetime expires
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

    api_key_logs {
        int id PK
        int api_key_id FK
        string action
        string endpoint
        string request_body
        string response_body
        int status_code
        datetime created_at
    }

    mcp_servers {
        int id PK
        string name
        string command
        string[] args
        string[] env_vars
        string working_directory
        enum status
        datetime last_started_at
        datetime last_stopped_at
        datetime deleted_at
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

    verification_tokens {
        string identifier
        string token
        datetime expires
    }
```

## 列挙型

### Role
- ADMIN: システム管理者
- SERVER_MANAGER: サーバー管理者
- USER: ユーザー
- VIEWER: 閲覧者

### MembershipType
- FREE: 無料
- PREMIUM: 有料

### ServerStatus
- ACTIVE: 稼働中
- INACTIVE: 停止中
- DELETED: 論理削除
