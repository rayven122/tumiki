/**
 * Google Calendar MCP ツール名定義
 * 全てのツール名は ACTION_RESOURCE 形式に従う
 */

// アクションとリソースの型定義
type Action = "GET" | "LIST" | "CREATE" | "UPDATE" | "DELETE" | "SEARCH";
type Resource = string; // calendars, calendar, events, event, etc.
type ToolName = `${Lowercase<Action>}_${Lowercase<Resource>}`;

// ツール名定義（as const で不変にし、satisfies で型制約を設ける）
export const GOOGLE_CALENDAR_TOOL_NAMES = {
  // Calendar tools (Resourceを複数形にするため、LISTは定義しない)
  LIST_CALENDARS: "list_calendars", // カレンダー一覧取得
  GET_CALENDAR: "get_calendar", // 単一カレンダー取得

  // Event tools (Resourceを複数形にする)
  LIST_EVENTS: "list_events", // イベント一覧取得
  GET_EVENT: "get_event", // 単一イベント取得
  CREATE_EVENT: "create_event", // イベント作成
  UPDATE_EVENT: "update_event", // イベント更新
  DELETE_EVENT: "delete_event", // イベント削除
  SEARCH_EVENTS: "search_events", // イベント検索

  // FreeBusy tools
  GET_FREEBUSY: "get_freebusy", // 空き時間情報取得

  // Colors tools
  GET_COLORS: "get_colors", // 色情報取得
} as const satisfies Record<string, ToolName>;

// ツールカテゴリ定義
export const TOOL_CATEGORIES = {
  CALENDAR: "calendar",
  EVENT: "event",
  FREEBUSY: "freebusy",
  COLORS: "colors",
} as const;
