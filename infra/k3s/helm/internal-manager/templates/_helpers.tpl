{{/*
テナントのNamespace名
*/}}
{{- define "internal-manager.namespace" -}}
{{- printf "tenant-%s" .Values.tenant.slug }}
{{- end }}

{{/*
共通ラベル
*/}}
{{- define "internal-manager.labels" -}}
app.kubernetes.io/name: internal-manager
app.kubernetes.io/instance: {{ .Values.tenant.slug }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: Helm
{{- end }}

{{/*
image.tag の必須バリデーション
空文字の場合 "<repo>:" となり latest 扱いで再現性が損なわれるため明示指定を必須にする
*/}}
{{- define "internal-manager.validateImageTag" -}}
{{- if not .Values.image.tag }}
{{- fail "image.tag は必須です。--set image.tag=<TAG> で明示指定してください" }}
{{- end }}
{{- end }}
