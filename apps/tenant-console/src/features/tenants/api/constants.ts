/** Helm/kubectl バイナリのフルパス（Dockerfile で /usr/local/bin に配置済み） */
export const HELM_BIN = "/usr/local/bin/helm";
export const KUBECTL_BIN = "/usr/local/bin/kubectl";

/** Helm 操作のタイムアウト: Node.js 側は Helm 側（5分）より30秒長く設定 */
export const HELM_TIMEOUT_MS = 5 * 60 * 1000 + 30_000;
