// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Slack連携 tRPCルーター（EE機能）
 *
 * Slack OAuth連携、連携状態取得、チャンネル一覧取得を提供
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { listSlackChannels } from "@tumiki/slack";

/**
 * Slack連携状態の出力スキーマ
 */
const SlackConnectionStatusSchema = z.object({
  isConnected: z.boolean(),
  teamName: z.string().nullable(),
  connectedAt: z.date().nullable(),
  connectedByName: z.string().nullable(),
});

/**
 * Slackチャンネルの出力スキーマ
 */
const SlackChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  isPrivate: z.boolean(),
});

/**
 * Slack連携解除入力スキーマ
 */
const DisconnectSlackInputSchema = z.object({});

/**
 * OAuth URL出力スキーマ
 */
const OAuthUrlSchema = z.object({
  url: z.string(),
  isConfigured: z.boolean(),
});

export const slackIntegrationRouter = createTRPCRouter({
  /**
   * Slack連携状態を取得
   */
  getConnectionStatus: protectedProcedure
    .output(SlackConnectionStatusSchema)
    .query(async ({ ctx }) => {
      const organization = await ctx.db.organization.findUnique({
        where: { id: ctx.currentOrg.id },
        select: {
          slackTeamName: true,
          slackConnectedAt: true,
          slackConnectedBy: {
            select: { name: true },
          },
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "組織が見つかりません",
        });
      }

      return {
        isConnected: !!organization.slackTeamName,
        teamName: organization.slackTeamName,
        connectedAt: organization.slackConnectedAt,
        connectedByName: organization.slackConnectedBy?.name ?? null,
      };
    }),

  /**
   * Slack OAuth URLを取得
   */
  getOAuthUrl: protectedProcedure.output(OAuthUrlSchema).query(({ ctx }) => {
    const isConfigured = !!process.env.SLACK_CLIENT_ID;
    const url = `/api/slack/oauth?orgSlug=${encodeURIComponent(ctx.currentOrg.slug)}`;

    return { url, isConfigured };
  }),

  /**
   * Slack連携を解除
   */
  disconnect: protectedProcedure
    .input(DisconnectSlackInputSchema)
    .mutation(async ({ ctx }) => {
      await ctx.db.organization.update({
        where: { id: ctx.currentOrg.id },
        data: {
          slackBotToken: null,
          slackTeamId: null,
          slackTeamName: null,
          slackConnectedAt: null,
          slackConnectedById: null,
        },
      });

      return { success: true };
    }),

  /**
   * Slackチャンネル一覧を取得
   */
  listChannels: protectedProcedure
    .output(z.array(SlackChannelSchema))
    .query(async ({ ctx }) => {
      const organization = await ctx.db.organization.findUnique({
        where: { id: ctx.currentOrg.id },
        select: { slackBotToken: true },
      });

      if (!organization?.slackBotToken) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Slack連携が設定されていません",
        });
      }

      // Bot Token（prisma-field-encryptionで自動復号化済み）
      try {
        const channels = await listSlackChannels({
          botToken: organization.slackBotToken,
        });
        return channels;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? `Slackチャンネル一覧の取得に失敗しました: ${error.message}`
              : "Slackチャンネル一覧の取得に失敗しました",
        });
      }
    }),
});
