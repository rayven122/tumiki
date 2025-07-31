import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RetryableError,
  NonRetryableError,
  retryAsync,
  classifyError,
  type RetryOptions,
} from "./retry";

describe("RetryableError", () => {
  test("正常系: メッセージのみでインスタンスを作成する", () => {
    const error = new RetryableError("Test error");
    expect(error.message).toStrictEqual("Test error");
    expect(error.name).toStrictEqual("RetryableError");
    expect(error.originalError).toStrictEqual(undefined);
  });

  test("正常系: 元のエラーと共にインスタンスを作成する", () => {
    const originalError = new Error("Original error");
    const error = new RetryableError("Test error", originalError);
    expect(error.message).toStrictEqual("Test error");
    expect(error.name).toStrictEqual("RetryableError");
    expect(error.originalError).toStrictEqual(originalError);
  });
});

describe("NonRetryableError", () => {
  test("正常系: メッセージのみでインスタンスを作成する", () => {
    const error = new NonRetryableError("Test error");
    expect(error.message).toStrictEqual("Test error");
    expect(error.name).toStrictEqual("NonRetryableError");
    expect(error.originalError).toStrictEqual(undefined);
  });

  test("正常系: 元のエラーと共にインスタンスを作成する", () => {
    const originalError = new Error("Original error");
    const error = new NonRetryableError("Test error", originalError);
    expect(error.message).toStrictEqual("Test error");
    expect(error.name).toStrictEqual("NonRetryableError");
    expect(error.originalError).toStrictEqual(originalError);
  });
});

describe("retryAsync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {
      // 空のコールバック関数
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("正常系: 初回で成功する場合", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await retryAsync(fn);
    expect(result).toStrictEqual("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("正常系: 2回目で成功する場合", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("First attempt failed"))
      .mockResolvedValue("success");

    const promise = retryAsync(fn, { jitter: false });

    // 1回目の失敗後の遅延を進める
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toStrictEqual("success");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith(
      "Attempt 1/3 failed: First attempt failed. Retrying in 1000ms...",
    );
  });

  test("正常系: 最大試行回数で成功する場合", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("First attempt failed"))
      .mockRejectedValueOnce(new Error("Second attempt failed"))
      .mockResolvedValue("success");

    const promise = retryAsync(fn, { jitter: false });

    // 各失敗後の遅延を進める
    await vi.advanceTimersByTimeAsync(1000); // 1回目の失敗後
    await vi.advanceTimersByTimeAsync(2000); // 2回目の失敗後

    const result = await promise;
    expect(result).toStrictEqual("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("異常系: すべての試行が失敗する場合", async () => {
    const error = new Error("Always fails");
    const fn = vi.fn().mockRejectedValue(error);

    const promise = retryAsync(fn, { jitter: false });

    // プロミスの拒否を適切に処理するためのハンドラーを追加
    void promise.catch(() => {
      // Expected rejection
    });

    // 各失敗後の遅延を進める
    await vi.advanceTimersByTimeAsync(1000); // 1回目の失敗後
    await vi.advanceTimersByTimeAsync(2000); // 2回目の失敗後

    await expect(promise).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(3);

    // タイマーを元に戻すのを待つ
    await vi.runOnlyPendingTimersAsync();
  });

  test("異常系: NonRetryableErrorが投げられた場合は即座に失敗する", async () => {
    const error = new NonRetryableError("Non-retryable error");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(retryAsync(fn)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  test("正常系: カスタムオプションで動作する", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("First attempt failed"))
      .mockResolvedValue("success");

    const options: Partial<RetryOptions> = {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 3,
      jitter: false,
    };

    const promise = retryAsync(fn, options);

    // カスタム遅延時間を進める
    await vi.advanceTimersByTimeAsync(500);

    const result = await promise;
    expect(result).toStrictEqual("success");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith(
      "Attempt 1/2 failed: First attempt failed. Retrying in 500ms...",
    );
  });

  test("正常系: jitterが有効な場合はランダムな遅延が適用される", async () => {
    // Math.randomをモック
    const mockRandom = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("First attempt failed"))
      .mockResolvedValue("success");

    const promise = retryAsync(fn, { jitter: true });

    // jitter適用後の遅延（1000 * (0.5 + 0.5 * 0.5) = 750ms）
    await vi.advanceTimersByTimeAsync(750);

    const result = await promise;
    expect(result).toStrictEqual("success");
    expect(fn).toHaveBeenCalledTimes(2);

    mockRandom.mockRestore();
  });

  test("正常系: デフォルトでjitterが有効な場合", async () => {
    // console.warnの呼び出しを検証
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("First attempt failed"))
      .mockResolvedValue("success");

    const promise = retryAsync(fn); // デフォルトはjitter: true

    // 最大遅延時間まで進める（jitterで遅延時間が変動するため）
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toStrictEqual("success");
    expect(fn).toHaveBeenCalledTimes(2);

    // console.warnが呼ばれたことだけを確認（具体的な遅延時間は確認しない）
    expect(console.warn).toHaveBeenCalled();
    const warnMock = vi.mocked(console.warn);
    const warnCall = warnMock.mock.calls[0]?.[0] as string;
    expect(warnCall).toMatch(
      /^Attempt 1\/3 failed: First attempt failed\. Retrying in \d+ms\.\.\.$/,
    );
  });

  test("正常系: maxDelayを超える遅延は制限される", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("First"))
      .mockRejectedValueOnce(new Error("Second"))
      .mockRejectedValueOnce(new Error("Third"))
      .mockRejectedValueOnce(new Error("Fourth"))
      .mockResolvedValue("success");

    const options: Partial<RetryOptions> = {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 3000,
      backoffMultiplier: 2,
      jitter: false,
    };

    const promise = retryAsync(fn, options);

    // 各試行後の遅延を進める
    await vi.advanceTimersByTimeAsync(1000); // 1回目: 1000ms
    await vi.advanceTimersByTimeAsync(2000); // 2回目: 2000ms
    await vi.advanceTimersByTimeAsync(3000); // 3回目: 4000ms → 3000ms (maxDelay)
    await vi.advanceTimersByTimeAsync(3000); // 4回目: 8000ms → 3000ms (maxDelay)

    const result = await promise;
    expect(result).toStrictEqual("success");
    expect(fn).toHaveBeenCalledTimes(5);
  });

  test("異常系: Error以外の値が投げられた場合も処理される", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce("string error")
      .mockResolvedValue("success");

    const promise = retryAsync(fn, { jitter: false });

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toStrictEqual("success");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith(
      "Attempt 1/3 failed: string error. Retrying in 1000ms...",
    );
  });

  test("異常系: maxAttemptsが1の場合はリトライしない", async () => {
    const error = new Error("Single attempt failed");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(retryAsync(fn, { maxAttempts: 1 })).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe("classifyError", () => {
  test("正常系: RetryableErrorはそのまま返される", () => {
    const error = new RetryableError("Test error");
    const result = classifyError(error);
    expect(result).toStrictEqual(error);
  });

  test("正常系: NonRetryableErrorはそのまま返される", () => {
    const error = new NonRetryableError("Test error");
    const result = classifyError(error);
    expect(result).toStrictEqual(error);
  });

  test("正常系: ECONNRESETエラーはRetryableErrorに分類される", () => {
    const error = new Error("ECONNRESET: connection reset");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual(
      "Network error: ECONNRESET: connection reset",
    );
    expect((result as RetryableError).originalError).toStrictEqual(error);
  });

  test("正常系: ECONNREFUSEDエラーはRetryableErrorに分類される", () => {
    const error = new Error("ECONNREFUSED: connection refused");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual(
      "Network error: ECONNREFUSED: connection refused",
    );
  });

  test("正常系: ETIMEDOUTエラーはRetryableErrorに分類される", () => {
    const error = new Error("ETIMEDOUT: connection timed out");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual(
      "Network error: ETIMEDOUT: connection timed out",
    );
  });

  test("正常系: fetch failedエラーはRetryableErrorに分類される", () => {
    const error = new Error("fetch failed");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual("Network error: fetch failed");
  });

  test("正常系: UnauthorizedエラーはNonRetryableErrorに分類される", () => {
    const error = new Error("Unauthorized access");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(NonRetryableError);
    expect(result.message).toStrictEqual(
      "Authentication error: Unauthorized access",
    );
  });

  test("正常系: 401エラーはNonRetryableErrorに分類される", () => {
    const error = new Error("401 Unauthorized");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(NonRetryableError);
    expect(result.message).toStrictEqual(
      "Authentication error: 401 Unauthorized",
    );
  });

  test("正常系: 403エラーはNonRetryableErrorに分類される", () => {
    const error = new Error("403 Forbidden");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(NonRetryableError);
    expect(result.message).toStrictEqual("Authentication error: 403 Forbidden");
  });

  test("正常系: 400エラーはNonRetryableErrorに分類される", () => {
    const error = new Error("400 Bad Request");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(NonRetryableError);
    expect(result.message).toStrictEqual("Client error: 400 Bad Request");
  });

  test("正常系: 404エラーはNonRetryableErrorに分類される", () => {
    const error = new Error("404 Not Found");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(NonRetryableError);
    expect(result.message).toStrictEqual("Client error: 404 Not Found");
  });

  test("正常系: 500エラーはRetryableErrorに分類される", () => {
    const error = new Error("500 Internal Server Error");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual(
      "Server error: 500 Internal Server Error",
    );
  });

  test("正常系: 502エラーはRetryableErrorに分類される", () => {
    const error = new Error("502 Bad Gateway");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual("Server error: 502 Bad Gateway");
  });

  test("正常系: 503エラーはRetryableErrorに分類される", () => {
    const error = new Error("503 Service Unavailable");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual(
      "Server error: 503 Service Unavailable",
    );
  });

  test("正常系: 不明なエラーはRetryableErrorに分類される", () => {
    const error = new Error("Unknown error occurred");
    const result = classifyError(error);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual(
      "Unknown error: Unknown error occurred",
    );
  });

  test("正常系: Error以外の値も処理される", () => {
    const result = classifyError("string error");
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual("Unknown error: string error");
  });

  test("正常系: nullも処理される", () => {
    const result = classifyError(null);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual("Unknown error: null");
  });

  test("正常系: undefinedも処理される", () => {
    const result = classifyError(undefined);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual("Unknown error: undefined");
  });

  test("正常系: 数値も処理される", () => {
    const result = classifyError(123);
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual("Unknown error: 123");
  });

  test("正常系: オブジェクトも処理される", () => {
    const result = classifyError({ code: "ERROR" });
    expect(result).toBeInstanceOf(RetryableError);
    expect(result.message).toStrictEqual("Unknown error: [object Object]");
  });
});
