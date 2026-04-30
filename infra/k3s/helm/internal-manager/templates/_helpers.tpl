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
必須値の一括バリデーション
未指定のままインストールすると Namespace 名衝突などで Silo モデルが崩壊するため明示指定を必須化
slug は DNS RFC1123 準拠（小文字英数字とハイフンのみ）であることを検証
*/}}
{{- define "internal-manager.validateRequiredValues" -}}
{{- if not .Values.tenant.slug }}
{{- fail "tenant.slug は必須です。--set tenant.slug=<SLUG> で指定してください" }}
{{- end }}
{{- if not (regexMatch "^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$" .Values.tenant.slug) }}
{{- fail "tenant.slug は DNS RFC1123 ラベル形式（小文字英数字とハイフンのみ、先頭末尾は英数字、最大63文字）でなければなりません" }}
{{- end }}
{{- if not .Values.tenant.domain }}
{{- fail "tenant.domain は必須です。--set tenant.domain=<DOMAIN> で指定してください" }}
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
- 空文字: "<repo>:" となり latest 扱い
- "latest": 浮動タグで再現性が損なわれる
- 空白文字: 不正なタグ形式
*/}}
{{- define "internal-manager.validateImageTag" -}}
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
