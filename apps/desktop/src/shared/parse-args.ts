/** 引数文字列をJSON配列に変換（既にJSON配列ならそのまま、スペース区切りなら分割） */
export const parseArgsToJson = (input: string): string => {
  if (!input) return "[]";
  try {
    const parsed: unknown = JSON.parse(input);
    if (Array.isArray(parsed)) return input;
  } catch {
    // JSONパース失敗 → スペース区切りとして分割
  }
  return JSON.stringify(input.split(/\s+/).filter(Boolean));
};
