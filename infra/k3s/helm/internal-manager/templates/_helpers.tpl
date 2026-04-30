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
app.kubernetes.io/managed-by: Helm
{{- end }}
