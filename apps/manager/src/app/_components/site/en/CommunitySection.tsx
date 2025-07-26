"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export const CommunitySection = () => {
  return (
    <section className="bg-gray-50 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
            Join the Tumiki Community
          </h2>
          <p className="mb-12 text-lg text-gray-600">
            Connect with developers and stay updated with the latest news
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Discord Card */}
          <motion.a
            href="https://discord.gg/EBxEcKxf"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden border-2 border-black bg-white p-8 shadow-[4px_4px_0_#000] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#000]"
          >
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5865F2]">
                  <svg
                    className="h-10 w-10 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-black">
                    Discord Community
                  </h3>
                  <p className="text-gray-600">Tumiki MCP Community</p>
                </div>
              </div>
              <p className="mb-4 text-gray-700">
                Join our community to discuss MCP and AI engineering, share
                knowledge, ask questions, and connect with fellow developers.
              </p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                <span className="font-semibold">Join Discord</span>
                <svg
                  className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-[#5865F2] opacity-10" />
          </motion.a>

          {/* X (Twitter) Card */}
          <motion.a
            href="https://x.com/Tumiki_MCP"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden border-2 border-black bg-white p-8 shadow-[4px_4px_0_#000] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#000]"
          >
            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black">
                  <svg
                    className="h-10 w-10 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-black">
                    X (Twitter) Official
                  </h3>
                  <p className="text-gray-600">@Tumiki_MCP</p>
                </div>
              </div>
              <p className="mb-4 text-gray-700">
                Follow us for the latest updates, technical blog posts, event
                announcements, and real-time news about Tumiki.
              </p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                <span className="font-semibold">Follow on X</span>
                <svg
                  className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-black opacity-10" />
          </motion.a>
        </div>

        {/* Additional CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-lg text-gray-600">
            Join us in shaping the future of AI engineering
          </p>
        </motion.div>
      </div>
    </section>
  );
};
