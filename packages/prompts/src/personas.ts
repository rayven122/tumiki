/**
 * ペルソナレジストリ
 *
 * personas/ ディレクトリの .md ファイルを自動検出し、
 * メタデータ一覧の取得やペルソナ本文の読み込みを提供する
 */

import { join } from "node:path";

import type { Persona, PersonaMetadata } from "./types.js";
import {
  listMarkdownFiles,
  parseFrontmatter,
  readMarkdownFile,
  resolveContentDir,
  validatePersonaMetadata,
} from "./loader.js";

const DEFAULT_PERSONA_ID = "default";

const FALLBACK_PERSONA: Persona = {
  metadata: {
    id: DEFAULT_PERSONA_ID,
    name: "Default Assistant",
    description: "A friendly, concise AI assistant",
  },
  content:
    "You are a friendly assistant! Keep your responses concise and helpful.\nAlways respond in the same language as the user's message.",
};

/**
 * 利用可能なペルソナ一覧を取得
 */
export const listPersonas = (): PersonaMetadata[] => {
  const dir = resolveContentDir("personas");
  const files = listMarkdownFiles(dir);

  return files.map((file) => {
    const raw = readMarkdownFile(join(dir, file));
    const { metadata } = parseFrontmatter(raw);
    return validatePersonaMetadata(metadata);
  });
};

/**
 * 指定IDのペルソナを読み込む
 * 見つからない場合は default にフォールバック
 */
export const loadPersona = (personaId?: string): Persona => {
  const id = personaId ?? DEFAULT_PERSONA_ID;
  const dir = resolveContentDir("personas");
  const filePath = join(dir, `${id}.md`);

  try {
    const raw = readMarkdownFile(filePath);
    const { metadata, content } = parseFrontmatter(raw);
    return { metadata: validatePersonaMetadata(metadata), content };
  } catch {
    if (id !== DEFAULT_PERSONA_ID) {
      return loadPersona(DEFAULT_PERSONA_ID);
    }
    return FALLBACK_PERSONA;
  }
};
