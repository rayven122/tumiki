import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@tumiki/ui/button";

export const FooterCTASection = () => {
  return (
    <section className="bg-gray-900 px-6 py-24 text-white lg:px-12">
      <div className="mx-auto max-w-4xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-6 text-3xl leading-tight font-bold lg:text-5xl"
        >
          Build with blocks to transform AI into your digital workforce.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-8 text-xl text-gray-300"
        >
          Connect Notion, Slack, and Google Calendar to create an AI assistant
          that truly understands your business context.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <Button
            asChild
            size="lg"
            className="transform bg-white px-8 py-6 text-lg text-gray-900 shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-[1.02] hover:bg-gray-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
          >
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
