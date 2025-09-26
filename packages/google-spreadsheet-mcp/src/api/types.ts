// Branded Types
export type SpreadsheetId = string & { readonly __brand: "SpreadsheetId" };
export type SheetId = number & { readonly __brand: "SheetId" };
export type Range = string & { readonly __brand: "Range" };
export type Email = string & { readonly __brand: "Email" };

// Authentication Types
export type AuthConfig =
  | {
      type: "service-account";
      credentials: ServiceAccountCredentials;
    }
  | {
      type: "oauth2";
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    }
  | {
      type: "api-key";
      apiKey: string;
    }
  | {
      type: "adc"; // Application Default Credentials
    };

export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

// Spreadsheet Types
export interface Spreadsheet {
  spreadsheetId: SpreadsheetId;
  title: string;
  locale?: string;
  timeZone?: string;
  sheets: Sheet[];
  createdTime?: string;
  modifiedTime?: string;
  url: string;
}

export interface Sheet {
  sheetId: SheetId;
  title: string;
  index: number;
  rowCount: number;
  columnCount: number;
  frozen?: {
    rows?: number;
    columns?: number;
  };
}

// Cell and Range Types
export type CellValue = string | number | boolean | null;
export interface CellData {
  value: CellValue;
  formula?: string;
  note?: string;
  hyperlink?: string;
}

export interface RangeData {
  range: Range;
  values: CellValue[][];
}

export interface BatchUpdateRequest {
  spreadsheetId: SpreadsheetId;
  ranges: {
    range: Range;
    values: CellValue[][];
  }[];
}

// Sharing Types
export interface Permission {
  type: "user" | "group" | "domain" | "anyone";
  role: "owner" | "writer" | "reader" | "commenter";
  email?: Email;
  domain?: string;
}

export interface ShareRequest {
  spreadsheetId: SpreadsheetId;
  permission: Permission;
  sendNotificationEmails?: boolean;
}

// Response Types
export interface CreateSpreadsheetResponse {
  spreadsheetId: SpreadsheetId;
  spreadsheetUrl: string;
}

export interface UpdateResponse {
  updatedCells: number;
  updatedRows: number;
  updatedColumns: number;
  updatedRange: Range;
}

export interface BatchUpdateResponse {
  totalUpdatedCells: number;
  responses: UpdateResponse[];
}

// Filter and Sort Types
export type SortOrder = "ASCENDING" | "DESCENDING";

export interface FilterCriteria {
  columnIndex: number;
  condition: {
    type:
      | "TEXT_CONTAINS"
      | "TEXT_EQUALS"
      | "TEXT_STARTS_WITH"
      | "TEXT_ENDS_WITH"
      | "NUMBER_GREATER_THAN"
      | "NUMBER_LESS_THAN"
      | "NUMBER_EQUALS"
      | "DATE_BEFORE"
      | "DATE_AFTER"
      | "DATE_EQUALS";
    value: CellValue;
  };
}

// Format Types
export interface CellFormat {
  backgroundColor?: Color;
  textFormat?: TextFormat;
  horizontalAlignment?: "LEFT" | "CENTER" | "RIGHT";
  verticalAlignment?: "TOP" | "MIDDLE" | "BOTTOM";
  wrapStrategy?: "OVERFLOW_CELL" | "WRAP" | "CLIP";
}

export interface Color {
  red: number; // 0-1
  green: number; // 0-1
  blue: number; // 0-1
  alpha?: number; // 0-1
}

export interface TextFormat {
  foregroundColor?: Color;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
}
