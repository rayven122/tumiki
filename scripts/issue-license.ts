#!/usr/bin/env node
/**
 * Tumiki Cloud API のライセンスキーを発行する CLI
 *
 * 使用方法:
 *   tsx scripts/issue-license.ts \
 *     --sub user_abc \
 *     --type personal \
 *     --features dynamic-search \
 *     --ttl 90d \
 *     --plan pro \
 *     --private-key ./bootstrap_private.pem
 *
 * 出力:
 *   tumiki_lic_eyJhbGc...
 */

import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";

import { importPKCS8, SignJWT } from "jose";

const LICENSE_KEY_PREFIX = "tumiki_lic_";
const LICENSE_JWT_ISSUER = "tumiki-license";
const LICENSE_JWT_AUDIENCE = "tumiki-cloud-api";

type Args = {
  sub: string;
  type: "personal" | "tenant";
  features: string[];
  ttl: string;
  privateKeyPath: string;
  plan?: string;
  tenant?: string;
};

const printUsage = () => {
  console.error(`Usage: tsx scripts/issue-license.ts \\
  --sub <subject> \\
  --type <personal|tenant> \\
  --features <feat1,feat2,...> \\
  --ttl <duration like 90d, 1h> \\
  --private-key <path-to-pem> \\
  [--plan <plan-name>] \\
  [--tenant <tenant-id, only for type=tenant>]

Example:
  tsx scripts/issue-license.ts \\
    --sub user_abc \\
    --type personal \\
    --features dynamic-search \\
    --ttl 90d \\
    --plan pro \\
    --private-key ./bootstrap_private.pem`);
};

const parseArgs = (): Args => {
  const args: Partial<Args> = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key || !value) continue;

    switch (key) {
      case "--sub":
        args.sub = value;
        break;
      case "--type":
        if (value !== "personal" && value !== "tenant") {
          console.error(`Invalid --type: ${value}`);
          printUsage();
          exit(1);
        }
        args.type = value;
        break;
      case "--features":
        args.features = value.split(",").map((f) => f.trim());
        break;
      case "--ttl":
        args.ttl = value;
        break;
      case "--private-key":
        args.privateKeyPath = value;
        break;
      case "--plan":
        args.plan = value;
        break;
      case "--tenant":
        args.tenant = value;
        break;
      default:
        console.error(`Unknown argument: ${key}`);
        printUsage();
        exit(1);
    }
  }

  if (!args.sub || !args.type || !args.features || !args.ttl || !args.privateKeyPath) {
    console.error("Missing required arguments");
    printUsage();
    exit(1);
  }

  if (args.type === "tenant" && !args.tenant) {
    console.error("--tenant is required when --type=tenant");
    printUsage();
    exit(1);
  }

  return args as Args;
};

const main = async () => {
  const args = parseArgs();

  const privateKeyPem = readFileSync(args.privateKeyPath, "utf-8");

  // PKCS#1 形式（openssl genrsa の出力）の場合は分かりやすいエラーを出す
  if (privateKeyPem.includes("BEGIN RSA PRIVATE KEY")) {
    console.error(`Error: 秘密鍵が PKCS#1 形式です。jose は PKCS#8 を要求します。

PKCS#8 形式に変換してから再実行してください:
  openssl pkcs8 -topk8 -nocrypt -in ${args.privateKeyPath} -out license_private_pkcs8.pem

または、最初から PKCS#8 形式で生成する:
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out license_private.pem`);
    exit(1);
  }

  const privateKey = await importPKCS8(privateKeyPem, "RS256");

  const payload: Record<string, unknown> = {
    sub: args.sub,
    type: args.type,
    features: args.features,
  };
  if (args.tenant) payload.tenant = args.tenant;
  if (args.plan) payload.plan = args.plan;

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(LICENSE_JWT_ISSUER)
    .setAudience(LICENSE_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(args.ttl)
    .sign(privateKey);

  console.log(`${LICENSE_KEY_PREFIX}${jwt}`);
};

main().catch((err) => {
  console.error("Failed to issue license:", err);
  exit(1);
});
