import { NextResponse } from "next/server";

import { contactFormSchema } from "@/lib/contact-validation";

const SLACK_WEBHOOK_URL = process.env.SLACK_CONTACT_WEBHOOK_URL;

export const POST = async (request: Request) => {
  const rawBody: unknown = await request.json();
  const parsed = contactFormSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に不備があります", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!SLACK_WEBHOOK_URL) {
    console.error("[Contact] SLACK_CONTACT_WEBHOOK_URL未設定");
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const body = parsed.data;

  const slackMessage = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📩 Tumiki お問い合わせ",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*氏名*\n${body.name}` },
          { type: "mrkdwn", text: `*メール*\n${body.email}` },
          { type: "mrkdwn", text: `*会社名*\n${body.company}` },
          {
            type: "mrkdwn",
            text: `*従業員数*\n${body.companySize ?? "未入力"}`,
          },
          { type: "mrkdwn", text: `*役職*\n${body.role ?? "未入力"}` },
          { type: "mrkdwn", text: `*相談内容*\n${body.interest ?? "未入力"}` },
        ],
      },
      ...(body.message
        ? [
            {
              type: "section",
              text: { type: "mrkdwn", text: `*詳細・ご質問*\n${body.message}` },
            },
          ]
        : []),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `送信日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });
    if (!res.ok) throw new Error(`Slack API error: ${res.status}`);
  } catch (err) {
    console.error("[Contact] Slack送信エラー:", err);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
};
