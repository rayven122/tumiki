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
 */
export const decompressData = async <T = unknown>(
  compressedData: Buffer,
): Promise<T> => {
  try {
    if (!Buffer.isBuffer(compressedData)) {
      throw new Error("Invalid input: expected Buffer");
    }

    const decompressedBuffer = await gunzipAsync(compressedData);
    const jsonString = decompressedBuffer.toString("utf8");

    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Data decompression failed: ${error.message}`);
    }
    throw new Error("Data decompression failed: Unknown error");
  }
};

/**
 * リクエスト/レスポンスデータを一括で圧縮
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

  // 全体の圧縮率を計算（入力と出力の加重平均）
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
