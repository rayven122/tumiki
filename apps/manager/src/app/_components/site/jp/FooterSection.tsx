import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="border-t-3 border-black bg-white py-16">
      <div className="mx-auto max-w-6xl px-5">
        {/* Legal Links */}
        <div className="mb-8 flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href="/legal/transactions"
            className="font-medium text-gray-600 transition-colors hover:text-black hover:underline"
          >
            特定商取引法に基づく表記
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/privacy"
            className="font-medium text-gray-600 transition-colors hover:text-black hover:underline"
          >
            プライバシーポリシー
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/terms"
            className="font-medium text-gray-600 transition-colors hover:text-black hover:underline"
          >
            利用規約
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="font-semibold text-gray-600">
            © 2024 Tumiki. Building blocks for AI.
          </p>
        </div>
      </div>
    </footer>
  );
}
