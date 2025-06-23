import { Section, Text } from "@react-email/components";

interface HeaderProps {
  title: string;
  subtitle?: string;
  gradient?: "blue" | "green" | "purple";
}

export const Header = ({ title, subtitle, gradient = "blue" }: HeaderProps) => {
  return (
    <Section style={{ ...header, ...gradients[gradient] }}>
      <Text style={headerTitle}>{title}</Text>
      {subtitle && <Text style={headerSubtitle}>{subtitle}</Text>}
    </Section>
  );
};

const header = {
  padding: "40px 30px",
  borderRadius: "12px 12px 0 0",
  textAlign: "center" as const,
  marginBottom: "30px",
  color: "#ffffff",
};

const gradients = {
  blue: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  green: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  purple: {
    background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  },
};

const headerTitle = {
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
  color: "#ffffff",
};

const headerSubtitle = {
  fontSize: "18px",
  margin: "0",
  opacity: 0.9,
  color: "#ffffff",
};
