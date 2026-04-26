import { z } from "zod";

/** フリーメールドメインリスト */
export const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.co.jp",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "outlook.jp",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "zoho.com",
  "ymail.com",
  "live.com",
  "live.jp",
  "msn.com",
  "googlemail.com",
] as const;

/** メールアドレスがフリーメールかどうか判定 */
export const isFreeEmail = (email: string): boolean => {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && FREE_EMAIL_DOMAINS.some((d) => domain === d);
};

/** お問い合わせフォームのバリデーションスキーマ */
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, "氏名は必須です")
    .max(100, "氏名は100文字以内で入力してください"),
  email: z
    .string()
    .min(1, "メールアドレスは必須です")
    .email("有効なメールアドレスを入力してください")
    .max(255, "メールアドレスは255文字以内で入力してください")
    .refine((val) => !isFreeEmail(val), {
      message: "法人メールアドレスをご入力ください",
    }),
  company: z
    .string()
    .min(1, "会社名は必須です")
    .max(200, "会社名は200文字以内で入力してください"),
  companySize: z
    .string()
    .max(50, "従業員数は50文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  role: z
    .string()
    .max(100, "役職は100文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  interest: z
    .string()
    .min(1, "ご相談内容は必須です")
    .max(100, "ご相談内容は100文字以内で入力してください"),
  message: z
    .string()
    .max(2000, "詳細・ご質問は2000文字以内で入力してください")
    .optional()
    .or(z.literal("")),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
