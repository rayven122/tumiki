import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// データサイズの上限設定（100MB）
const MAX_DATA_SIZE = 100 * 1024 * 1024;

/**
 * undefinedデータのバリデーション
 */
const validateDataNotUndefined = <T>(data: T): void => {
  if (data === undefined) {
    throw new Error("Cannot process undefined data");
  }
};

/**
 * データをJSON文字列に変換しBufferを作成
 */
const dataToBuffer = <T>(data: T): { buffer: Buffer; size: number } => {
  validateDataNotUndefined(data);
  const jsonString = JSON.stringify(data);
  const buffer = Buffer.from(jsonString, "utf8");
  return { buffer, size: buffer.length };
};

/**
 * プロトタイプ汚染攻撃を防ぐ安全なJSONパーサー
 * @param jsonString JSONテキスト
 * @returns パースされたオブジェクト
 */
export const parseJsonSafely = (jsonString: string): unknown => {
  return JSON.parse(jsonString, (key: string, value: unknown) => {
    // __proto__やconstructor.prototypeなどの危険なキーを除外
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return undefined;
    }
    return value;
  });
};

/**
 * データを圧縮する（一律圧縮）
 */
export const compressData = async <T>(
  data: T,
): Promise<{
  compressedData: Buffer;
  originalSize: number;
  compressionRatio: number;
}> => {
  const { buffer: originalBuffer, size: originalSize } = dataToBuffer(data);

  // データサイズの検証
  if (originalSize > MAX_DATA_SIZE) {
    throw new Error(`Data size exceeds maximum limit of 100MB`);
  }

  // gzip圧縮のみ
  const compressedBuffer = await gzipAsync(originalBuffer);
  const compressionRatio = compressedBuffer.length / originalSize;

  return {
    compressedData: compressedBuffer,
    originalSize,
    compressionRatio,
  };
};

/**
 * 圧縮されたデータを展開する
 * @param compressedData gzip圧縮されたBuffer
 * @returns 展開されたデータ（型安全性のため明示的な型指定を推奨）
 */
export const decompressData = async <T>(compressedData: Buffer): Promise<T> => {
  // 入力バリデーション
  if (!Buffer.isBuffer(compressedData)) {
    const actualType = Array.isArray(compressedData)
      ? "array"
      : typeof compressedData;
    throw new Error(
      `Invalid compressed data: expected Buffer, got ${actualType}`,
    );
  }

  if (compressedData.length === 0) {
    throw new Error("Invalid compressed data: buffer is empty");
  }

  // gzip展開のみ
  const decompressedBuffer = await gunzipAsync(compressedData);
  const jsonString = decompressedBuffer.toString("utf8");

  // JSONデータの基本的な形式検証
  if (
    !jsonString.trim().startsWith("{") &&
    !jsonString.trim().startsWith("[")
  ) {
    throw new Error("Invalid JSON format: expected object or array");
  }

  // プロトタイプ汚染対策のためのJSON.parseとreviver使用
  const parsedData: unknown = parseJsonSafely(jsonString);

  return parsedData as T;
};

/**
 * リクエスト/レスポンスデータを一括で圧縮
 * 両方のデータを並列で圧縮し、全体の圧縮効率を測定する
 *
 * @param requestData MCPリクエストデータ
 * @param responseData MCPレスポンスデータ
 * @returns 圧縮結果と全体の圧縮率（ストレージ効率測定用）
 */
export const compressRequestResponseData = async <TRequest, TResponse>(
  requestData: TRequest,
  responseData: TResponse,
): Promise<{
  inputDataCompressed: Buffer;
  outputDataCompressed: Buffer;
  originalInputSize: number;
  originalOutputSize: number;
  compressionRatio: number;
}> => {
  const [inputResult, outputResult] = await Promise.all([
    compressData(requestData),
    compressData(responseData),
  ]);

  // 全体の圧縮率を計算（ストレージ効率監視用の重要メトリクス）
  // 入力と出力を合算した実際の圧縮効果を測定
  const totalOriginalSize =
    inputResult.originalSize + outputResult.originalSize;
  const totalCompressedSize =
    inputResult.compressedData.length + outputResult.compressedData.length;
  const overallCompressionRatio =
    totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 1.0;

  return {
    inputDataCompressed: inputResult.compressedData,
    outputDataCompressed: outputResult.compressedData,
    originalInputSize: inputResult.originalSize,
    originalOutputSize: outputResult.originalSize,
    compressionRatio: overallCompressionRatio,
  };
};

/**
 * データサイズを計算する（バイト数）
 */
export const calculateDataSize = <T>(data: T): number => {
  const { size } = dataToBuffer(data);
  return size;
};
