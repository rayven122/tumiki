import { generateKeyPairSync, randomBytes } from "node:crypto";

// このスクリプトの出力には秘密鍵が含まれるため、CIログや共有ログへ保存しない。
const secretKey = randomBytes(32).toString("base64url");
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  privateKeyEncoding: {
    format: "pem",
    type: "pkcs8",
  },
});

const encodedPrivateKey = Buffer.from(privateKey, "utf-8").toString("base64");

console.error(
  "この出力には秘密鍵が含まれます。CIログや共有ログへ保存しないでください。",
);
process.stdout.write(`# Internal Manager required secrets
TUMIKI_INTERNAL_MANAGER_SECRET_KEY=${secretKey}
TUMIKI_INTERNAL_MANAGER_OIDC_PRIVATE_KEY=${encodedPrivateKey}
`);
