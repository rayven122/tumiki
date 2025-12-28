/**
 * GCP DLP APIクライアント
 * テキストのPII検出・マスキングを行う
 */

import { DlpServiceClient } from "@google-cloud/dlp";
import { GoogleAuth } from "google-auth-library";

import { logError, logWarn } from "../logger/index.js";

import {
  DEFAULT_INFO_TYPES,
  type JsonMaskingResult,
  type MaskingResult,
  type PiiMaskingConfig,
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
 * PIIマスキング設定を取得
 * GCP認証情報からプロジェクトIDを自動検出
 */
export const getPiiMaskingConfig = async (): Promise<PiiMaskingConfig> => {
  const projectId = await getProjectId();

  return {
    projectId: projectId ?? "",
    isAvailable: projectId !== null,
  };
};

/**
 * テキストをGCP DLPでマスキング
 * @param text マスキング対象のテキスト
 * @param config PIIマスキング設定
 * @returns マスキング結果
 */
export const maskText = async (
  text: string,
  config: PiiMaskingConfig,
): Promise<MaskingResult> => {
  const startTime = Date.now();

  // 空文字列や設定が無効な場合はそのまま返す
  if (!text || !config.isAvailable || !config.projectId) {
    return {
      maskedText: text,
      detectedCount: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    const client = getDlpClient();
    const parent = `projects/${config.projectId}/locations/global`;

    // InfoTypeの設定
    const infoTypes = DEFAULT_INFO_TYPES.map((name: string) => ({ name }));

    // 非識別化リクエスト
    // replaceWithInfoTypeConfig を使用して [EMAIL_ADDRESS] のような形式で置換
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
    const detectedCount =
      response.overview?.transformationSummaries?.length ?? 0;

    return {
      maskedText,
      detectedCount,
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
 * @param config PIIマスキング設定
 * @returns マスキング結果（元の型を維持）
 */
export const maskJson = async <T>(
  data: T,
  config: PiiMaskingConfig,
): Promise<JsonMaskingResult<T>> => {
  const startTime = Date.now();

  // null/undefinedの場合はそのまま返す
  if (data === null || data === undefined) {
    return {
      maskedData: data,
      detectedCount: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // 設定が無効な場合はそのまま返す
  if (!config.isAvailable || !config.projectId) {
    return {
      maskedData: data,
      detectedCount: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // JSONにシリアライズしてマスキング
  const jsonText = JSON.stringify(data);
  const result = await maskText(jsonText, config);

  // マスキング結果をパースして返す
  try {
    const maskedData = JSON.parse(result.maskedText) as T;
    return {
      maskedData,
      detectedCount: result.detectedCount,
      processingTimeMs: Date.now() - startTime,
    };
  } catch {
    // パースに失敗した場合は元のデータを返す（フェイルオープン）
    logError(
      "マスキング結果のJSONパースに失敗しました",
      new Error("JSON parse failed after masking"),
    );
    return {
      maskedData: data,
      detectedCount: 0,
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
