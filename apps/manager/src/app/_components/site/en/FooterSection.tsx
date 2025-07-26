import Link from "next/link";

export const FooterSection = () => {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
        {/* Legal Links */}
        <div className="mb-8 flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href="/legal/transactions"
            className="text-gray-600 transition-colors hover:text-gray-900 hover:underline"
          >
            Commercial Transactions Act
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/privacy"
            className="text-gray-600 transition-colors hover:text-gray-900 hover:underline"
          >
            Privacy Policy
          </Link>
          <span className="text-gray-400">|</span>
          <Link
            href="/terms"
            className="text-gray-600 transition-colors hover:text-gray-900 hover:underline"
          >
            Terms of Service
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            © 2024 Tumiki. Building blocks for AI.
          </p>
        </div>
      </div>
    </footer>
  );
};
