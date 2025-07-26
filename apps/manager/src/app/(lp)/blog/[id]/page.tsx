import { notFound } from "next/navigation";
import { client } from "~/libs/microcms";
import type { BlogPost } from "~/types/blog";
import BlogDetailClient from "./BlogDetailClient";

const getBlogPost = async (id: string) => {
  try {
    const post = await client.get<BlogPost>({
      endpoint: "blogs",
      contentId: id,
    });
    return post;
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
};

export default async function BlogPostPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await getBlogPost(params.id);

  if (!post) {
    notFound();
  }

  return <BlogDetailClient post={post} />;
}
