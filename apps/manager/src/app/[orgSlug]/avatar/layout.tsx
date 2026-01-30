/**
 * アバターモード専用レイアウト
 * 親のヘッダー・サイドバーを覆い隠すフルスクリーンレイアウト
 */

import { auth } from "~/auth";
import { redirect } from "next/navigation";

type AvatarLayoutProps = {
  children: React.ReactNode;
};

const AvatarLayout = async ({ children }: AvatarLayoutProps) => {
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

export default AvatarLayout;
