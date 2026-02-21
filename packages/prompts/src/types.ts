/**
 * ペルソナのメタデータ（frontmatter から抽出）
 */
export type PersonaMetadata = {
  id: string;
  name: string;
  description: string;
  icon?: string;
};

/**
 * ペルソナ（メタデータ + プロンプト本文）
 */
export type Persona = {
  metadata: PersonaMetadata;
  content: string;
};

/**
 * 位置情報ヒント
 */
export type RequestHints = {
  latitude: string | undefined;
  longitude: string | undefined;
  city: string | undefined;
  country: string | undefined;
};

/**
 * systemPrompt 組み立てオプション
 */
export type SystemPromptOptions = {
  selectedChatModel: string;
  requestHints?: RequestHints;
  mcpToolNames?: string[];
  personaId?: string;
  /** 解決済みプロンプト本文（指定時は personaId より優先） */
  personaContent?: string;
};

/**
 * プロンプトの各セクション
 */
export type PromptSection = {
  key: string;
  content: string;
};

/**
 * systemPrompt の返り値
 */
export type SystemPromptResult = {
  /** 結合済みプロンプト文字列 */
  prompt: string;
  /** 各セクション（テスト・デバッグ用） */
  sections: PromptSection[];
};

/**
 * アーティファクトの種類
 */
export type ArtifactKind = "text" | "code" | "image" | "sheet";
