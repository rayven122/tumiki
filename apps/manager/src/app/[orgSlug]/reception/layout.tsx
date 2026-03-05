/**
 * 受付モード専用レイアウト
 * 親のヘッダー・サイドバーを覆い隠すフルスクリーンレイアウト
 */

import { auth } from "~/auth";
import { redirect } from "next/navigation";

type ReceptionLayoutProps = {
  children: React.ReactNode;
};

const ReceptionLayout = async ({ children }: ReceptionLayoutProps) => {
  const session = await auth();

  // 認証チェック
  if (!session?.user) {
    redirect("/");
  }

  return (
    // fixed + inset-0 + z-50 で親のヘッダー・サイドバーを覆い隠す
    <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-black">
      {children}
    </div>
  );
};

export default ReceptionLayout;
