import { AsyncLocalStorage } from "node:async_hooks";

/**
 * テナントコンテキストの型定義
 */
export type TenantContext = {
  /** 現在のテナント（組織）ID */
  organizationId: string | null;
  /** RLSをバイパスするかどうか */
  bypassRLS?: boolean;
  /** デバッグモード（クエリログを出力） */
  debug?: boolean;
  /** ユーザーID（監査ログ用） */
  userId?: string;
  /** リクエストID（トレーサビリティ用） */
  requestId?: string;
};

/**
 * AsyncLocalStorageを使用してリクエストごとのテナントコンテキストを管理
 */
const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * 現在のテナントコンテキストを取得
 *
 * @returns 現在のテナントコンテキスト、または undefined
 */
export const getTenantContext = (): TenantContext | undefined => {
  return tenantStorage.getStore();
};

/**
 * テナントコンテキストを設定して処理を実行
 *
 * @param context テナントコンテキスト
 * @param fn 実行する処理
 * @returns 処理の結果
 *
 * @example
 * ```typescript
 * // 通常の使用
 * const result = await runWithTenant(
 *   { organizationId: "org_123", userId: "user_456" },
 *   async () => {
 *     // この中でのDB操作は自動的にorg_123でフィルタリングされる
 *     return await db.userMcpServerConfig.findMany();
 *   }
 * );
 * ```
 */
export const runWithTenant = async <T>(
  context: TenantContext,
  fn: () => Promise<T>,
): Promise<T> => {
  return tenantStorage.run(context, fn);
};

/**
 * RLSをバイパスして処理を実行
 *
 * 組織切り替えUIや管理者機能など、複数組織のデータにアクセスする必要がある場合に使用
 *
 * @param fn 実行する処理
 * @returns 処理の結果
 *
 * @example
 * ```typescript
 * // ユーザーが所属する全組織を取得
 * const organizations = await runWithoutRLS(async () => {
 *   return await db.organizationMember.findMany({
 *     where: { userId: currentUserId }
 *   });
 * });
 * ```
 */
export const runWithoutRLS = async <T>(fn: () => Promise<T>): Promise<T> => {
  const currentContext = getTenantContext();

  // 既存のコンテキストがある場合は、bypassRLSフラグを立てて実行
  if (currentContext) {
    return tenantStorage.run({ ...currentContext, bypassRLS: true }, fn);
  }

  // コンテキストがない場合は、bypassRLSのみのコンテキストで実行
  return tenantStorage.run({ organizationId: null, bypassRLS: true }, fn);
};

/**
 * 組織を切り替えて処理を実行（権限チェック付き）
 *
 * 一時的に別の組織のコンテキストで処理を実行する場合に使用
 * 権限チェックのコールバック関数を必須で提供する必要があります
 *
 * @param organizationId 切り替え先の組織ID
 * @param fn 実行する処理
 * @param options オプション設定
 * @param options.checkPermission 権限チェック用の関数（必須）
 * @param options.skipPermissionCheck 権限チェックをスキップするかどうか（デフォルト: false）
 * @returns 処理の結果
 *
 * @example
 * ```typescript
 * // 権限チェック付きで別組織のデータを参照
 * const otherOrgData = await switchOrganization(
 *   "org_789",
 *   async () => {
 *     return await db.userMcpServerConfig.findMany();
 *   },
 *   {
 *     checkPermission: async (orgId, userId) => {
 *       const member = await db.organizationMember.findUnique({
 *         where: {
 *           organizationId_userId: {
 *             organizationId: orgId,
 *             userId: userId,
 *           },
 *         },
 *       });
 *       return member !== null;
 *     }
 *   }
 * );
 * ```
 */
export const switchOrganization = async <T>(
  organizationId: string,
  fn: () => Promise<T>,
  options?: {
    checkPermission?: (
      organizationId: string,
      userId: string,
    ) => Promise<boolean>;
    skipPermissionCheck?: boolean;
  },
): Promise<T> => {
  const currentContext = getTenantContext();

  // 権限チェックを実行（スキップフラグが立っていない場合）
  if (!options?.skipPermissionCheck) {
    // checkPermission関数が提供されていない場合はエラー
    if (!options?.checkPermission) {
      throw new Error(
        "Permission check function is required when switching organizations. " +
          "Either provide checkPermission callback or explicitly set skipPermissionCheck to true.",
      );
    }

    // userIdが設定されていない場合はエラー
    if (!currentContext?.userId) {
      throw new Error(
        "User ID is required in context for organization switching. " +
          "Please ensure the context includes userId before switching organizations.",
      );
    }

    // 権限チェックを実行
    const hasPermission = await options.checkPermission(
      organizationId,
      currentContext.userId,
    );

    if (!hasPermission) {
      throw new Error(
        `User ${currentContext.userId} does not have permission to access organization ${organizationId}`,
      );
    }
  }

  // 新しいコンテキストで実行（既存の userId などは保持）
  return tenantStorage.run(
    {
      ...currentContext,
      organizationId,
      bypassRLS: false,
    },
    fn,
  );
};

/**
 * デバッグモードで処理を実行
 *
 * クエリログを出力しながら処理を実行する場合に使用
 *
 * @param fn 実行する処理
 * @returns 処理の結果
 */
export const runWithDebug = async <T>(fn: () => Promise<T>): Promise<T> => {
  const currentContext = getTenantContext();

  return tenantStorage.run(
    {
      ...currentContext,
      organizationId: currentContext?.organizationId || null,
      debug: true,
    },
    fn,
  );
};

/**
 * コンテキスト情報を更新
 *
 * @param updates 更新する内容
 * @param fn 実行する処理
 * @returns 処理の結果
 */
export const updateContext = async <T>(
  updates: Partial<TenantContext>,
  fn: () => Promise<T>,
): Promise<T> => {
  const currentContext = getTenantContext();

  return tenantStorage.run(
    {
      ...currentContext,
      ...updates,
      organizationId:
        updates.organizationId ?? currentContext?.organizationId ?? null,
    },
    fn,
  );
};

/**
 * テナントコンテキストの検証
 *
 * @param required 必須フィールドのリスト
 * @throws コンテキストが不正な場合
 */
export const validateContext = (
  required: Array<keyof TenantContext> = ["organizationId"],
): void => {
  const context = getTenantContext();

  if (!context) {
    throw new Error("Tenant context is not initialized");
  }

  for (const field of required) {
    if (context[field] === null || context[field] === undefined) {
      throw new Error(`Tenant context is missing required field: ${field}`);
    }
  }
};

/**
 * 現在のコンテキストが特定の組織かチェック
 *
 * @param organizationId チェックする組織ID
 * @returns 一致する場合 true
 */
export const isCurrentOrganization = (organizationId: string): boolean => {
  const context = getTenantContext();
  return context?.organizationId === organizationId;
};

/**
 * 監査ログ用のコンテキスト情報を取得
 *
 * @returns 監査ログに記録する情報
 */
export const getAuditContext = () => {
  const context = getTenantContext();

  return {
    organizationId: context?.organizationId,
    userId: context?.userId,
    requestId: context?.requestId,
    timestamp: new Date().toISOString(),
  };
};
