import type { ReactElement } from "react";
import { Img, Section, Text } from "@react-email/components";

import { Button } from "./components/Button.js";
import { Layout } from "./components/Layout.js";

interface WaitingListConfirmationENProps {
  name?: string;
  confirmUrl?: string;
  appName?: string;
}

export const WaitingListConfirmationEN = ({
  name = "John Doe",
  confirmUrl = "https://tumiki.app",
  appName = "Tumiki",
}: WaitingListConfirmationENProps): ReactElement => {
  const previewText = `${appName} - Early Access Registration Complete`;

  return (
    <Layout appName={appName} previewText={previewText}>
      {/* Simplified Hero Header */}
      <Section style={heroHeader}>
        <Img
          src="https://tumiki.cloud/favicon/logo.svg"
          alt="Tumiki Logo"
          width="60"
          height="60"
          style={logoImage}
        />
        <Text style={heroTitle}>🎉 Early Access Registration Complete!</Text>
        <Text style={heroSubtitle}>
          Thank you for joining the AI block revolution
        </Text>
      </Section>

      {/* Main Content - Simplified */}
      <Section style={mainContent}>
        {name && (
          <Text style={greeting}>
            <span style={highlightText}>Dear {name},</span>
          </Text>
        )}
        <Text style={paragraph}>
          Thank you for registering for {appName} early access.
        </Text>
        <Text style={paragraph}>
          <span style={highlightText}>The AI block revolution</span> is about to
          begin. We're building a unified platform that integrates multiple MCP
          servers, enabling AI models to access more tools and data sources than
          ever before.
        </Text>
        <Text style={paragraph}>
          We'll send you a priority invitation email when the service launches.
          Please stay tuned!
        </Text>
      </Section>

      {/* Simplified CTA */}
      <Section style={ctaSection}>
        <Button href={confirmUrl} variant="primary">
          Visit Tumiki Website
        </Button>
      </Section>

      {/* Simple Footer */}
      <Section style={footerSection}>
        <Text style={footerText}>
          If you have any questions or inquiries, please feel free to contact
          us.
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

export default WaitingListConfirmationEN;
