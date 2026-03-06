/**
 * トランスポートタイプのラベルマップ
 */
export const TRANSPORT_TYPE_LABELS = {
  SSE: "SSE",
  STREAMABLE_HTTPS: "Streamable HTTP",
} as const;

export type TransportType = keyof typeof TRANSPORT_TYPE_LABELS;
