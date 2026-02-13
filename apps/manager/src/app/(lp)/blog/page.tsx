import { client } from "@/libs/microcms";
import type { BlogPost } from "@/types/blog";
import { BlogClient } from "./_components/BlogClient";

const getBlogPosts = async () => {
  try {
    const response = await client.get<{ contents: BlogPost[] }>({
      endpoint: "blogs",
      queries: {
        orders: "-publishedAt",
      },
    });
    return response;
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    // ビルド時にAPIが利用できない場合は空の配列を返す
    return { contents: [] };
  }
};

export default async function BlogPage() {
  const { contents } = await getBlogPosts();

  return <BlogClient posts={contents} />;
}
