import { Section, Text } from "@react-email/components";

import { Button } from "./components/Button.js";
import { Layout } from "./components/Layout.js";

interface WaitingListConfirmationProps {
  name?: string;
  confirmUrl?: string;
  appName?: string;
}

export const WaitingListConfirmation = ({
  name = "田中太郎",
  confirmUrl = "https://tumiki.app/jp",
  appName = "Tumiki",
}: WaitingListConfirmationProps) => {
  const previewText = `${appName} - 早期アクセス登録完了`;

  return (
    <Layout appName={appName} previewText={previewText}>
      {/* Simplified Hero Header */}
      <Section style={heroHeader}>
        <Text style={logoLine}>
          <span style={logoStyle}>■</span>
          <span style={brandName}>Tumiki</span>
          <span style={betaLabel}>BETA</span>
        </Text>
        <Text style={heroTitle}>🎉 早期アクセス登録完了！</Text>
        <Text style={heroSubtitle}>
          AIブロックの革命に参加いただき、ありがとうございます
        </Text>
      </Section>

      {/* Main Content - Simplified */}
      <Section style={mainContent}>
        {name && (
          <Text style={greeting}>
            <span style={highlightText}>{name} 様</span>
          </Text>
        )}
        <Text style={paragraph}>
          {appName}の早期アクセスにご登録いただき、ありがとうございます。
        </Text>
        <Text style={paragraph}>
          <span style={highlightText}>AIブロックの革命</span>
          が始まります。複数のMCPサーバーを統合し、AIモデルがより多くのツールやデータソースにアクセスできる世界を実現します。
        </Text>
        <Text style={paragraph}>
          サービス開始時に優先的にご招待メールをお送りいたします。それまで今しばらくお待ちください。
        </Text>
      </Section>

      {/* Simplified CTA */}
      <Section style={ctaSection}>
        <Button href={confirmUrl} variant="primary">
          Tumikiサイトを見る
        </Button>
      </Section>

      {/* Simple Footer */}
      <Section style={footerSection}>
        <Text style={footerText}>
          ご質問やお問い合わせがございましたら、お気軽にご連絡ください。
        </Text>
        <Text style={decorativeLine}>■ ■ ■</Text>
      </Section>
    </Layout>
  );
};

// Simplified Styles - Reduced nesting and complexity
const heroHeader = {
  backgroundColor: "#ffffff",
  padding: "30px 20px",
  borderBottom: "3px solid #000000",
  textAlign: "center" as const,
};

const logoLine = {
  marginBottom: "20px",
  textAlign: "center" as const,
};

const logoStyle = {
  fontSize: "24px",
  fontWeight: "900",
  color: "#000000",
  backgroundColor: "#ffffff",
  padding: "6px 10px",
  border: "2px solid #000000",
  marginRight: "10px",
};

const brandName = {
  fontSize: "20px",
  fontWeight: "900",
  color: "#000000",
  letterSpacing: "1px",
  marginRight: "8px",
};

const betaLabel = {
  fontSize: "10px",
  fontWeight: "900",
  color: "#ffffff",
  backgroundColor: "#000000",
  padding: "3px 6px",
  letterSpacing: "1px",
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

export default WaitingListConfirmation;
