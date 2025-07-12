import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// データサイズの上限設定（100MB）
const MAX_DATA_SIZE = 100 * 1024 * 1024;

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
  try {
    const jsonString = JSON.stringify(data);
    const originalBuffer = Buffer.from(jsonString, "utf8");
    const originalSize = originalBuffer.length;

    // データサイズの検証
    if (originalSize > MAX_DATA_SIZE) {
      throw new Error(
        `Data size (${originalSize} bytes) exceeds maximum limit (${MAX_DATA_SIZE} bytes)`,
      );
    }

    const compressedBuffer = await gzipAsync(originalBuffer);
    const compressionRatio = compressedBuffer.length / originalSize;

    return {
      compressedData: compressedBuffer,
      originalSize,
      compressionRatio,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Data compression failed: ${error.message}`);
    }
    throw new Error("Data compression failed: Unknown error");
  }
};

/**
 * 圧縮されたデータを展開する
 * @param compressedData 圧縮されたBuffer
 * @returns 展開されたデータ（型安全性のため明示的な型指定を推奨）
 */
export const decompressData = async <T>(compressedData: Buffer): Promise<T> => {
  try {
    if (!Buffer.isBuffer(compressedData)) {
      throw new Error("Invalid input: expected Buffer");
    }

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
    const parsedData: unknown = JSON.parse(
      jsonString,
      (key: string, value: unknown) => {
        // __proto__やconstructor.prototypeなどの危険なキーを除外
        if (
          key === "__proto__" ||
          key === "constructor" ||
          key === "prototype"
        ) {
          return undefined;
        }
        return value;
      },
    );

    return parsedData as T;
  } catch (error) {
    if (error instanceof Error) {
      // より具体的なエラーメッセージを提供
      if (error.message.includes("incorrect header check")) {
        throw new Error("Data decompression failed: Invalid gzip format");
      }
      if (error.message.includes("Unexpected token")) {
        throw new Error("Data decompression failed: Malformed JSON data");
      }
      if (error.message.includes("Invalid JSON format")) {
        throw new Error(`Data decompression failed: ${error.message}`);
      }
      throw new Error(`Data decompression failed: ${error.message}`);
    }
    throw new Error("Data decompression failed: Unknown error");
  }
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
  try {
    const jsonString = JSON.stringify(data);
    return Buffer.byteLength(jsonString, "utf8");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to calculate data size: ${error.message}`);
    }
    throw new Error("Failed to calculate data size: Unknown error");
  }
};
