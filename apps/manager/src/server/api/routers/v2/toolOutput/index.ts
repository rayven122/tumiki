/**
 * ツール出力ルーター
 *
 * BigQueryからツール出力を取得するAPIを提供。
 * チャットメッセージのoutputRef参照を解決するために使用。
 */

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  getToolOutput,
  getToolOutputInputSchema,
  getToolOutputOutputSchema,
} from "./getToolOutput";

export const toolOutputRouter = createTRPCRouter({
  /**
   * ツール出力を取得
   *
   * BigQueryからtoolCallIdを使用してツール出力を取得する。
   * 組織IDでフィルタリングされるため、他組織のデータにはアクセスできない。
   */
  get: protectedProcedure
    .input(getToolOutputInputSchema)
    .output(getToolOutputOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getToolOutput(input, ctx.currentOrg.id);
    }),
});
