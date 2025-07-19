import { config } from "dotenv";
import { resolve } from "path";

// .envファイルを読み込む
config({ path: resolve(process.cwd(), ".env") });

const requiredEnvVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PUBLISHABLE_KEY",
] as const;

const verifyStripeEnv = () => {
  const missingVars: string[] = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.error("❌ Missing required Stripe environment variables:");
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error("\nPlease add these variables to your .env file");
    process.exit(1);
  }

  console.log("✅ All required Stripe environment variables are set");
  
  // 開発環境での警告
  if (process.env.NODE_ENV !== "production") {
    console.log("⚠️  Using development/test Stripe keys");
  }
};

verifyStripeEnv();