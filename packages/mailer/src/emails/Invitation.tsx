import { Section, Text } from "@react-email/components";

import { Button } from "./components/Button.js";
import { Header } from "./components/Header.js";
import { Layout } from "./components/Layout.js";

interface InvitationProps {
  name?: string;
  inviteUrl?: string;
  appName?: string;
  expiresAt?: string;
}

export const Invitation = ({
  name = "田中太郎",
  inviteUrl = "https://tumiki.app/invite?token=xyz789",
  appName = "Tumiki",
  expiresAt = "2024-12-31 23:59:59",
}: InvitationProps) => {
  const previewText = `🎉 ${appName}へのご招待`;

  return (
    <Layout appName={appName} previewText={previewText}>
      <Header
        title="🎉 おめでとうございます！"
        subtitle={`${appName}をご利用いただけるようになりました`}
        gradient="green"
      />

      <Section style={content}>
        <Text style={heading}>サービス開始のご案内</Text>
        {name && <Text style={greeting}>{name} 様</Text>}
        <Text style={paragraph}>
          お待たせいたしました！{appName}
          のサービスをご利用いただけるようになりました。
        </Text>
        <Text style={paragraph}>
          以下のボタンをクリックして、今すぐ始めましょう：
        </Text>
        <Section style={buttonContainer}>
          <Button href={inviteUrl} variant="success">
            今すぐ始める
          </Button>
        </Section>
        {expiresAt && <Text style={note}>この招待の有効期限: {expiresAt}</Text>}
        <Text style={support}>
          ご質問がございましたら、お気軽にお問い合わせください。
        </Text>
      </Section>
    </Layout>
  );
};

const content = {
  backgroundColor: "#f0fdf4",
  padding: "30px",
  borderRadius: "8px",
  marginBottom: "30px",
  borderLeft: "4px solid #10b981",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px 0",
  color: "#1f2937",
};

const greeting = {
  fontSize: "18px",
  margin: "0 0 16px 0",
  color: "#374151",
};

const paragraph = {
  fontSize: "16px",
  margin: "0 0 16px 0",
  color: "#374151",
  lineHeight: "1.6",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const note = {
  fontSize: "14px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "16px 0",
};

const support = {
  fontSize: "14px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "24px 0 0 0",
};

export default Invitation;
