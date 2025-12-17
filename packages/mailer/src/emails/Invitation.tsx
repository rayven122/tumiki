import type { ReactElement } from "react";
import { Img, Section, Text } from "@react-email/components";

import { Button } from "./components/Button.js";
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
}: InvitationProps): ReactElement => {
  const previewText = `${appName}チームへのご招待`;

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
        <Text style={heroTitle}>🎉 チームへのご招待</Text>
        <Text style={heroSubtitle}>
          {appName}チームにメンバーとして招待されました
        </Text>
      </Section>

      {/* Main Content */}
      <Section style={mainContent}>
        {name && (
          <Text style={greeting}>
            <span style={highlightText}>{name} 様</span>
          </Text>
        )}
        <Text style={paragraph}>
          {appName}
          チームに参加いただくことで、チームメンバーとともにMCPサーバーを共同管理できるようになります。
        </Text>
        <Text style={paragraph}>
          チームに参加すると、以下のことができるようになります：
        </Text>
        <Section style={featureList}>
          <Text style={featureItem}>
            <span style={featureBullet}>■</span> MCPサーバーの共同管理
          </Text>
          <Text style={featureItem}>
            <span style={featureBullet}>■</span> チームメンバーとの協働作業
          </Text>
          <Text style={featureItem}>
            <span style={featureBullet}>■</span> ツール統合の共有
          </Text>
        </Section>
        <Text style={paragraph}>
          以下のボタンをクリックして、チームに参加してください。
        </Text>
      </Section>

      {/* CTA Section */}
      <Section style={ctaSection}>
        <Button href={inviteUrl} variant="primary">
          チームに参加する
        </Button>
        {expiresAt && (
          <Text style={expiryNote}>招待の有効期限: {expiresAt}</Text>
        )}
      </Section>

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

const featureList = {
  backgroundColor: "#f8fafc",
  padding: "20px",
  border: "2px solid #e5e7eb",
  margin: "16px 0",
};

const featureItem = {
  fontSize: "16px",
  fontWeight: "400",
  margin: "8px 0",
  color: "#374151",
  lineHeight: "1.5",
};

const featureBullet = {
  fontWeight: "900",
  marginRight: "8px",
  color: "#000000",
};

const ctaSection = {
  backgroundColor: "#f8fafc",
  padding: "30px 20px",
  border: "2px solid #000000",
  textAlign: "center" as const,
  margin: "20px 0",
};

const expiryNote = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "16px 0 0 0",
  fontStyle: "italic",
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

export default Invitation;
