# Fast MCP Server Proxy

複数の MCP サーバーを 1 つのエンドポイントで管理するプロキシサーバー

## 概要

このプロキシサーバーは、複数の Model Context Protocol (MCP) サーバーを単一のエンドポイントで統合的に管理することができます。内部的には`spawn`を使用して、各 MCP サーバーを子プロセスとして起動し、リクエストを適切なサーバーに振り分けます。

## 特徴

- 複数の MCP サーバーを単一のエンドポイントで管理
- 子プロセスとしての効率的なサーバー管理
- シンプルで軽量な実装
- リクエストの動的振り分け

## インストール

依存関係のインストール:

```bash
npm install
```

## 使用方法

サーバーのビルド:

```bash
npm run build
```

サーバーの起動:

```bash
npm run start
```

## 技術スタック

- フレームワーク: fastmcp v1.21.0
- その他の主要な依存関係:
  - @modelcontextprotocol/sdk
  - zod
