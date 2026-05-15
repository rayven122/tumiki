/**
 * MCP プロキシのシャットダウン保証ヘルパー。
 *
 * `--mcp-proxy` プロセスは AI クライアント（Cursor / Claude Code 等）から spawn される。
 * 通常は AI クライアント終了時に stdin EOF or SIGTERM が飛んできて
 * `cli.ts` の `shutdown()` が走るが、以下のケースで proxy が orphan 化する:
 *
 *   1. `core.stopAll()` / `hooks.onShutdown()` のどこかで hang → `process.exit` 未到達
 *   2. shim プロセスが SIGTERM を受けても子に伝播しない → 親不在のまま生存
 *   3. AI クライアントがクラッシュして signal も stdin EOF も飛ばない
 *
 * 本モジュールは:
 *   - shutdown ハードタイムアウト: shutdown 処理が一定時間で完了しなければ強制 exit
 *   - orphan watchdog: 親プロセス死亡を `process.ppid === 1` で検知して shutdown 起動
 * の 2 段で網羅する。
 */

export type ShutdownTimer = {
  /** タイムアウト到達前に処理が完了した場合に呼ぶ。タイマーを解除する。 */
  cancel: () => void;
};

/**
 * `timeoutMs` 経過後に `onTimeout` を呼ぶワンショットタイマーを起動。
 * `unref()` 済みなので、このタイマーだけがイベントループを生かすことはない
 * （正常 shutdown 完了時にプロセスが exit するのを阻害しない）。
 */
export const createShutdownTimer = (options: {
  timeoutMs: number;
  onTimeout: () => void;
}): ShutdownTimer => {
  const timer = setTimeout(options.onTimeout, options.timeoutMs);
  timer.unref();
  return { cancel: () => clearTimeout(timer) };
};

export type OrphanWatchdog = {
  /** 監視を停止（テスト終了時や shutdown 開始時に呼ぶ） */
  stop: () => void;
};

/**
 * 一定間隔で `isOrphaned()` を評価し、true を返したら 1 度だけ `onOrphaned()` を呼ぶ。
 *
 * 既定では `process.ppid === 1` を orphan 判定として使う想定（init に adoption されている）。
 * テスト時には `isOrphaned` を差し替えて挙動を検証する。
 */
export const createOrphanWatchdog = (options: {
  intervalMs: number;
  isOrphaned: () => boolean;
  onOrphaned: () => void;
}): OrphanWatchdog => {
  let stopped = false;
  const timer = setInterval(() => {
    if (stopped) return;
    if (options.isOrphaned()) {
      stopped = true;
      clearInterval(timer);
      options.onOrphaned();
    }
  }, options.intervalMs);
  timer.unref();
  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
};

/**
 * `process.ppid` ベースの orphan 判定。
 * PPID が 1 (init) になっていたら親プロセスは既に終了済み。
 *
 * 注意: macOS の launchd 配下で動くケースでは launchd 自体が PID 1 の親代理に
 * なるため、最初から ppid===1 のことがある。本判定で利用するのは「spawn 時点では
 * 親がいたが後で死んだ」を狙うため、launchd 直接起動ではなく AI クライアントから
 * 派生したケースが対象（実運用ではほぼ全てこちら）。
 */
export const isOrphanedByPpid = (): boolean => process.ppid === 1;
