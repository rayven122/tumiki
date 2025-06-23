import { Section, Text } from "@react-email/components";

import { Button } from "./components/Button.js";
import { Header } from "./components/Header.js";
import { Layout } from "./components/Layout.js";

interface WaitingListConfirmationProps {
  name?: string;
  confirmUrl?: string;
  appName?: string;
}

export const WaitingListConfirmation = ({
  name = "田中太郎",
  confirmUrl = "https://tumiki.app/confirm?token=abc123",
  appName = "Tumiki",
}: WaitingListConfirmationProps) => {
  const previewText = `${appName} - Waiting List登録確認`;

  return (
    <Layout appName={appName} previewText={previewText}>
      <Header
        title={appName}
        subtitle="Waiting List登録ありがとうございます"
        gradient="blue"
      />

      <Section style={content}>
        <Text style={heading}>登録確認のお願い</Text>
        {name && <Text style={greeting}>{name} 様</Text>}
        <Text style={paragraph}>
          {appName}のWaiting Listにご登録いただき、ありがとうございます。
        </Text>
        <Text style={paragraph}>
          以下のボタンをクリックして、登録を完了してください：
        </Text>
        <Section style={buttonContainer}>
          <Button href={confirmUrl} variant="primary">
            登録を確認する
          </Button>
        </Section>
        <Text style={note}>このリンクの有効期限は24時間です。</Text>
      </Section>
    </Layout>
  );
};

const content = {
  backgroundColor: "#f8fafc",
  padding: "30px",
  borderRadius: "8px",
  marginBottom: "30px",
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
  margin: "16px 0 0 0",
};

export default WaitingListConfirmation;
