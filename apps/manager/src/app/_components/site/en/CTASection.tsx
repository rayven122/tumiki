"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export const CTASection = () => {
  return (
    <section className="border-t-3 border-black bg-gradient-to-br from-indigo-50 to-purple-50 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="mb-6 text-4xl font-black tracking-tight text-black md:text-5xl lg:text-6xl">
            Build Your Organization's
            <br />
            <span className="inline-block bg-black px-4 py-2 text-white shadow-[4px_4px_0_#6366f1]">
              AI Agent Team Environment
            </span>
            <br />
            Today
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mb-12 max-w-4xl text-lg text-gray-700 md:text-xl"
          >
            Experience unified MCP server management and
            <br />
            specialized, team-based AI agents firsthand.
            <br />
            With setup support, you'll see real results guaranteed.
          </motion.p>

          {/* Main CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-12"
          >
            <Link
              href="/signup"
              className="mb-6 inline-block border-3 border-black bg-black px-12 py-5 text-xl font-bold text-white shadow-[6px_6px_0_#6366f1] transition-all duration-300 hover:-translate-x-2 hover:-translate-y-2 hover:shadow-[12px_12px_0_#6366f1]"
            >
              Get Started Free
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
