/** clientName → ロゴパスのマッピング */
const AI_CLIENT_LOGOS: Record<string, { dark: string; light: string }> = {
  cursor: {
    dark: "/logos/ai-clients/cursor.webp",
    light: "/logos/ai-clients/cursor.svg",
  },
  "claude code": {
    dark: "/logos/ai-clients/claude.webp",
    light: "/logos/ai-clients/claude.svg",
  },
  "claude desktop": {
    dark: "/logos/ai-clients/claude.webp",
    light: "/logos/ai-clients/claude.svg",
  },
  chatgpt: {
    dark: "/logos/ai-clients/chatgpt.webp",
    light: "/logos/ai-clients/chatgpt.svg",
  },
  cline: {
    dark: "/logos/ai-clients/cline.webp",
    light: "/logos/ai-clients/cline.svg",
  },
  copilot: {
    dark: "/logos/ai-clients/copilot.webp",
    light: "/logos/ai-clients/copilot.svg",
  },
  antigravity: {
    dark: "/logos/ai-clients/antigravity.webp",
    light: "/logos/ai-clients/antigravity.svg",
  },
};

/** clientNameからロゴ情報を取得（部分一致） */
export const getClientLogo = (
  clientName: string | null,
): { dark: string; light: string } | null => {
  if (!clientName) return null;
  const key = clientName.toLowerCase();
  return (
    Object.entries(AI_CLIENT_LOGOS).find(([k]) => key.includes(k))?.[1] ?? null
  );
};
