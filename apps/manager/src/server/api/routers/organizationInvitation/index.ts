import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { createInvitation } from "./create";
import { getInvitationsByOrganization } from "./getByOrganization";
import { cancelInvitation } from "./cancel";
import { acceptInvitation } from "./accept";
import { validateToken } from "./validateToken";
import { resendInvitation } from "./resend";
import {
  CreateInvitationInput,
  GetInvitationsByOrganizationInput,
  CancelInvitationInput,
  AcceptInvitationInput,
  ValidateTokenInput,
  ResendInvitationInput,
} from "./schemas";

export const organizationInvitationRouter = createTRPCRouter({
  // 招待作成（認証必須）
  create: protectedProcedure
    .input(CreateInvitationInput)
    .mutation(createInvitation),

  // 組織の招待一覧取得（認証必須）
  getByOrganization: protectedProcedure
    .input(GetInvitationsByOrganizationInput)
    .query(getInvitationsByOrganization),

  // 招待キャンセル（認証必須）
  cancel: protectedProcedure
    .input(CancelInvitationInput)
    .mutation(cancelInvitation),

  // 招待受諾（認証必須）
  accept: protectedProcedure
    .input(AcceptInvitationInput)
    .mutation(acceptInvitation),

  // 招待トークン検証（公開エンドポイント - ログイン前でも使用可能）
  validateToken: publicProcedure
    .input(ValidateTokenInput)
    .query(validateToken),

  // 招待再送（認証必須）
  resend: protectedProcedure
    .input(ResendInvitationInput)
    .mutation(resendInvitation),
});