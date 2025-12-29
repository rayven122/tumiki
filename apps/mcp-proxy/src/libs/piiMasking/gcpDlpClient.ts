/**
 * GCP DLP APIクライアント
 * テキストのPII検出・マスキングを行う
 */

import { DlpServiceClient } from "@google-cloud/dlp";
import { GoogleAuth } from "google-auth-library";

import { logError, logWarn } from "../logger/index.js";

import {
  DEFAULT_INFO_TYPES,
  type DetectedPii,
  type JsonMaskingResult,
  type PiiMaskingOptions,
  type TextMaskingResult,
} from "./types.js";

// DLPクライアントのシングルトンインスタンス
let dlpClient: DlpServiceClient | null = null;

// プロジェクトIDのキャッシュ（遅延初期化）
let cachedProjectId: string | null = null;
let projectIdInitialized = false;

/**
 * DLPクライアントを取得
 * 遅延初期化でシングルトンを返す
 */
const getDlpClient = (): DlpServiceClient => {
  dlpClient ??= new DlpServiceClient();
  return dlpClient;
};

/**
 * GCP プロジェクトIDを取得（遅延初期化）
 * GOOGLE_APPLICATION_CREDENTIALS から自動検出
 */
const getProjectId = async (): Promise<string | null> => {
  if (projectIdInitialized) {
    return cachedProjectId;
  }

  try {
    const auth = new GoogleAuth();
    cachedProjectId = await auth.getProjectId();
    projectIdInitialized = true;
    return cachedProjectId;
  } catch (error) {
    logWarn(
      "GCPプロジェクトIDの取得に失敗しました。PIIマスキングは利用できません。",
      { error: error instanceof Error ? error.message : String(error) },
    );
    projectIdInitialized = true;
    cachedProjectId = null;
    return null;
  }
};

/**
 * テキストをGCP DLPでマスキング
 * @param text マスキング対象のテキスト
 * @param options マスキングオプション（使用するInfoType一覧）
 * @returns マスキング結果（テキスト）
 */
export const maskText = async (
  text: string,
  options?: PiiMaskingOptions,
): Promise<TextMaskingResult> => {
  const startTime = Date.now();

  // 空文字列の場合はそのまま返す
  if (!text) {
    return {
      maskedText: text,
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  const projectId = await getProjectId();
  if (!projectId) {
    return {
      maskedText: text,
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    const client = getDlpClient();
    const parent = `projects/${projectId}/locations/global`;

    // InfoTypeの設定（オプションで指定されていれば使用、なければデフォルト全て）
    const infoTypeNames =
      options?.infoTypes && options.infoTypes.length > 0
        ? options.infoTypes
        : DEFAULT_INFO_TYPES;
    const infoTypes = infoTypeNames.map((name: string) => ({ name }));

    // 非識別化リクエスト
    // replaceWithInfoTypeConfig で自動的に [INFO_TYPE] 形式に置換
    const [response] = await client.deidentifyContent({
      parent,
      deidentifyConfig: {
        infoTypeTransformations: {
          transformations: [
            {
              infoTypes,
              primitiveTransformation: {
                replaceWithInfoTypeConfig: {},
              },
            },
          ],
        },
      },
      inspectConfig: {
        infoTypes,
        minLikelihood: "LIKELY",
      },
      item: {
        value: text,
      },
    });

    const maskedText = response.item?.value ?? text;

    // transformationSummariesからdetectedPiiListを抽出
    // 各InfoTypeの検出件数をリストに変換
    const detectedPiiList: DetectedPii[] =
      response.overview?.transformationSummaries?.map((summary) => ({
        infoType: summary.infoType?.name ?? "UNKNOWN",
        count: Number(summary.results?.[0]?.count ?? 0),
      })) ?? [];

    // 検出件数の合計を計算
    const detectedCount = detectedPiiList.reduce(
      (sum, pii) => sum + pii.count,
      0,
    );

    return {
      maskedText,
      detectedCount,
      detectedPiiList,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logError(
      "GCP DLPでのマスキングに失敗しました",
      error instanceof Error ? error : new Error(String(error)),
    );

    // エラー時は元のテキストをそのまま返す（フェイルオープン）
    return {
      maskedText: text,
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: Date.now() - startTime,
    };
  }
};

/**
 * JSONデータをGCP DLPでマスキング
 *
 * JSON構造を維持しながら、文字列値に含まれるPIIをマスキングする。
 * DLPはJSON構造を維持するため、オブジェクトをそのまま渡して結果を受け取れる。
 *
 * @param data マスキング対象のJSONデータ
 * @param options マスキングオプション（使用するInfoType一覧）
 * @returns マスキング結果（元の型を維持）
 */
export const maskJson = async <T>(
  data: T,
  options?: PiiMaskingOptions,
): Promise<JsonMaskingResult<T>> => {
  const startTime = Date.now();

  // null/undefinedの場合はそのまま返す
  if (data === null || data === undefined) {
    return {
      maskedData: data,
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  // JSONにシリアライズしてマスキング
  const jsonText = JSON.stringify(data);
  const result = await maskText(jsonText, options);

  // マスキング結果をパースして返す
  try {
    const maskedData = JSON.parse(result.maskedText) as T;
    return {
      maskedData,
      detectedCount: result.detectedCount,
      detectedPiiList: result.detectedPiiList,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    // パースに失敗した場合は元のデータを返す（フェイルオープン）

    logError("マスキング結果のJSONパースに失敗しました", error as Error, {
      originalDataType: typeof data,
      originalTextLength: jsonText.length,
      maskedTextLength: result.maskedText.length,
      detectedCount: result.detectedCount,
      detectedPiiList: result.detectedPiiList,
    });
    return {
      maskedData: data,
      detectedCount: 0,
      detectedPiiList: [],
      processingTimeMs: Date.now() - startTime,
    };
  }
};

/**
 * DLPクライアントを閉じる（アプリケーション終了時用）
 */
export const closeDlpClient = async (): Promise<void> => {
  if (dlpClient) {
    await dlpClient.close();
    dlpClient = null;
  }
};

/**
 * プロジェクトIDキャッシュをリセット（テスト用）
 */
export const resetProjectIdCache = (): void => {
  cachedProjectId = null;
  projectIdInitialized = false;
};
