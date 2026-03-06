/**
 * 指定したミリ秒数だけ待機する
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
