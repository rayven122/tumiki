interface FooterCTASectionProps {
  setShowModal: (show: boolean) => void;
}

export function FooterCTASection({ setShowModal }: FooterCTASectionProps) {
  return (
    <section className="relative overflow-hidden bg-black py-24 text-center text-white">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="mb-12 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
          積み木のように組み合わせて、
          <br />
          AIを"社員"に変える時代へ。
        </h2>
        <p className="mb-10 text-lg text-white/80">
          Tumikiなら、Notion・Slack・カレンダーなどと自由に接続し、
          <br />
          あなた専用の"AI社員"をすぐに動かせます。
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="border-3 border-white bg-white px-10 py-4 text-lg font-bold text-black shadow-[4px_4px_0_rgba(255,255,255,0.3)] transition-all duration-300 hover:bg-transparent hover:text-white"
        >
          早期アクセスで先行体験する
        </button>
      </div>
    </section>
  );
}
