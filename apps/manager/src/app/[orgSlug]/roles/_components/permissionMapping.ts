/**
 * 権限マッピングユーティリティ
 *
 * DB形式(read/write/execute)とUI形式(access/manage)の変換を一元管理
 * - access = read AND execute（両方が有効な場合のみアクセス権限あり）
 * - manage = write
 */

/**
 * DB形式の権限をUI形式に変換
 *
 * @param read - DB上のread権限
 * @param execute - DB上のexecute権限
 * @returns UI上のaccess権限（両方trueの場合のみtrue）
 */
export const mapDbToUiAccess = (read: boolean, execute: boolean): boolean => {
  // 新規作成時は常にread=executeで設定されるため、
  // 表示時も両方がtrueの場合のみアクセス権限ありとする
  return read && execute;
};

/**
 * UI形式の権限をDB形式に変換
 *
 * @param access - UI上のaccess権限
 * @returns DB上のread/execute権限（同じ値）
 */
export const mapUiToDbAccess = (
  access: boolean,
): { read: boolean; execute: boolean } => {
  return { read: access, execute: access };
};

/**
 * DB形式のMCP権限配列をUI形式に変換
 */
export const mapDbPermissionsToUi = <
  T extends { read: boolean; write: boolean; execute: boolean },
>(
  permissions: T[],
): Array<{ mcpServerId: string; access: boolean; manage: boolean }> => {
  return permissions.map((p) => ({
    mcpServerId: (p as T & { mcpServerId: string }).mcpServerId,
    access: mapDbToUiAccess(p.read, p.execute),
    manage: p.write,
  }));
};

/**
 * UI形式のMCP権限をDB形式に変換
 */
export const mapUiPermissionToDb = (permission: {
  mcpServerId: string;
  access: boolean;
  manage: boolean;
}): {
  mcpServerId: string;
  read: boolean;
  write: boolean;
  execute: boolean;
} => {
  const { read, execute } = mapUiToDbAccess(permission.access);
  return {
    mcpServerId: permission.mcpServerId,
    read,
    write: permission.manage,
    execute,
  };
};
