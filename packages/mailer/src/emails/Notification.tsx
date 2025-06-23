import { Section, Text } from "@react-email/components";

import { Button } from "./components/Button.js";
import { Header } from "./components/Header.js";
import { Layout } from "./components/Layout.js";

interface NotificationProps {
  title?: string;
  name?: string;
  message?: string;
  actionUrl?: string;
  actionText?: string;
  appName?: string;
}

export const Notification = ({
  title = "重要なお知らせ",
  name = "田中太郎",
  message = "システムメンテナンスのお知らせです。<br />詳細につきましては、下記ボタンより確認してください。",
  actionUrl = "https://tumiki.app/maintenance",
  actionText = "詳細を確認",
  appName = "Tumiki",
}: NotificationProps) => {
  return (
    <Layout appName={appName} previewText={title}>
      <Header title={title} gradient="purple" />

      <Section style={content}>
        {name && <Text style={greeting}>{name} 様</Text>}
        <div dangerouslySetInnerHTML={{ __html: message }} style={paragraph} />
        {actionUrl && actionText && (
          <Section style={buttonContainer}>
            <Button href={actionUrl} variant="primary">
              {actionText}
            </Button>
          </Section>
        )}
      </Section>
    </Layout>
  );
};

const content = {
  backgroundColor: "#ffffff",
  padding: "30px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  marginBottom: "30px",
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

export default Notification;
