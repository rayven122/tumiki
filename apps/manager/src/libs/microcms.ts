import { createClient } from "microcms-js-sdk";

// ビルド時に環境変数が設定されていない場合でもビルドを継続できるようにする
const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = process.env.MICROCMS_API_KEY;

if (!serviceDomain || !apiKey) {
  console.warn(
    "MICROCMS_SERVICE_DOMAIN or MICROCMS_API_KEY is not set. Blog features will be disabled.",
  );
}

export const client = createClient({
  serviceDomain: serviceDomain ?? "dummy", // ダミー値を設定してビルドエラーを回避
  apiKey: apiKey ?? "dummy",
});
