import { getProfileState } from "./profile-store";

export const resolveByProfile = async <T>(handlers: {
  personal: () => Promise<T>;
  organization: () => Promise<T>;
}): Promise<T> => {
  const { activeProfile } = await getProfileState();
  if (activeProfile === "organization") {
    return handlers.organization();
  }
  return handlers.personal();
};
