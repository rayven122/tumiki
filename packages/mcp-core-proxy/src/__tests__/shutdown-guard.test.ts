import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  createOrphanWatchdog,
  createShutdownTimer,
  isOrphanedByPpid,
} from "../shutdown-guard.js";

describe("createShutdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("timeoutMs 経過後に onTimeout が呼ばれる", () => {
    const onTimeout = vi.fn();
    createShutdownTimer({ timeoutMs: 5000, onTimeout });

    vi.advanceTimersByTime(4999);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledOnce();
  });

  test("cancel() を呼ぶと onTimeout は呼ばれない", () => {
    const onTimeout = vi.fn();
    const timer = createShutdownTimer({ timeoutMs: 1000, onTimeout });
    timer.cancel();

    vi.advanceTimersByTime(10_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  test("cancel() を複数回呼んでもエラーにならない（冪等）", () => {
    const onTimeout = vi.fn();
    const timer = createShutdownTimer({ timeoutMs: 1000, onTimeout });
    expect(() => {
      timer.cancel();
      timer.cancel();
    }).not.toThrow();
  });
});

describe("createOrphanWatchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("isOrphaned が true を返すと onOrphaned が呼ばれる", () => {
    let orphaned = false;
    const onOrphaned = vi.fn();
    createOrphanWatchdog({
      intervalMs: 1000,
      isOrphaned: () => orphaned,
      onOrphaned,
    });

    vi.advanceTimersByTime(1000);
    expect(onOrphaned).not.toHaveBeenCalled();

    orphaned = true;
    vi.advanceTimersByTime(1000);
    expect(onOrphaned).toHaveBeenCalledOnce();
  });

  test("isOrphaned が常に false の間は onOrphaned が呼ばれない", () => {
    const onOrphaned = vi.fn();
    createOrphanWatchdog({
      intervalMs: 1000,
      isOrphaned: () => false,
      onOrphaned,
    });

    vi.advanceTimersByTime(10_000);
    expect(onOrphaned).not.toHaveBeenCalled();
  });

  test("orphan 検知後は二度と onOrphaned を呼ばない", () => {
    const onOrphaned = vi.fn();
    createOrphanWatchdog({
      intervalMs: 1000,
      isOrphaned: () => true,
      onOrphaned,
    });

    vi.advanceTimersByTime(5000);
    expect(onOrphaned).toHaveBeenCalledTimes(1);
  });

  test("stop() を呼んだ後は onOrphaned が呼ばれない", () => {
    let orphaned = false;
    const onOrphaned = vi.fn();
    const watchdog = createOrphanWatchdog({
      intervalMs: 1000,
      isOrphaned: () => orphaned,
      onOrphaned,
    });

    watchdog.stop();
    orphaned = true;
    vi.advanceTimersByTime(10_000);
    expect(onOrphaned).not.toHaveBeenCalled();
  });

  test("stop() を複数回呼んでもエラーにならない（冪等）", () => {
    const watchdog = createOrphanWatchdog({
      intervalMs: 1000,
      isOrphaned: () => false,
      onOrphaned: vi.fn(),
    });
    expect(() => {
      watchdog.stop();
      watchdog.stop();
    }).not.toThrow();
  });
});

describe("isOrphanedByPpid", () => {
  test("process.ppid が 1 のとき true を返す", () => {
    const original = Object.getOwnPropertyDescriptor(process, "ppid");
    Object.defineProperty(process, "ppid", {
      value: 1,
      configurable: true,
    });
    try {
      expect(isOrphanedByPpid()).toStrictEqual(true);
    } finally {
      if (original) Object.defineProperty(process, "ppid", original);
    }
  });

  test("process.ppid が 1 以外のとき false を返す", () => {
    const original = Object.getOwnPropertyDescriptor(process, "ppid");
    Object.defineProperty(process, "ppid", {
      value: 12345,
      configurable: true,
    });
    try {
      expect(isOrphanedByPpid()).toStrictEqual(false);
    } finally {
      if (original) Object.defineProperty(process, "ppid", original);
    }
  });
});
