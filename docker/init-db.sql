-- Keycloak用データベースとユーザーを作成
-- このスクリプトはPostgreSQLコンテナの初回起動時に自動実行されます

-- Keycloak用データベースを作成
CREATE DATABASE keycloak;

-- Keycloak用ユーザーを作成
CREATE USER keycloak WITH PASSWORD 'keycloak123';

-- Keycloakデータベースに接続
\c keycloak

-- Keycloakユーザーに全権限を付与
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;
GRANT ALL PRIVILEGES ON SCHEMA public TO keycloak;
