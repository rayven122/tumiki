/** DB には EXPIRED を持たず expiresAt で動的判定するため、API 返却時に付与するヘルパー */
export const computeStatus = (license: {
  status: "ACTIVE" | "REVOKED";
  expiresAt: Date;
}): "ACTIVE" | "REVOKED" | "EXPIRED" => {
  if (license.status === "REVOKED") return "REVOKED";
  if (license.expiresAt < new Date()) return "EXPIRED";
  return "ACTIVE";
};
