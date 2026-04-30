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
セレクター用ラベル（Deployment/Service の selector で使用）
*/}}
{{- define "tumiki-cloud-api.selectorLabels" -}}
app.kubernetes.io/name: tumiki-cloud-api
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
必須値の一括バリデーション
*/}}
{{- define "tumiki-cloud-api.validateRequiredValues" -}}
{{- if not .Values.namespace }}
{{- fail "namespace は必須です" }}
{{- end }}
{{- if not .Values.infisical.projectSlug }}
{{- fail "infisical.projectSlug は必須です。--set infisical.projectSlug=<SLUG> で指定してください" }}
{{- end }}
{{- if not .Values.infisical.environment }}
{{- fail "infisical.environment は必須です。--set infisical.environment=<ENV> で指定してください（例: prod / dev）" }}
{{- end }}
{{- end }}

{{/*
image.tag の必須バリデーション
- 空文字: latest 扱いになるため再現性が損なわれる
- "latest": 浮動タグで再現性が損なわれる
- 空白文字: 不正なタグ形式
*/}}
{{- define "tumiki-cloud-api.validateImageTag" -}}
{{- if not .Values.image.tag }}
{{- fail "image.tag は必須です。--set image.tag=<TAG> で明示指定してください" }}
{{- end }}
{{- if eq .Values.image.tag "latest" }}
{{- fail "image.tag に 'latest' は指定できません。再現性のあるバージョンタグまたは SHA を指定してください" }}
{{- end }}
{{- if regexMatch "[[:space:]]" .Values.image.tag }}
{{- fail "image.tag に空白文字を含めることはできません" }}
{{- end }}
{{- end }}
