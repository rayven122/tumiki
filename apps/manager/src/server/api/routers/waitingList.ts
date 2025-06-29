import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@tumiki/db";
import { TRPCError } from "@trpc/server";
import { createMailClient, sendWaitingListConfirmation } from "@tumiki/mailer";

const WAITING_LIST_MESSAGES = {
  SUCCESS: "Waiting Listへの登録が完了しました。確認メールをお送りしました。",
  DUPLICATE_EMAIL: "このメールアドレスは既に登録されています",
  REGISTRATION_FAILED: "登録に失敗しました。しばらく後に再試行してください。",
  EMAIL_SEND_FAILED: "メール送信に失敗しました:",
} as const;

const registerInputSchema = z.object({
  email: z.string().email("正しいメールアドレスを入力してください"),
  name: z.string().optional(),
  company: z.string().optional(),
  useCase: z.string().optional(),
  language: z.enum(["ja", "en"]).optional().default("ja"),
});

type RegisterInput = z.infer<typeof registerInputSchema>;

interface WaitingListResponse {
  success: boolean;
  message: string;
  id: string;
}

/**
 * メールクライアントを初期化する
 */
function initializeMailClient(): void {
  createMailClient({
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
    from: process.env.FROM_EMAIL ?? "",
  });
}

/**
 * 重複するメールアドレスをチェックする
 */
async function checkDuplicateEmail(email: string): Promise<void> {
  const existingEntry = await db.waitingList.findUnique({
    where: { email },
  });

  if (existingEntry) {
    throw new TRPCError({
      code: "CONFLICT",
      message: WAITING_LIST_MESSAGES.DUPLICATE_EMAIL,
    });
  }
}

/**
 * Waiting Listエントリを作成する
 */
async function createWaitingListEntry(input: RegisterInput) {
  return db.waitingList.create({
    data: {
      email: input.email,
      name: input.name,
      company: input.company,
      useCase: input.useCase,
    },
  });
}

/**
 * 確認メールを送信する
 */
async function sendConfirmationEmail(
  email: string,
  name?: string,
  language: "ja" | "en" = "ja",
): Promise<void> {
  try {
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.NEXTAUTH_URL
        : "http://localhost:3000";
    const confirmUrl = language === "ja" ? `${baseUrl}/jp` : `${baseUrl}`;

    await sendWaitingListConfirmation({
      email,
      name,
      confirmUrl,
      appName: "Tumiki",
      language,
    });
  } catch (emailError: unknown) {
    console.error(WAITING_LIST_MESSAGES.EMAIL_SEND_FAILED, emailError);
    // メール送信失敗でもユーザーには登録成功を返す
    // （グレースフルデグラデーション）
  }
}

/**
 * Waiting List登録のメイン処理
 */
async function registerToWaitingList(
  input: RegisterInput,
  language: "ja" | "en" = "ja",
): Promise<WaitingListResponse> {
  await checkDuplicateEmail(input.email);

  const waitingListEntry = await createWaitingListEntry(input);

  initializeMailClient();
  await sendConfirmationEmail(input.email, input.name, language);

  return {
    success: true,
    message: WAITING_LIST_MESSAGES.SUCCESS,
    id: waitingListEntry.id,
  };
}

export const waitingListRouter = createTRPCRouter({
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(async ({ input }): Promise<WaitingListResponse> => {
      try {
        return await registerToWaitingList(input, input.language);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Waiting List登録エラー:", error as Error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: WAITING_LIST_MESSAGES.REGISTRATION_FAILED,
        });
      }
    }),
});

export type { RegisterInput, WaitingListResponse };
