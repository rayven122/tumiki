import { NextResponse } from "next/server";
import { SCIM_PROVIDER } from "./auth";

const SCIM_CONTENT_TYPE = "application/scim+json";

export const SCIM_SCHEMAS = {
  USER: "urn:ietf:params:scim:schemas:core:2.0:User",
  GROUP: "urn:ietf:params:scim:schemas:core:2.0:Group",
  LIST_RESPONSE: "urn:ietf:params:scim:api:messages:2.0:ListResponse",
  ERROR: "urn:ietf:params:scim:api:messages:2.0:Error",
} as const;

type DbUser = {
  id: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  externalIdentities: { provider: string; sub: string }[];
};

type DbGroup = {
  id: string;
  name: string;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberships: {
    userId: string;
    user: { email: string | null; name: string | null };
  }[];
};

export const formatUser = (user: DbUser, origin: string) => {
  const scimExternalId = user.externalIdentities.find(
    (e) => e.provider === SCIM_PROVIDER,
  )?.sub;

  return {
    schemas: [SCIM_SCHEMAS.USER],
    id: user.id,
    ...(scimExternalId !== undefined && { externalId: scimExternalId }),
    userName: user.email ?? user.id,
    displayName: user.name ?? undefined,
    emails: user.email ? [{ value: user.email, primary: true }] : [],
    active: user.isActive,
    meta: {
      resourceType: "User",
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `${origin}/api/scim/v2/Users/${user.id}`,
    },
  };
};

export const formatGroup = (group: DbGroup, origin: string) => ({
  schemas: [SCIM_SCHEMAS.GROUP],
  id: group.id,
  ...(group.externalId !== null && { externalId: group.externalId }),
  displayName: group.name,
  members: group.memberships.map((m) => ({
    value: m.userId,
    display: m.user.email ?? m.user.name ?? m.userId,
  })),
  meta: {
    resourceType: "Group",
    created: group.createdAt.toISOString(),
    lastModified: group.updatedAt.toISOString(),
    location: `${origin}/api/scim/v2/Groups/${group.id}`,
  },
});

export const scimResponse = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Content-Type": SCIM_CONTENT_TYPE },
  });

export const scimError = (status: number, detail: string, scimType?: string) =>
  NextResponse.json(
    {
      schemas: [SCIM_SCHEMAS.ERROR],
      status: String(status),
      detail,
      ...(scimType !== undefined && { scimType }),
    },
    { status, headers: { "Content-Type": SCIM_CONTENT_TYPE } },
  );

export const listResponse = (
  resources: unknown[],
  totalResults: number,
  startIndex = 1,
) => ({
  schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
  totalResults,
  startIndex,
  itemsPerPage: resources.length,
  Resources: resources,
});
