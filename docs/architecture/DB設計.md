<!-- ユーザは、mcpサーバーをアクセストークン(envVars)を入力することで、mcp サーバーが利用できるようになります。利用できるようになったmcp サーバーを保存するテーブルを作成してください。また、利用できるようになったmcpサーバーはこちらのアクセストークンごとに、利用できるtool が制限されます。上記の情報をもとに、テーブルを修正してください。 -->

# データベース構造

```mermaid
erDiagram
    User ||--o{ Account : has
    User ||--o{ Session : has
    User ||--o{ UserMcpServer : has
    User ||--o{ ToolGroup : has
    McpServer ||--o{ UserMcpServer : has
    McpServer ||--o{ Tool : has
    Tool ||--o{ ToolGroup : belongs_to
    Tool ||--o{ ApiKey : has
    ToolGroup ||--o{ ApiKey : has
    UserMcpServer ||--o{ Tool : has

    User {
        string id PK
        string name
        string email
        datetime emailVerified
        string image
        enum role
        enum membership
        datetime createdAt
        datetime updatedAt
    }

    Account {
        string id PK
        string userId FK
        string type
        string provider
        string providerAccountId
        string refreshToken
        string accessToken
        int expiresAt
        string tokenType
        string scope
        string idToken
        string sessionState
        int refreshTokenExpiresIn
    }

    Session {
        string id PK
        string sessionToken
        string userId FK
        datetime expires
    }

    ApiKey {
        string id PK
        string name
        string description
        string[] order
        datetime createdAt
        datetime updatedAt
    }

    McpServer {
        string id PK
        string name
        string iconPath
        string command
        string[] args
        string[] envVars
        boolean isPublic
        datetime createdAt
        datetime updatedAt
    }

    UserMcpServer {
        string id PK
        string userId FK
        string mcpServerId FK
        string name
        string[] envVars
        datetime createdAt
        datetime updatedAt
    }

    Tool {
        string id PK
        string mcpServerId FK
        string name
        string description
        json inputSchema
        boolean isEnabled
        datetime createdAt
        datetime updatedAt
    }

    ToolGroup {
        string id PK
        string userId FK
        string name
        string description
        boolean isEnabled
        string[] order
        datetime createdAt
        datetime updatedAt
    }

    VerificationToken {
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
