import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  GitBranch,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import {
  effectBadgeClass,
  getOrgById,
  getUserById,
  mockGroups,
  mockTools,
  sourceBadgeClass,
  sourceLabel,
} from "../../_components/idp-ui-mock-data";

const UserDetailPage = async ({
  params,
}: {
  params: Promise<{ userId: string }>;
}) => {
  const { userId } = await params;
  const user = getUserById(userId);
  if (!user) notFound();

  const org = getOrgById(user.orgId);
  const groups = mockGroups.filter((group) => user.groupIds.includes(group.id));
  const userExceptionCount = mockTools.filter(
    (tool) => tool.userEffect !== "unset",
  ).length;
  const denyCount = mockTools.filter(
    (tool) =>
      tool.userEffect === "deny" ||
      tool.groupEffect === "deny" ||
      tool.orgEffect === "deny",
  ).length;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="bg-bg-active text-text-primary flex h-12 w-12 items-center justify-center rounded-xl text-base font-semibold">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] ${sourceBadgeClass[user.source]}`}
              >
                {sourceLabel[user.source]}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] ${
                  user.status === "active"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-zinc-500/20 text-zinc-300"
                }`}
              >
                {user.status === "active" ? "Active" : "Suspended"}
              </span>
            </div>
            <h1 className="text-text-primary text-xl font-semibold">
              {user.name}
            </h1>
            <p className="text-text-secondary mt-1 text-xs">
              {user.email} / {user.title}
            </p>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="bg-bg-active text-text-secondary inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs"
        >
          ユーザー一覧へ
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          {
            icon: GitBranch,
            label: "所属組織",
            value: org?.name ?? "未所属",
            sub: org?.path ?? "-",
          },
          {
            icon: Users,
            label: "所属グループ",
            value: `${groups.length} 件`,
            sub: "横断チームと IdP グループ",
          },
          {
            icon: Shield,
            label: "個別例外",
            value: `${userExceptionCount} 件`,
            sub: "一時的な拒否を含む",
          },
          {
            icon: AlertTriangle,
            label: "拒否ルール",
            value: `${denyCount} 件`,
            sub: "拒否を強く扱う",
          },
        ].map(({ icon: Icon, label, value, sub }) => (
          <section
            key={label}
            className="bg-bg-card border-border-default rounded-xl border p-4"
          >
            <div className="text-text-muted mb-3 flex items-center gap-2 text-xs">
              <Icon size={13} />
              {label}
            </div>
            <div className="text-text-primary text-sm font-semibold">
              {value}
            </div>
            <div className="text-text-subtle mt-1 truncate text-[10px]">
              {sub}
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <section className="bg-bg-card border-border-default rounded-xl border p-4">
            <h2 className="text-text-primary mb-3 flex items-center gap-2 text-sm font-semibold">
              <GitBranch size={14} />
              所属組織
            </h2>
            {org ? (
              <Link
                href="/admin/directory?tab=organizations"
                className="bg-bg-active hover:bg-bg-card-hover block rounded-lg px-3 py-3 transition-colors"
              >
                <div className="text-text-primary text-xs font-medium">
                  {org.name}
                </div>
                <div className="text-text-muted mt-1 font-mono text-[10px]">
                  {org.path}
                </div>
              </Link>
            ) : (
              <p className="text-text-muted text-xs">所属組織がありません</p>
            )}
          </section>

          <section className="bg-bg-card border-border-default rounded-xl border p-4">
            <h2 className="text-text-primary mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users size={14} />
              所属グループ
            </h2>
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="bg-bg-active rounded-lg px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary min-w-0 flex-1 truncate text-xs font-medium">
                      {group.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] ${sourceBadgeClass[group.source]}`}
                    >
                      {sourceLabel[group.source]}
                    </span>
                  </div>
                  <p className="text-text-muted mt-1 truncate text-[10px]">
                    {group.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
          <div className="border-b-border-default flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-text-primary flex items-center gap-2 text-sm font-semibold">
              <UserRound size={14} />
              有効 MCP 権限と理由
            </h2>
            <span className="text-text-subtle text-[10px]">
              拒否は許可より優先。ユーザー個別許可も部署/グループ拒否を上書きしません
            </span>
          </div>
          <div className="border-b-border-default text-text-subtle grid grid-cols-[1fr_90px_180px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
            <span>提供ツール</span>
            <span>結果</span>
            <span>理由</span>
          </div>
          {mockTools.map((tool) => {
            const denied =
              tool.userEffect === "deny" ||
              tool.groupEffect === "deny" ||
              tool.orgEffect === "deny";
            return (
              <div
                key={tool.id}
                className="border-b-border-subtle hover:bg-bg-card-hover grid grid-cols-[1fr_90px_180px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-text-primary font-medium">
                    {tool.name}
                  </div>
                  <div className="text-text-muted mt-1 font-mono text-[10px]">
                    {tool.catalog}
                  </div>
                </div>
                <span
                  className={`w-fit rounded-full px-2 py-0.5 text-[10px] ${
                    denied ? effectBadgeClass.deny : effectBadgeClass.allow
                  }`}
                >
                  {denied ? "拒否" : "許可"}
                </span>
                <div className="min-w-0">
                  <div className="text-text-secondary truncate">
                    {tool.inheritedFrom}
                  </div>
                  <div className="text-text-muted mt-1 truncate text-[10px]">
                    {tool.reason}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
};

export default UserDetailPage;
