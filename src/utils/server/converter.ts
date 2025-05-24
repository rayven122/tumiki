/**
 * 交差テーブルの sortOrder を利用してソートを行う
 */
export const convertToSortOrder = <T extends { sortOrder: number }>(
  crossTableList: T[],
) => {
  return crossTableList.sort((a, b) => a.sortOrder - b.sortOrder);
};
