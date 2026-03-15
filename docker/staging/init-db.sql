-- Tumiki ステージング環境 データベース初期化スクリプト
-- Keycloak 用データベースとユーザーを作成

-- Keycloak データベースを作成
CREATE DATABASE keycloak;

-- Keycloak ユーザーを作成して権限を付与
-- パスワードは .env の KEYCLOAK_DB_PASSWORD と一致させること
CREATE USER keycloak WITH PASSWORD 'keycloak_placeholder';
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;

-- PostgreSQL 15+ では追加の権限設定が必要
\c keycloak
GRANT ALL ON SCHEMA public TO keycloak;
