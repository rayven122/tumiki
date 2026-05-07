import { Building2, Check, Minus, User, Users, X } from "lucide-react";
import { expect, test } from "vitest";
import {
  effectConfig,
  formatPermissionSummary,
  getAssignmentTargetName,
  getAssignmentTargetSource,
  riskBadgeClass,
  targetIcon,
  targetLabel,
} from "./idp-ui-helpers";
import { effectBadgeClass, type MockRole } from "./idp-ui-mock-data";

const buildRole = (permissions: MockRole["permissions"] = []): MockRole => ({
  id: "role-test",
  name: "テストロール",
  description: "テスト用",
  type: "custom",
  source: "tumiki",
  readonly: false,
  permissions,
  updatedAt: "2026-05-01",
  updatedBy: "テストユーザー",
});

test("formatPermissionSummary は許可と拒否の件数を整形する", () => {
  const role = buildRole([
    { toolId: "github-pr", effect: "allow" },
    { toolId: "audit-log", effect: "allow" },
    { toolId: "prod-db", effect: "deny" },
  ]);
  expect(formatPermissionSummary(role)).toStrictEqual("許可 2 / 拒否 1");
});

test("formatPermissionSummary は権限が空でも 0 件として整形する", () => {
  expect(formatPermissionSummary(buildRole([]))).toStrictEqual(
    "許可 0 / 拒否 0",
  );
});

test("targetIcon は対象種別ごとに対応するアイコンを返す", () => {
  expect(targetIcon).toStrictEqual({
    org: Building2,
    group: Users,
    user: User,
  });
});

test("targetLabel は対象種別ごとに日本語ラベルを返す", () => {
  expect(targetLabel).toStrictEqual({
    org: "階層組織",
    group: "横断グループ",
    user: "ユーザー例外",
  });
});

test("riskBadgeClass はリスクレベルごとの Tailwind クラスを返す", () => {
  expect(riskBadgeClass).toStrictEqual({
    low: "bg-emerald-500/15 text-emerald-300",
    medium: "bg-amber-500/15 text-amber-300",
    high: "bg-red-500/15 text-red-300",
  });
});

test("effectConfig は許可・拒否・未設定それぞれに正しいアイコンと配色を割り当てる", () => {
  expect(effectConfig.allow).toStrictEqual({
    label: "許可",
    icon: Check,
    className: effectBadgeClass.allow,
  });
  expect(effectConfig.deny).toStrictEqual({
    label: "拒否",
    icon: X,
    className: effectBadgeClass.deny,
  });
  expect(effectConfig.unset).toStrictEqual({
    label: "未設定",
    icon: Minus,
    className: effectBadgeClass.unset,
  });
});

test("getAssignmentTargetName は組織 ID から組織名を解決する", () => {
  expect(getAssignmentTargetName("org", "platform")).toStrictEqual(
    "Platform チーム",
  );
});

test("getAssignmentTargetName はグループ ID からグループ名を解決する", () => {
  expect(getAssignmentTargetName("group", "ai-program")).toStrictEqual(
    "AI 推進チーム",
  );
});

test("getAssignmentTargetName はユーザー ID からユーザー名を解決する", () => {
  expect(getAssignmentTargetName("user", "user-mina")).toStrictEqual(
    "水野 美奈",
  );
});

test("getAssignmentTargetName は未知の ID に対して null を返す", () => {
  expect(getAssignmentTargetName("org", "missing")).toStrictEqual(null);
  expect(getAssignmentTargetName("group", "missing")).toStrictEqual(null);
  expect(getAssignmentTargetName("user", "missing")).toStrictEqual(null);
});

test("getAssignmentTargetSource は組織の source を解決する", () => {
  expect(getAssignmentTargetSource("org", "platform")).toStrictEqual("google");
});

test("getAssignmentTargetSource はグループの source を解決する", () => {
  expect(getAssignmentTargetSource("group", "ai-program")).toStrictEqual(
    "tumiki",
  );
});

test("getAssignmentTargetSource はユーザーの source を解決する", () => {
  expect(getAssignmentTargetSource("user", "user-mina")).toStrictEqual("entra");
});

test("getAssignmentTargetSource は未知の ID に対して null を返す", () => {
  expect(getAssignmentTargetSource("org", "missing")).toStrictEqual(null);
  expect(getAssignmentTargetSource("group", "missing")).toStrictEqual(null);
  expect(getAssignmentTargetSource("user", "missing")).toStrictEqual(null);
});
