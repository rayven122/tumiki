import { client } from "~/libs/microcms";
import type { BlogPost } from "~/types/blog";
import { BlogClient } from "./BlogClient";

const getBlogPosts = async () => {
  const response = await client.get<{ contents: BlogPost[] }>({
    endpoint: "blogs",
    queries: {
      orders: "-publishedAt",
    },
  });
  return response;
};

export default async function BlogPage() {
  const { contents } = await getBlogPosts();

  return <BlogClient posts={contents} />;
}
