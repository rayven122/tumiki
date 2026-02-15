import * as pako from "pako";

// データサイズ制限（50MB）
const MAX_DECOMPRESSED_SIZE = 50 * 1024 * 1024;

type DecompressionError =
  | "INVALID_INPUT"
  | "EMPTY_BUFFER"
  | "DECOMPRESSION_FAILED"
  | "SIZE_LIMIT_EXCEEDED"
  | "INVALID_JSON"
  | "PARSE_FAILED";

/**
 * gzip圧縮されたBase64データをクライアント側で解凍する
 * Node.js zlib.gzipで圧縮されたデータを pako.ungzip で解凍
 */
export const decompressGzipData = async (
  base64CompressedData: string,
): Promise<
  | { success: true; data: unknown }
  | {
      success: false;
      error: DecompressionError;
      message: string;
      debugInfo?: unknown;
    }
> => {
  try {
    // 入力バリデーション
    if (!base64CompressedData || typeof base64CompressedData !== "string") {
      return {
        success: false,
        error: "INVALID_INPUT",
        message: "Invalid input: expected non-empty string",
      };
    }

    // Base64デコード
    const binaryString = atob(base64CompressedData);
    if (binaryString.length === 0) {
      return {
        success: false,
        error: "EMPTY_BUFFER",
        message: "Empty buffer after Base64 decode",
      };
    }

    // バイナリ文字列をUint8Arrayに変換
    const compressedData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      compressedData[i] = binaryString.charCodeAt(i);
    }

    // gzip解凍（Node.js zlibとの互換性のためungzipを使用）
    let decompressedData: Uint8Array;
    try {
      decompressedData = pako.ungzip(compressedData);
    } catch (pakoError) {
      // ungzipで失敗した場合はinflateも試す（フォールバック）
      try {
        decompressedData = pako.inflate(compressedData);
      } catch (secondError) {
        return {
          success: false,
          error: "DECOMPRESSION_FAILED",
          message: `Decompression failed with both ungzip and inflate. ungzip error: ${pakoError instanceof Error ? pakoError.message : String(pakoError)}, inflate error: ${secondError instanceof Error ? secondError.message : String(secondError)}`,
        };
      }
    }

    // サイズ制限チェック
    if (decompressedData.length > MAX_DECOMPRESSED_SIZE) {
      return {
        success: false,
        error: "SIZE_LIMIT_EXCEEDED",
        message: `Decompressed data size (${decompressedData.length} bytes) exceeds limit (${MAX_DECOMPRESSED_SIZE} bytes)`,
      };
    }

    // Uint8ArrayからJSON文字列に変換
    const jsonString = new TextDecoder("utf-8").decode(decompressedData);

    // JSON形式チェック（より柔軟に）
    const trimmedJson = jsonString.trim();
    if (
      !trimmedJson.startsWith("{") &&
      !trimmedJson.startsWith("[") &&
      !trimmedJson.startsWith('"') &&
      trimmedJson !== "null" &&
      trimmedJson !== "true" &&
      trimmedJson !== "false" &&
      !/^\d+(\.\d+)?$/.test(trimmedJson)
    ) {
      return {
        success: false,
        error: "INVALID_JSON",
        message: "Invalid JSON format: expected valid JSON value",
        debugInfo: {
          firstChars: trimmedJson.substring(0, 100),
          dataLength: trimmedJson.length,
        },
      };
    }

    // JSONパース（プロトタイプ汚染対策）
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonString, (key: string, value: unknown) => {
        // プロトタイプ汚染対策
        if (
          key === "__proto__" ||
          key === "constructor" ||
          key === "prototype"
        ) {
          return undefined;
        }
        return value;
      });
    } catch (parseError) {
      return {
        success: false,
        error: "PARSE_FAILED",
        message: `JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      };
    }

    return {
      success: true,
      data: parsedData,
    };
  } catch (error) {
    return {
      success: false,
      error: "DECOMPRESSION_FAILED",
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
