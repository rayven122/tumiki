// UserDirectoryPort: 外部 IdP から User 情報を取得する capability
// Adapter は IdP ごとにこの port を実装する
// 例: GWS (googleapis), Entra (msal-node + graph), Okta (okta-sdk)

import type { ExternalId } from "../domain/branded.js";
import type { RemoteFetchResult, RemoteUserSnapshot } from "./types.js";

export type UserDirectoryPort = {
  // すべての User をスナップショットとして取得
  // Pull 経路で利用、Differ が現在状態と比較して差分を導出
  readonly fetchAllUsers: () => Promise<RemoteFetchResult<RemoteUserSnapshot>>;

  // 単一 User を取得（JIT 経路で必要に応じて利用）
  readonly fetchUser: (
    externalId: ExternalId,
  ) => Promise<RemoteUserSnapshot | null>;
};
