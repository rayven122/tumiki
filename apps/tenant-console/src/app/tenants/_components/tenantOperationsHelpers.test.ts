import { afterEach, describe, expect, test, vi } from "vitest";
import type { RouterOutputs } from "@/trpc/react";
import {
  formatAge,
  healthClass,
  phaseBadgeClass,
  podHealthLabel,
} from "./tenantOperationsHelpers";

type Tenant = RouterOutputs["tenant"]["list"][number];
type PodRow = RouterOutputs["monitoring"]["pods"][number];

const tenant = {
  id: "tenant_1",
  slug: "tenant-a",
  domain: "tenant-a-manager.tumiki.cloud",
  status: "ACTIVE",
  oidcType: "KEYCLOAK",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
} satisfies Tenant;

const podRow = {
  tenantId: "tenant_1",
  slug: "tenant-a",
  dbStatus: "ACTIVE",
  pods: [
    {
      name: "tenant-a-0",
      phase: "Running",
      ready: true,
      restartCount: 0,
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
      containers: [],
    },
  ],
  error: null,
} satisfies PodRow;

describe("tenantOperationsHelpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("Pod phase と ready 状態からバッジ色を返す", () => {
    expect(phaseBadgeClass("Running", true)).toStrictEqual(
      "bg-badge-success-bg text-badge-success-text",
    );
    expect(phaseBadgeClass("Pending", false)).toStrictEqual(
      "bg-badge-warn-bg text-badge-warn-text",
    );
    expect(phaseBadgeClass("Failed", false)).toStrictEqual(
      "bg-badge-error-bg text-badge-error-text",
    );
  });

  test("開始日時から経過時間を短い表記で返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T02:30:00.000Z"));

    expect(formatAge(null)).toStrictEqual("-");
    expect(formatAge(new Date("2026-01-02T02:10:00.000Z"))).toStrictEqual(
      "20m",
    );
    expect(formatAge(new Date("2026-01-02T00:30:00.000Z"))).toStrictEqual("2h");
    expect(formatAge(new Date("2026-01-01T00:30:00.000Z"))).toStrictEqual("1d");
  });

  test("テナントと Pod 行からヘルス表示を返す", () => {
    expect(podHealthLabel(tenant, undefined)).toStrictEqual({
      label: "未取得",
      tone: "muted",
    });
    expect(
      podHealthLabel(tenant, {
        tenantId: "tenant_1",
        slug: "tenant-a",
        dbStatus: "ACTIVE",
        pods: [],
        error: "failed",
      }),
    ).toStrictEqual({
      label: "取得失敗",
      tone: "error",
    });
    expect(
      podHealthLabel({ ...tenant, status: "PROVISIONING" }, podRow),
    ).toStrictEqual({
      label: "監視対象外",
      tone: "muted",
    });
    expect(podHealthLabel(tenant, { ...podRow, pods: [] })).toStrictEqual({
      label: "Pod なし",
      tone: "warn",
    });
    expect(podHealthLabel(tenant, podRow)).toStrictEqual({
      label: "Healthy",
      tone: "success",
    });
    expect(
      podHealthLabel(tenant, {
        ...podRow,
        pods: [{ ...podRow.pods[0]!, ready: false }],
      }),
    ).toStrictEqual({
      label: "Attention",
      tone: "warn",
    });
  });

  test("ヘルストーンからバッジ色を返す", () => {
    expect(healthClass("success")).toStrictEqual(
      "bg-badge-success-bg text-badge-success-text",
    );
    expect(healthClass("warn")).toStrictEqual(
      "bg-badge-warn-bg text-badge-warn-text",
    );
    expect(healthClass("error")).toStrictEqual(
      "bg-badge-error-bg text-badge-error-text",
    );
    expect(healthClass("muted")).toStrictEqual("bg-bg-active text-text-muted");
  });
});
