import { writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import type { TransportType } from "@tumiki/db";

/**
 * URLからAPIキーをマスクする
 */
export const maskApiKey = (url: string | null): string => {
  if (!url) return "N/A";

  // URLパラメータのapi-keyをマスク
  const maskedUrl = url.replace(
    /(\?|&)(api[-_]?key)=([^&]+)/gi,
    (_match: string, separator: string, keyName: string, value: string) => {
      if (value.length <= 10) {
        return `${separator}${keyName}=****`;
      }
      const prefix = value.substring(0, 8);
      const suffix = value.substring(value.length - 4);
      return `${separator}${keyName}=${prefix}...${suffix}`;
    },
  );

  // パスに含まれるトークン風の文字列もマスク（40文字以上の英数字）
  return maskedUrl.replace(
    /\/([a-zA-Z0-9_-]{40,})/g,
    (_match: string, token: string) => {
      const prefix = token.substring(0, 8);
      const suffix = token.substring(token.length - 4);
      return `/${prefix}...${suffix}`;
    },
  );
};

/**
 * 一時的な設定ファイルを作成
 */
export const createTempConfigFile = async (
  serverName: string,
  transportType: TransportType,
  url: string,
  envVars: Record<string, string>,
): Promise<string> => {
  const tempDir = os.tmpdir();
  const configFile = path.join(tempDir, `mcp-config-${uuidv4()}.json`);

  const config = {
    mcpServers: {
      [serverName]: {
        type: transportType === "SSE" ? "sse" : "http",
        url,
        env: envVars,
      },
    },
  };

  await writeFile(configFile, JSON.stringify(config, null, 2));
  return configFile;
};
