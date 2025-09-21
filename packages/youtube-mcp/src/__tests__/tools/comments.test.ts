import type { YouTubeApiService } from "@/services/YoutubeApiService/index.js";
import { YOU_TUBE_TOOL_NAMES } from "@/constants/toolNames.js";
import { commentTools, handleCommentTool } from "@/tools/comments.js";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/services/youtubeApi.js");

describe("commentTools", () => {
  test("コメントツールが正しく定義されている", () => {
    expect(commentTools).toHaveLength(2);
    expect(commentTools[0]?.name).toStrictEqual(
      YOU_TUBE_TOOL_NAMES.GET_COMMENT_THREADS,
    );
    expect(commentTools[1]?.name).toStrictEqual(
      YOU_TUBE_TOOL_NAMES.GET_COMMENT_REPLIES,
    );
  });

  test("GET_COMMENT_THREADSツールのスキーマが正しい", () => {
    const tool = commentTools.find(
      (t) => t.name === YOU_TUBE_TOOL_NAMES.GET_COMMENT_THREADS,
    );
    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toStrictEqual({
      type: "object",
      properties: {
        videoId: {
          type: "string",
          description: "YouTube動画のID",
        },
        maxResults: {
          type: "number",
          description: "最大取得件数（1-100）",
          minimum: 1,
          maximum: 100,
          default: 20,
        },
        pageToken: {
          type: "string",
          description: "ページネーショントークン",
        },
        order: {
          type: "string",
          enum: ["relevance", "time"],
          description: "並び順（relevance: 関連性順, time: 投稿時刻順）",
          default: "relevance",
        },
      },
      required: ["videoId"],
    });
  });

  test("GET_COMMENT_REPLIESツールのスキーマが正しい", () => {
    const tool = commentTools.find(
      (t) => t.name === YOU_TUBE_TOOL_NAMES.GET_COMMENT_REPLIES,
    );
    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toStrictEqual({
      type: "object",
      properties: {
        parentId: {
          type: "string",
          description: "親コメントのID",
        },
        maxResults: {
          type: "number",
          description: "最大取得件数（1-100）",
          minimum: 1,
          maximum: 100,
          default: 20,
        },
        pageToken: {
          type: "string",
          description: "ページネーショントークン",
        },
      },
      required: ["parentId"],
    });
  });
});

describe("handleCommentTool", () => {
  describe("GET_COMMENT_THREADS", () => {
    test("正常系: コメントスレッドを取得できる", async () => {
      const mockApi = {
        getCommentThreads: vi.fn().mockResolvedValue({
          threads: [
            {
              id: "thread1",
              videoId: "test-video",
              topLevelComment: {
                id: "comment1",
                textDisplay: "Test comment",
                authorDisplayName: "Test User",
                likeCount: 10,
              },
              totalReplyCount: 5,
              canReply: true,
              isPublic: true,
            },
          ],
          nextPageToken: "next-token",
        }),
      } as unknown as YouTubeApiService;

      const result = await handleCommentTool(
        YOU_TUBE_TOOL_NAMES.GET_COMMENT_THREADS,
        { videoId: "test-video", maxResults: 10, order: "time" },
        mockApi,
      );

      expect(mockApi.getCommentThreads).toHaveBeenCalledWith(
        "test-video",
        10,
        undefined,
        "time",
      );
      expect(result.content[0]?.type).toStrictEqual("text");
      const textContent = result.content[0] as { type: string; text: string };
      const parsed = JSON.parse(textContent.text) as {
        threads: unknown[];
        nextPageToken: string;
      };
      expect(parsed.threads).toHaveLength(1);
      expect(parsed.nextPageToken).toStrictEqual("next-token");
    });

    test("正常系: ページトークンを使用してコメントスレッドを取得できる", async () => {
      const mockApi = {
        getCommentThreads: vi.fn().mockResolvedValue({
          threads: [],
          nextPageToken: undefined,
        }),
      } as unknown as YouTubeApiService;

      await handleCommentTool(
        YOU_TUBE_TOOL_NAMES.GET_COMMENT_THREADS,
        { videoId: "test-video", pageToken: "page-token" },
        mockApi,
      );

      expect(mockApi.getCommentThreads).toHaveBeenCalledWith(
        "test-video",
        20,
        "page-token",
        "relevance",
      );
    });

    test("異常系: videoIdが不足している場合エラーが発生する", async () => {
      const mockApi = {} as YouTubeApiService;

      await expect(
        handleCommentTool(YOU_TUBE_TOOL_NAMES.GET_COMMENT_THREADS, {}, mockApi),
      ).rejects.toThrow();
    });
  });

  describe("GET_COMMENT_REPLIES", () => {
    test("正常系: 返信コメントを取得できる", async () => {
      const mockApi = {
        getCommentReplies: vi.fn().mockResolvedValue({
          comments: [
            {
              id: "reply1",
              videoId: "test-video",
              textDisplay: "Reply comment",
              authorDisplayName: "Reply User",
              parentId: "parent-comment",
              likeCount: 5,
            },
          ],
          nextPageToken: "next-token",
        }),
      } as unknown as YouTubeApiService;

      const result = await handleCommentTool(
        YOU_TUBE_TOOL_NAMES.GET_COMMENT_REPLIES,
        { parentId: "parent-comment", maxResults: 50 },
        mockApi,
      );

      expect(mockApi.getCommentReplies).toHaveBeenCalledWith(
        "parent-comment",
        50,
        undefined,
      );
      expect(result.content[0]?.type).toStrictEqual("text");
      const textContent = result.content[0] as { type: string; text: string };
      const parsed = JSON.parse(textContent.text) as {
        comments: unknown[];
        nextPageToken: string;
      };
      expect(parsed.comments).toHaveLength(1);
      expect(parsed.nextPageToken).toStrictEqual("next-token");
    });

    test("異常系: parentIdが不足している場合エラーが発生する", async () => {
      const mockApi = {} as YouTubeApiService;

      await expect(
        handleCommentTool(YOU_TUBE_TOOL_NAMES.GET_COMMENT_REPLIES, {}, mockApi),
      ).rejects.toThrow();
    });
  });

  describe("未知のツール", () => {
    test("異常系: 未知のツール名でエラーが発生する", async () => {
      const mockApi = {} as YouTubeApiService;

      await expect(
        handleCommentTool("unknown-tool", {}, mockApi),
      ).rejects.toThrow("Unknown comment tool: unknown-tool");
    });
  });
});
