/**
 * 交差テーブルの sortOrder を利用してソートを行い、交差テーブルを削除してデータを返す
 */
export const convertToSortOrder = <
  T extends { sortOrder: number },
  S extends keyof T,
>(
  crossTableList: T[],
  // 交差テーブルのキー
  key: S,
) => {
  return crossTableList
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item[key]);
};
