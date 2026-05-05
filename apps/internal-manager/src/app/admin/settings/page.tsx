import { Suspense } from "react";
import { DesktopApiSettingsSection } from "./_components/DesktopApiSettingsSection";
import { ObjectStorageSettingsSection } from "./_components/ObjectStorageSettingsSection";
import ScimDirectorySection from "./_components/ScimDirectorySection";
import SsoConfigSection from "./_components/SsoConfigSection";

/* ===== システム設定画面 ===== */

const AdminSettingsPage = () => {
  return (
    <div className="space-y-5 p-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-text-primary text-lg font-semibold">
          システム設定
        </h1>
        <p className="text-text-secondary mt-1 text-xs">
          組織・認証・セキュリティの設定を管理
        </p>
      </div>

      <DesktopApiSettingsSection />
      <ObjectStorageSettingsSection />

      {/* 1. 認証・SSO */}
      <div className="bg-bg-card border-border-default rounded-xl border p-5">
        <h2 className="text-text-primary mb-4 text-sm font-semibold">
          認証・SSO
        </h2>
        <div className="space-y-4">
          <SsoConfigSection />
          {/* SCIM Directory（Jackson Directory Sync） */}
          {/* useSearchParams を含むため Suspense でラップ（Next.js App Router 要件） */}
          <Suspense fallback={null}>
            <ScimDirectorySection />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
