/** Footer - サイトフッター */

const FOOTER_LINKS = [
  {
    title: "プロダクト",
    links: [
      { label: "機能", href: "#features" },
      { label: "アーキテクチャ", href: "#solution" },
      { label: "料金", href: "/contact" },
    ],
  },
  {
    title: "リソース",
    links: [
      { label: "ドキュメント", href: "/docs" },
      { label: "ブログ", href: "/blog" },
      { label: "お知らせ", href: "/news" },
    ],
  },
  {
    title: "会社情報",
    links: [
      { label: "RAYVEN Inc.", href: "https://rayven.co.jp" },
      { label: "お問い合わせ", href: "/contact" },
      { label: "プライバシーポリシー", href: "/privacy" },
    ],
  },
] as const;

const Footer = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* ブランド */}
          <div className="col-span-2 md:col-span-1">
            <span className="text-sm font-semibold tracking-tight text-white">
              TUMIKI
            </span>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-zinc-600">
              社内AIの全通信を制御・監査する、ゼロトラストゲートウェイ。
            </p>
          </div>

          {/* リンクカラム */}
          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <span className="text-xs font-medium text-zinc-400">
                {group.title}
              </span>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* コピーライト */}
        <div className="mt-12 flex items-center justify-between border-t border-white/[0.06] pt-6 text-[11px] text-zinc-700">
          <span>&copy; 2026 RAYVEN Inc. All rights reserved.</span>
          <span>特許取得済み</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
