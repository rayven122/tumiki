import "server-only";
import { headers } from "next/headers";
import { URL_HEADER_KEY } from "apps/manager/src/constants/url";

export const getCurrentUrl = async () => {
  const headerParams = await headers();
  const currentPath = headerParams.get(URL_HEADER_KEY);
  return currentPath;
};
