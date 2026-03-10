import { NextResponse } from "next/server";

// ヘルスチェックエンドポイント（Docker HEALTHCHECK / Cloud Run liveness probe 用）
export const GET = () => NextResponse.json({ status: "ok" });

export const dynamic = "force-dynamic";
