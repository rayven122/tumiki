import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface LayoutProps {
  children: ReactNode;
  appName?: string;
  previewText?: string;
}

export const Layout = ({
  children,
  appName = "Tumiki",
  previewText,
}: LayoutProps) => {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={main}>
        <Container style={container}>
          {children}
          <Section style={footer}>
            <Text style={footerText}>このメールは自動送信されています。</Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} {appName}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  lineHeight: 1.6,
  color: "#333333",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const footer = {
  textAlign: "center" as const,
  marginTop: "32px",
  paddingTop: "24px",
  borderTop: "1px solid #e6ebf1",
};

const footerText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "4px 0",
};
