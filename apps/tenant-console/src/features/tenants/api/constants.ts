/** Helm/kubectl バイナリのフルパス（Dockerfile で /usr/local/bin に配置済み） */
export const HELM_BIN = "/usr/local/bin/helm";
export const KUBECTL_BIN = "/usr/local/bin/kubectl";

/** helm install のタイムアウト（リソース作成のみ、Pod 起動待ちは別途 rollout status で行う） */
export const HELM_INSTALL_TIMEOUT_MS = 60_000;

/** kubectl rollout status のタイムアウト（Pod 起動完了を待つ上限） */
export const ROLLOUT_TIMEOUT_MS = 10 * 60 * 1000 + 30_000;
