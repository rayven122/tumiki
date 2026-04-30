{{/*
共通ラベル
*/}}
{{- define "tenant-console.labels" -}}
app.kubernetes.io/name: tenant-console
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: Helm
{{- end }}

{{/*
必須値の一括バリデーション
*/}}
{{- define "tenant-console.validateRequiredValues" -}}
{{- if not .Values.image.tag }}
{{- fail "image.tag は必須です。--set image.tag=<TAG> で指定してください" }}
{{- end }}
{{- if eq .Values.image.tag "latest" }}
{{- fail "image.tag に 'latest' は指定できません。再現性のあるバージョンタグを指定してください" }}
{{- end }}
{{- if not .Values.infisical.projectSlug }}
{{- fail "infisical.projectSlug は必須です" }}
{{- end }}
{{- if not .Values.infisical.environment }}
{{- fail "infisical.environment は必須です（例: prod / dev）" }}
{{- end }}
{{- end }}
