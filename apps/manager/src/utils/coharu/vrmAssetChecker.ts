/**
 * VRM アセット存在確認ユーティリティ
 * VRM/VRMA ファイルの存在確認を行う
 */

// VRM/VRMAファイルのパス定義
export const VRM_PATH = "/coharu/vrm/coharu.vrm";

export const VRMA_PATHS = [
  "/coharu/vrma/VRMA_01.vrma",
  "/coharu/vrma/VRMA_02.vrma",
  "/coharu/vrma/VRMA_03.vrma",
  "/coharu/vrma/VRMA_04.vrma",
  "/coharu/vrma/VRMA_05.vrma",
  "/coharu/vrma/VRMA_06.vrma",
  "/coharu/vrma/VRMA_07.vrma",
] as const;

/**
 * ファイルの存在を確認する
 * HEADリクエストを使用して効率的に確認
 */
export const checkFileExists = async (path: string): Promise<boolean> => {
  try {
    const response = await fetch(path, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * VRMファイルの存在を確認
 */
export const checkVrmExists = async (): Promise<boolean> => {
  return checkFileExists(VRM_PATH);
};

/**
 * 利用可能なVRMAファイルのパスを取得
 */
export const getAvailableVrmaPaths = async (): Promise<string[]> => {
  const results = await Promise.all(
    VRMA_PATHS.map(async (path): Promise<string | null> => {
      const exists = await checkFileExists(path);
      return exists ? path : null;
    }),
  );
  return results.filter((path): path is string => path !== null);
};

/**
 * VRMアセットの状態を取得
 */
export type VrmAssetStatus = {
  vrmExists: boolean;
  availableVrmaPaths: string[];
  hasAnimations: boolean;
};

export const checkVrmAssetStatus = async (): Promise<VrmAssetStatus> => {
  const [vrmExists, availableVrmaPaths] = await Promise.all([
    checkVrmExists(),
    getAvailableVrmaPaths(),
  ]);

  return {
    vrmExists,
    availableVrmaPaths,
    hasAnimations: availableVrmaPaths.length > 0,
  };
};
