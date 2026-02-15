// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Slack OAuthコールバックエンドポイント
 *
 * Slackからのリダイレクトを処理し、アクセストークンを取得・保存する
 */

import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { cookies } from "next/headers";
import { db } from "@tumiki/db/server";

// Slack OAuth設定
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/slack/oauth/callback`;

type SlackOAuthResponse = {
  ok: boolean;
  error?: string;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
  };
};

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Cookieからステートと組織スラグを取得
  const cookieStore = await cookies();
  const storedState = cookieStore.get("slack_oauth_state")?.value;
  const orgSlug = cookieStore.get("slack_oauth_org_slug")?.value;

  // Cookieを削除
  cookieStore.delete("slack_oauth_state");
  cookieStore.delete("slack_oauth_org_slug");

  // エラーレスポンスの処理
  if (error) {
    const errorMessage =
      error === "access_denied"
        ? "Slack連携がキャンセルされました"
        : `Slack連携エラー: ${error}`;
    return redirectWithError(orgSlug, errorMessage);
  }

  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return redirectWithError(orgSlug, "認証が必要です");
  }

  // ステート検証（CSRF対策）
  if (!state || state !== storedState) {
    return redirectWithError(orgSlug, "無効なリクエストです（state不一致）");
  }

  // コードの検証
  if (!code) {
    return redirectWithError(orgSlug, "認可コードがありません");
  }

  // 組織スラグの検証
  if (!orgSlug) {
    return redirectWithError(undefined, "組織情報がありません");
  }

  // 環境変数チェック
  if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
    return redirectWithError(orgSlug, "Slack OAuthが設定されていません");
  }

  try {
    // アクセストークンを取得
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    });

    const tokenData = (await tokenResponse.json()) as SlackOAuthResponse;

    if (!tokenData.ok) {
      console.error("Slack OAuth error:", tokenData.error);
      return redirectWithError(
        orgSlug,
        `Slackトークン取得エラー: ${tokenData.error}`,
      );
    }

    const { access_token, team } = tokenData;

    if (!access_token || !team) {
      return redirectWithError(orgSlug, "トークン情報が不完全です");
    }

    // 組織を取得
    const organization = await db.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });

    if (!organization) {
      return redirectWithError(orgSlug, "組織が見つかりません");
    }

    // Bot Tokenを保存（prisma-field-encryptionで自動暗号化）
    await db.organization.update({
      where: { id: organization.id },
      data: {
        slackBotToken: access_token,
        slackTeamId: team.id,
        slackTeamName: team.name,
        slackConnectedAt: new Date(),
        slackConnectedById: session.user.id,
      },
    });

    // 成功時は設定ページにリダイレクト
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      new URL(`/${orgSlug}/settings?slack=connected`, baseUrl),
    );
  } catch (err) {
    console.error("Slack OAuth callback error:", err);
    return redirectWithError(orgSlug, "Slack連携処理中にエラーが発生しました");
  }
};

/**
 * エラー時のリダイレクト
 */
const redirectWithError = (
  orgSlug: string | undefined,
  message: string,
): NextResponse => {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectPath = orgSlug ? `/${orgSlug}/settings` : "/";
  const url = new URL(redirectPath, baseUrl);
  url.searchParams.set("slack_error", message);
  return NextResponse.redirect(url);
};
