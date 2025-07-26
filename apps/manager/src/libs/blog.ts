import { client } from "./microcms";
import type { BlogPost } from "~/types/blog";

export const getAllBlogPosts = async () => {
  try {
    const response = await client.get<{ contents: BlogPost[] }>({
      endpoint: "blogs",
      queries: {
        limit: 9999, // 全記事取得
        orders: "-publishedAt",
      },
    });
    return response.contents;
  } catch (error) {
    console.error("Error fetching all blog posts:", error);
    return [];
  }
};
