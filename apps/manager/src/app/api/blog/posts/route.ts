import { NextResponse } from "next/server";
import { client } from "~/libs/microcms";
import type { BlogPost } from "~/types/blog";

interface MicroCMSResponse {
  contents: BlogPost[];
  totalCount: number;
  offset: number;
  limit: number;
}

export async function GET() {
  try {
    const response = await client.get<MicroCMSResponse>({
      endpoint: "blogs",
      queries: {
        orders: "-publishedAt",
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    const errorMessage =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to fetch blog posts";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
