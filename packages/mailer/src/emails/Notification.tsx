import type { ReactElement } from "react";
import { Img, Section, Text } from "@react-email/components";

import { Button } from "./components/Button.js";
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
}: NotificationProps): ReactElement => {
  const previewText = title;

  return (
    <Layout appName={appName} previewText={previewText}>
      {/* Hero Header */}
      <Section style={heroHeader}>
        <Img
          src="https://tumiki.cloud/favicon/logo.svg"
          alt="Tumiki Logo"
          width="60"
          height="60"
          style={logoImage}
        />
        <Text style={heroTitle}>📢 {title}</Text>
        <Text style={heroSubtitle}>Tumikiからのお知らせ</Text>
      </Section>

      {/* Main Content */}
      <Section style={mainContent}>
        {name && (
          <Text style={greeting}>
            <span style={highlightText}>{name} 様</span>
          </Text>
        )}
        <div dangerouslySetInnerHTML={{ __html: message }} style={paragraph} />
      </Section>

      {/* CTA Section */}
      {actionUrl && actionText && (
        <Section style={ctaSection}>
          <Button href={actionUrl} variant="primary">
            {actionText}
          </Button>
        </Section>
      )}

      {/* Footer */}
      <Section style={footerSection}>
        <Text style={footerText}>
          ご質問がございましたら、お気軽にお問い合わせください。
        </Text>
        <Text style={decorativeLine}>■ ■ ■</Text>
      </Section>
    </Layout>
  );
};

// Simplified Styles - Matching WaitingListConfirmation design
const heroHeader = {
  backgroundColor: "#ffffff",
  padding: "30px 20px",
  borderBottom: "3px solid #000000",
  textAlign: "center" as const,
};

const logoImage = {
  margin: "0 auto 20px",
  display: "block",
};

const heroTitle = {
  fontSize: "28px",
  fontWeight: "900",
  color: "#000000",
  margin: "15px 0",
  lineHeight: "1.2",
};

const heroSubtitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#374151",
  margin: "0",
  lineHeight: "1.4",
};

const mainContent = {
  backgroundColor: "#ffffff",
  padding: "30px 20px",
};

const greeting = {
  fontSize: "20px",
  fontWeight: "700",
  margin: "0 0 20px 0",
  color: "#000000",
  textAlign: "center" as const,
};

const highlightText = {
  backgroundColor: "#000000",
  color: "#ffffff",
  padding: "2px 6px",
  fontWeight: "700",
};

const paragraph = {
  fontSize: "16px",
  fontWeight: "400",
  margin: "0 0 16px 0",
  color: "#374151",
  lineHeight: "1.5",
};

const ctaSection = {
  backgroundColor: "#f8fafc",
  padding: "30px 20px",
  border: "2px solid #000000",
  textAlign: "center" as const,
  margin: "20px 0",
};

const footerSection = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  textAlign: "center" as const,
  borderTop: "1px solid #e5e7eb",
};

const footerText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 10px 0",
  fontStyle: "italic",
};

const decorativeLine = {
  fontSize: "14px",
  color: "#9ca3af",
  margin: "0",
  letterSpacing: "4px",
};

export default Notification;
