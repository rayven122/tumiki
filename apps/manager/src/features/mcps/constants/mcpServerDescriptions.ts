export type ServerData = {
  tags: string[];
  description: string;
};

export const MCP_SERVER_DATA: Record<string, ServerData> = {
  github: {
    tags: ["開発", "バージョン管理"],
    description:
      "GitHubリポジトリの管理、イシューの作成・更新、プルリクエストの操作など、開発ワークフローを効率化します。コードレビューやプロジェクト管理を自動化し、開発チームの生産性を向上させます。",
  },
  slack: {
    tags: ["コミュニケーション", "通知"],
    description:
      "Slackチャンネルへのメッセージ送信、通知の管理、チームメンバーとのリアルタイムコミュニケーションを支援します。ワークフローの自動化と効率的なチーム連携を実現します。",
  },
  notion: {
    tags: ["ドキュメント", "プロジェクト管理"],
    description:
      "Notionページの作成・編集、データベースの操作、プロジェクト情報の管理を自動化します。ドキュメント作成やタスク管理を効率化し、情報の一元管理を支援します。",
  },
  google: {
    tags: ["ファイル管理", "ストレージ"],
    description:
      "Google Driveのファイル・フォルダ管理、共有設定、ドキュメントの作成・編集機能を提供します。クラウドストレージの効率的な活用とファイル管理の自動化を実現します。",
  },
  drive: {
    tags: ["ファイル管理", "ストレージ"],
    description:
      "Google Driveのファイル・フォルダ管理、共有設定、ドキュメントの作成・編集機能を提供します。クラウドストレージの効率的な活用とファイル管理の自動化を実現します。",
  },
  jira: {
    tags: ["プロジェクト管理", "タスク"],
    description:
      "Jiraチケットの作成・更新、プロジェクト進捗の追跡、アジャイル開発のサポートを行います。プロジェクト管理とタスクトラッキングを効率化し、開発チームの協業を促進します。",
  },
  discord: {
    tags: ["コミュニケーション", "チーム"],
    description:
      "Discordサーバーでのメッセージ送信、チャンネル管理、ボット機能による自動化を実現します。コミュニティ運営とチームコミュニケーションの効率化を支援します。",
  },
  figma: {
    tags: ["デザイン", "UI/UX"],
    description:
      "Figmaデザインファイルの管理、コメント機能、デザインシステムとの連携をサポートします。デザインワークフローの自動化と効率的なデザインレビューを実現します。",
  },
  aws: {
    tags: ["インフラ", "クラウド"],
    description:
      "AWSリソースの監視・管理、EC2インスタンスの操作、クラウドインフラの自動化を提供します。インフラ運用の効率化とコスト最適化を支援します。",
  },
  docker: {
    tags: ["コンテナ", "DevOps"],
    description:
      "Dockerコンテナの管理、イメージのビルド・デプロイ、開発環境の構築を自動化します。コンテナベースの開発とDevOpsワークフローを効率化します。",
  },
  postgresql: {
    tags: ["データベース", "ストレージ"],
    description:
      "PostgreSQLデータベースへのクエリ実行、データの取得・更新、スキーマ管理を行います。データベース操作の自動化と効率的なデータ管理を実現します。",
  },
  postgres: {
    tags: ["データベース", "ストレージ"],
    description:
      "PostgreSQLデータベースへのクエリ実行、データの取得・更新、スキーマ管理を行います。データベース操作の自動化と効率的なデータ管理を実現します。",
  },
  neon: {
    tags: ["データベース", "サーバーレス"],
    description:
      "サーバーレスPostgreSQLデータベースの管理、スケーラブルなデータベース操作、開発・本番環境の分離管理を提供します。モダンなアプリケーション開発のためのデータベースソリューションを実現します。",
  },
  playwright: {
    tags: ["テスト", "自動化"],
    description:
      "ブラウザ自動化によるウェブページ操作、スクリーンショット取得、フォーム入力、複数ブラウザでの動作テストを実行します。E2Eテストの自動化とWebアプリケーションの品質保証を支援します。",
  },
  context7: {
    tags: ["ドキュメント", "検索"],
    description:
      "最新ライブラリのドキュメントとコード例を迅速に取得する強力なツールです。古い情報に頼らず、効率的で正確なプログラミングをサポートします。開発者の生産性向上と最新技術へのキャッチアップを支援します。",
  },
  filesystem: {
    tags: ["ファイル管理", "ローカル"],
    description:
      "ローカルファイルシステムへの読み書き、ディレクトリ操作、ファイル検索などを行います。ファイル管理の自動化と効率的なデータ処理を支援します。",
  },
  file: {
    tags: ["ファイル管理", "ローカル"],
    description:
      "ローカルファイルシステムへの読み書き、ディレクトリ操作、ファイル検索などを行います。ファイル管理の自動化と効率的なデータ処理を支援します。",
  },
  sqlite: {
    tags: ["データベース", "軽量"],
    description:
      "SQLiteデータベースの操作、クエリ実行、スキーマ管理を行います。軽量なデータベース操作の自動化と効率的なデータ管理を実現します。",
  },
  brave: {
    tags: ["検索", "プライバシー"],
    description:
      "Brave Search APIを使用した検索機能を提供します。プライバシー重視の検索エンジンを活用した情報収集と調査作業を支援します。",
  },
  search: {
    tags: ["検索", "情報収集"],
    description:
      "検索機能を提供し、情報収集と調査作業を効率化します。必要なデータの迅速な取得を支援します。",
  },
};

// デフォルトのサーバーデータ
export const DEFAULT_SERVER_DATA: ServerData = {
  tags: ["ツール", "サービス"],
  description:
    "このMCPサーバーは様々な機能を提供し、AIとの連携を通じてワークフローの自動化をサポートします。",
};

// サーバー名からデータを取得するヘルパー関数
export const getMcpServerData = (serverName: string): ServerData => {
  const serverNameLower = serverName.toLowerCase();

  // 完全一致を試みる
  if (MCP_SERVER_DATA[serverNameLower]) {
    return MCP_SERVER_DATA[serverNameLower];
  }

  // 部分一致を試みる
  const matchedKey = Object.keys(MCP_SERVER_DATA).find((key) =>
    serverNameLower.includes(key),
  );

  return matchedKey && MCP_SERVER_DATA[matchedKey]
    ? MCP_SERVER_DATA[matchedKey]
    : DEFAULT_SERVER_DATA;
};

// 説明文のみを取得するヘルパー関数
export const getMcpServerDescription = (serverName: string): string => {
  const data = getMcpServerData(serverName);
  return data.description;
};

// タグのみを取得するヘルパー関数
export const getMcpServerTags = (serverName: string): string[] => {
  const data = getMcpServerData(serverName);
  return data.tags;
};
