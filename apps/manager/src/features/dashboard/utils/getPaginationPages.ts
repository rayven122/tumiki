/**
 * ページネーションで表示するページ番号の配列を返す。
 * 最初、最後、現在のページ周辺のみを表示
 */
export const getPaginationPages = (
  currentPage: number,
  totalPages: number,
): number[] => {
  // ページ数が少ない場合は全て表示
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // 常に表示するページ番号を Set で管理（重複を防ぐ）
  const pages = new Set<number>([1, totalPages]);

  // 現在のページの前後1ページも表示
  const rangeStart = Math.max(1, currentPage - 1);
  const rangeEnd = Math.min(totalPages, currentPage + 1);

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.add(i);
  }

  // Set を配列に変換してソート
  return Array.from(pages).sort((a, b) => a - b);
};
