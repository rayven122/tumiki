{{/*
共通ラベル
*/}}
{{- define "tumiki-cloud-api.labels" -}}
app.kubernetes.io/name: tumiki-cloud-api
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: Helm
{{- end }}

{{/*
セレクターラベル
*/}}
{{- define "tumiki-cloud-api.selectorLabels" -}}
app.kubernetes.io/name: tumiki-cloud-api
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
必須値の一括バリデーション
*/}}
{{- define "tumiki-cloud-api.validateRequiredValues" -}}
{{- if not .Values.image.tag }}
{{- fail "image.tag は必須です。--set image.tag=<TAG> で指定してください" }}
{{- end }}
{{- if eq .Values.image.tag "latest" }}
{{- fail "image.tag に 'latest' は指定できません。再現性のあるバージョンタグを指定してください" }}
{{- end }}
{{- if regexMatch "[[:space:]]" .Values.image.tag }}
{{- fail "image.tag に空白文字を含めることはできません" }}
{{- end }}
{{- if not .Values.infisical.projectSlug }}
{{- fail "infisical.projectSlug は必須です" }}
{{- end }}
{{- if not .Values.infisical.environment }}
{{- fail "infisical.environment は必須です（例: prod / dev）" }}
{{- end }}
{{- end }}
