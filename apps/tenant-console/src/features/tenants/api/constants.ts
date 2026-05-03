/** Helm/kubectl バイナリのフルパス（Dockerfile で /usr/local/bin に配置済み） */
export const HELM_BIN = "/usr/local/bin/helm";
export const KUBECTL_BIN = "/usr/local/bin/kubectl";

/** helm install のタイムアウト（リソース作成のみ、Pod 起動待ちは別途 rollout status で行う） */
export const HELM_INSTALL_TIMEOUT_MS = 60_000;

/** kubectl rollout status のタイムアウト（Pod 起動完了を待つ上限） */
export const ROLLOUT_TIMEOUT_MS = 10 * 60 * 1000 + 30_000;

/** helm uninstall のタイムアウト（Finalizer 付きリソースの削除待ちを考慮し helm --timeout 5m より長く設定） */
export const HELM_UNINSTALL_TIMEOUT_MS = 5 * 60 * 1000 + 30_000;

/** helm upgrade のタイムアウト（install と同程度） */
export const HELM_UPGRADE_TIMEOUT_MS = 60_000;
