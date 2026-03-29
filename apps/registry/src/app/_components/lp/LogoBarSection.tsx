type Logo = {
  name: string;
  src: string;
  /** ダークテーマ上で視認性を確保するために白色反転が必要なロゴ */
  invert: boolean;
};

const LOGOS: Logo[] = [
  { name: "Cursor", src: "/logos/ai-clients/cursor.webp", invert: false },
  { name: "ChatGPT", src: "/logos/ai-clients/chatgpt.webp", invert: false },
  { name: "Claude", src: "/logos/ai-clients/claude.webp", invert: false },
  { name: "Copilot", src: "/logos/ai-clients/copilot.webp", invert: false },
  { name: "GitHub", src: "/logos/services/github.webp", invert: false },
  { name: "Notion", src: "/logos/services/notion.webp", invert: false },
  { name: "Slack", src: "/logos/services/slack.webp", invert: false },
  { name: "Figma", src: "/logos/services/figma.webp", invert: false },
  { name: "Vercel", src: "/logos/services/vercel.webp", invert: false },
  {
    name: "Google Drive",
    src: "/logos/services/google-drive.svg",
    invert: false,
  },
  { name: "Sentry", src: "/logos/services/sentry.webp", invert: false },
  { name: "PostgreSQL", src: "/logos/services/postgresql.webp", invert: false },
];

const LogoBarSection = () => {
  return (
    <section className="overflow-hidden border-t border-b border-white/[0.06] bg-[#0a0a0a] py-6">
      <div className="mx-auto flex min-w-max flex-nowrap items-center justify-center gap-5 px-5 md:gap-8">
        {LOGOS.map((logo) => (
          <div key={logo.name} className="flex shrink-0 items-center gap-1.5">
            <img
              src={logo.src}
              alt={logo.name}
              className="h-4 opacity-40 transition hover:opacity-70"
            />
            <span className="text-[10px] whitespace-nowrap text-zinc-600">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LogoBarSection;
