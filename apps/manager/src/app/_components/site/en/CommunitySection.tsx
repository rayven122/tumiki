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
                  <Image
                    src="/logos/discord.svg"
                    alt="Discord Icon"
                    width={40}
                    height={40}
                    className="brightness-0 invert"
                  />
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
                <Image
                  src="/logos/arrow-right.svg"
                  alt="Arrow Right"
                  width={20}
                  height={20}
                  className="ml-2 transition-transform group-hover:translate-x-1"
                />
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
                  <Image
                    src="/logos/x-white.svg"
                    alt="X (Twitter) Icon"
                    width={40}
                    height={40}
                    className="brightness-0 invert"
                  />
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
                <Image
                  src="/logos/arrow-right.svg"
                  alt="Arrow Right"
                  width={20}
                  height={20}
                  className="ml-2 transition-transform group-hover:translate-x-1"
                />
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
