import { auth } from "~/auth";
import type { NextRequest } from "next/server";
import { getChatsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") ?? "10");
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");
  const organizationId = searchParams.get("organization_id");

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided.",
    ).toResponse();
  }

  if (!organizationId) {
    return new ChatSDKError(
      "bad_request:api",
      "organization_id is required.",
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chats = await getChatsByUserId({
    id: session.user.id,
    organizationId,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
};
