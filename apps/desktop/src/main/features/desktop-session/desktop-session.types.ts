import type { z } from "zod";
import type { desktopSessionSchema } from "./desktop-session.service";

export type DesktopSession = z.infer<typeof desktopSessionSchema>;
export type DesktopSessionUser = DesktopSession["user"];
export type DesktopSessionOrganization = DesktopSession["organization"];
export type DesktopSessionGroup = DesktopSession["groups"][number];
export type DesktopSessionPermission = DesktopSession["permissions"][number];
export type DesktopSessionFeatures = DesktopSession["features"];
