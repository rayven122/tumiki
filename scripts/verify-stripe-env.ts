#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "path";

// .envファイルを読み込む
config({ path: resolve(process.cwd(), ".env") });

const requiredEnvVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

const errors: string[] = [];

// 必須の環境変数をチェック
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    errors.push(`❌ Missing required environment variable: ${varName}`);
  } else {
    console.log(`✅ ${varName} is set`);
  }
});

// Stripeキーのフォーマットを検証
if (process.env.STRIPE_SECRET_KEY) {
  if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
    errors.push('❌ STRIPE_SECRET_KEY should start with "sk_"');
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.STRIPE_SECRET_KEY.includes("test")
  ) {
    errors.push("⚠️  Warning: Using test Stripe key in production environment");
  }
}

if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_")) {
    errors.push('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with "pk_"');
  }
}

if (process.env.STRIPE_WEBHOOK_SECRET) {
  if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
    errors.push('❌ STRIPE_WEBHOOK_SECRET should start with "whsec_"');
  }
}

// サマリー
if (errors.length > 0) {
  console.error("\n🚨 Environment validation failed:");
  errors.forEach((error) => console.error(error));
  console.error("\nPlease add these variables to your .env file");
  process.exit(1);
} else {
  console.log("\n✅ All Stripe environment variables are properly configured!");
  
  // 開発環境での警告
  if (process.env.NODE_ENV !== "production") {
    console.log("⚠️  Using development/test Stripe keys");
  }
}