import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

const AdminRoleNewPage = () => (
  <div className="flex h-full min-h-screen flex-col">
    <header className="border-b-border-default shrink-0 border-b px-6 py-4">
      <Link
        href="/admin/roles"
        className="text-text-muted hover:text-text-primary mb-2 inline-flex items-center gap-1 text-[11px]"
      >
        <ArrowLeft size={12} />
        部署別 MCP 権限へ戻る
      </Link>
      <h1 className="text-text-primary flex items-center gap-2 text-lg font-semibold">
        <Shield size={18} />
        カスタムロール作成は利用できません
      </h1>
      <p className="text-text-secondary mt-1 text-xs">
        現在のロール管理は、実データの部署別 MCP
        カタログ・ツール権限を保存します。新規ロールテンプレートの永続化先はありません。
      </p>
    </header>
    <main className="flex-1 p-6">
      <section className="bg-bg-card border-border-default max-w-2xl rounded-lg border p-5">
        <h2 className="text-text-primary text-sm font-semibold">
          部署別権限を編集してください
        </h2>
        <p className="text-text-secondary mt-2 text-xs leading-relaxed">
          左の部署一覧から対象部署を選び、MCP
          カタログまたはツール単位で許可・拒否を設定できます。
          設定は保存すると実データへ反映されます。
        </p>
        <Link
          href="/admin/roles"
          className="bg-btn-primary-bg text-btn-primary-text mt-4 inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs font-medium"
        >
          部署一覧を開く
        </Link>
      </section>
    </main>
  </div>
);

export default AdminRoleNewPage;
