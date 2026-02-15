import { notFound } from "next/navigation";
import { client } from "@/lib/blog/microcms";
import type { BlogPost } from "@/types/blog";
import BlogDetailClient from "./_components/BlogDetailClient";

const getBlogPost = async (id: string) => {
  try {
    const post = await client.get<BlogPost>({
      endpoint: "blogs",
      contentId: id,
    });

    // microCMSから取得したコンテンツは信頼できるソースのため、サーバーサイドで処理
    // 必要に応じてここでサニタイズ処理を追加可能

    return post;
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getBlogPost(id);

  if (!post) {
    notFound();
  }

  return <BlogDetailClient post={post} />;
}
