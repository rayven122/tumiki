"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";
import type { BlogPost } from "@/types/blog";
import { FooterSection } from "@/app/_components/site/jp/FooterSection";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/app/_components/site/jp/Header";
import Image from "next/image";

interface BlogDetailClientProps {
  post: BlogPost;
}

export default function BlogDetailClient({ post }: BlogDetailClientProps) {
  const sanitizedContent = useMemo(() => {
    if (typeof window !== "undefined") {
      return DOMPurify.sanitize(post.content);
    }
    return post.content;
  }, [post.content]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <article className="relative mx-auto max-w-4xl px-5 py-16 pt-32 md:py-24 md:pt-32">
        {/* Back to Blog Link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">ブログ一覧に戻る</span>
          </Link>
        </motion.div>

        {/* Article Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12"
        >
          <h1 className="mb-6 text-3xl font-black tracking-tight text-black md:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {post.category && (
              <span className="border-2 border-black bg-white px-4 py-2 font-semibold shadow-[2px_2px_0_#000]">
                {post.category.name}
              </span>
            )}
            {post.publishedAt && (
              <time className="font-medium">
                {new Date(post.publishedAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
          </div>
        </motion.header>

        {/* Featured Image */}
        {post.eyecatch && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 overflow-hidden border-2 border-black shadow-[4px_4px_0_#000]"
          >
            <Image
              src={post.eyecatch.url}
              alt={post.title}
              width={1200}
              height={630}
              sizes="100vw"
              className="h-auto w-full"
              priority
            />
          </motion.div>
        )}

        {/* Article Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="prose prose-lg prose-headings:font-black prose-headings:tracking-tight prose-h2:mb-4 prose-h2:mt-12 prose-h2:text-2xl prose-h3:mb-3 prose-h3:mt-8 prose-h3:text-xl prose-p:mb-6 prose-p:leading-relaxed prose-p:text-gray-700 prose-a:border-b-2 prose-a:border-blue-600 prose-a:text-blue-600 prose-a:no-underline prose-a:transition-colors hover:prose-a:border-blue-800 hover:prose-a:text-blue-800 prose-blockquote:border-l-4 prose-blockquote:border-black prose-blockquote:bg-gray-50 prose-blockquote:py-4 prose-blockquote:pl-6 prose-blockquote:pr-4 prose-blockquote:not-italic prose-code:rounded prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:border-2 prose-pre:border-black prose-pre:bg-gray-900 prose-pre:shadow-[4px_4px_0_#000] max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 border-2 border-black bg-gray-50 p-8 text-center shadow-[4px_4px_0_#000]"
        >
          <h3 className="mb-4 text-2xl font-black text-black">
            Tumikiで業務を効率化しませんか？
          </h3>
          <p className="mb-6 text-gray-600">
            MCPを活用して、あなたのチームに最適なAIアシスタントを構築できます
          </p>
          <Link
            href="/signup"
            className="inline-block border-2 border-black bg-black px-8 py-3 font-semibold text-white shadow-[3px_3px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#6366f1]"
          >
            無料登録
          </Link>
        </motion.div>
      </article>

      <FooterSection />
    </div>
  );
}
