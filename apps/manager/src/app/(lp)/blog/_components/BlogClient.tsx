"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { BlogPost } from "@/types/blog";
import { ArrowRight } from "lucide-react";
import { CommunitySection } from "@/app/_components/site/jp/CommunitySection";
import { Header } from "@/app/_components/site/jp/Header";
import { FooterSection } from "@/app/_components/site/jp/FooterSection";

interface BlogClientProps {
  posts: BlogPost[];
}

export const BlogClient = ({ posts }: BlogClientProps) => {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b-2 border-black bg-gradient-to-br from-white via-gray-50 to-white pt-32">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="mb-4 text-5xl font-black tracking-tight text-black md:text-6xl">
              Tumiki ブログ
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 md:text-xl">
              AIとMCPテクノロジーの最新情報、開発ティップス、アップデート情報をお届けします
            </p>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <motion.div
          className="absolute -top-10 -right-10 h-32 w-32 border-2 border-gray-300 bg-gray-100"
          animate={{
            rotate: [0, 5, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-10 -left-10 h-24 w-24 border-2 border-gray-200 bg-gray-50"
          animate={{
            rotate: [0, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0_#000] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#000]"
              >
                {post.eyecatch && (
                  <div className="relative h-48 overflow-hidden border-b-2 border-black">
                    <Image
                      src={post.eyecatch.url}
                      alt={post.title}
                      width={400}
                      height={240}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="mb-3 text-xl font-bold text-black transition-colors group-hover:text-blue-600">
                    <Link href={`/blog/${post.id}`} className="block">
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && (
                    <p className="mb-4 line-clamp-2 text-gray-600">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {post.category && (
                      <span className="border-2 border-black bg-yellow-300 px-3 py-1 text-sm font-bold text-black">
                        {post.category.name}
                      </span>
                    )}
                    {post.publishedAt && (
                      <time className="text-sm font-medium text-gray-500">
                        {new Date(post.publishedAt).toLocaleDateString("ja-JP")}
                      </time>
                    )}
                  </div>
                </div>
                <Link
                  href={`/blog/${post.id}`}
                  className="absolute inset-0"
                  aria-label={`${post.title}を読む`}
                />
              </motion.article>
            ))}
          </div>

          {posts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <p className="text-xl text-gray-600">
                現在、公開されている記事はありません。
              </p>
            </motion.div>
          )}
        </div>
      </section>

      <CommunitySection />

      {/* CTA Section */}
      <section className="border-t-2 border-black bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="mb-4 text-3xl font-bold text-black">
            最新情報を見逃さない
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Tumikiの最新アップデートやAI技術のトレンドを定期的にお届けします
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center border-2 border-black bg-black px-8 py-4 font-bold text-white shadow-[4px_4px_0_#6366f1] transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#6366f1]"
          >
            Tumikiを試してみる
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <FooterSection />
    </div>
  );
};
