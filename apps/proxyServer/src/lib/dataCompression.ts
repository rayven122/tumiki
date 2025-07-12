import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * データを圧縮する（一律圧縮）
 */
export const compressData = async (
  data: unknown,
): Promise<{
  compressedData: Buffer;
  originalSize: number;
  compressionRatio: number;
}> => {
  const jsonString = JSON.stringify(data);
  const originalBuffer = Buffer.from(jsonString, "utf8");
  const originalSize = originalBuffer.length;

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
 */
export const decompressData = async (
  compressedData: Buffer,
): Promise<unknown> => {
  const decompressedBuffer = await gunzipAsync(compressedData);
  const jsonString = decompressedBuffer.toString("utf8");
  return JSON.parse(jsonString);
};

/**
 * リクエスト/レスポンスデータを一括で圧縮
 */
export const compressRequestResponseData = async (
  requestData: unknown,
  responseData: unknown,
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
export const calculateDataSize = (data: unknown): number => {
  const jsonString = JSON.stringify(data);
  return Buffer.byteLength(jsonString, "utf8");
};
