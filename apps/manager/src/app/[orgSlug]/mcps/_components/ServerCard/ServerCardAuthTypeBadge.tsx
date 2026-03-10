import { Badge } from "@tumiki/ui/badge";
import type { AuthType } from "@tumiki/db/prisma";

type AuthTypeBadgeProps = {
  authType: AuthType;
};

const getAuthTypeDisplay = (authType: AuthType) => {
  switch (authType) {
    case "OAUTH":
      return {
        type: "OAuth",
        color: "text-green-800",
        bgColor: "bg-green-100",
      };
    case "API_KEY":
      return {
        type: "API Key",
        color: "text-blue-800",
        bgColor: "bg-blue-100",
      };
    case "NONE":
    default:
      return {
        type: "設定不要",
        color: "text-purple-800",
        bgColor: "bg-purple-100",
      };
  }
};

export const AuthTypeBadge = ({ authType }: AuthTypeBadgeProps) => {
  const authInfo = getAuthTypeDisplay(authType);

  return (
    <Badge
      variant="secondary"
      className={`px-2 py-1 text-xs ${authInfo.color} ${authInfo.bgColor} border-0`}
    >
      {authInfo.type}
    </Badge>
  );
};
