// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Slack OAuth開始エンドポイント
 *
 * Slack認可ページへリダイレクトする
 */

import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

// Slack OAuth設定
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/slack/oauth/callback`;

// 必要なBot Token Scopes
const SLACK_SCOPES = [
  "chat:write", // メッセージ送信
  "channels:read", // パブリックチャンネル一覧
  "groups:read", // プライベートチャンネル一覧
].join(",");

export const GET = async (request: Request) => {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 環境変数チェック
  if (!SLACK_CLIENT_ID) {
    return NextResponse.json(
      { error: "Slack OAuth is not configured" },
      { status: 500 },
    );
  }

  // URLパラメータから組織スラグを取得
  const { searchParams } = new URL(request.url);
  const orgSlug = searchParams.get("orgSlug");

  if (!orgSlug) {
    return NextResponse.json(
      { error: "Organization slug is required" },
      { status: 400 },
    );
  }

  // OAuthステートを生成（CSRF対策）
  const state = randomBytes(32).toString("hex");

  // ステートをCookieに保存（コールバックで検証）
  const cookieStore = await cookies();
  cookieStore.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10分
    path: "/",
  });

  // 組織スラグもCookieに保存（コールバックで使用）
  cookieStore.set("slack_oauth_org_slug", orgSlug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10分
    path: "/",
  });

  // Slack認可URLを構築
  const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
  slackAuthUrl.searchParams.set("client_id", SLACK_CLIENT_ID);
  slackAuthUrl.searchParams.set("scope", SLACK_SCOPES);
  slackAuthUrl.searchParams.set("redirect_uri", SLACK_REDIRECT_URI);
  slackAuthUrl.searchParams.set("state", state);

  // Slack認可ページへリダイレクト
  return NextResponse.redirect(slackAuthUrl.toString());
};
