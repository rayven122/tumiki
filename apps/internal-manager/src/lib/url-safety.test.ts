import { expect, test } from "vitest";
import {
  isHttpUrl,
  isLocalOrPublicHttpUrl,
  isResolvedLocalOrPublicHttpUrl,
} from "./url-safety";

test("httpとhttpsのURLのみ許可する", () => {
  expect(isHttpUrl("http://localhost:9000")).toStrictEqual(true);
  expect(isHttpUrl("https://storage.example.com")).toStrictEqual(true);
  expect(isHttpUrl("ftp://storage.example.com")).toStrictEqual(false);
  expect(isHttpUrl("not-url")).toStrictEqual(false);
});

test("localhostはローカル検証用に許可する", () => {
  expect(isLocalOrPublicHttpUrl("http://localhost:9000")).toStrictEqual(true);
  expect(isLocalOrPublicHttpUrl("http://127.0.0.1:9000")).toStrictEqual(true);
  expect(isLocalOrPublicHttpUrl("http://[::1]:9000")).toStrictEqual(true);
});

test("内部IPv4アドレスは拒否する", () => {
  expect(isLocalOrPublicHttpUrl("http://10.0.0.1")).toStrictEqual(false);
  expect(isLocalOrPublicHttpUrl("http://100.64.0.1")).toStrictEqual(false);
  expect(isLocalOrPublicHttpUrl("http://198.18.0.1")).toStrictEqual(false);
  expect(isLocalOrPublicHttpUrl("http://198.51.100.1")).toStrictEqual(false);
  expect(isLocalOrPublicHttpUrl("http://203.0.113.1")).toStrictEqual(false);
  expect(isLocalOrPublicHttpUrl("http://169.254.169.254")).toStrictEqual(false);
  expect(isLocalOrPublicHttpUrl("http://172.16.0.1")).toStrictEqual(false);
  expect(isLocalOrPublicHttpUrl("http://192.168.0.1")).toStrictEqual(false);
});

test("内部IPv6アドレスは拒否する", () => {
  expect(isLocalOrPublicHttpUrl("http://[fc00::1]")).toStrictEqual(false);
  expect(isLocalOrPublicHttpUrl("http://[fd00::1]")).toStrictEqual(false);
  expect(isLocalOrPublicHttpUrl("http://[fe80::1]")).toStrictEqual(false);
});

test("公開HTTP URLは許可する", () => {
  expect(isLocalOrPublicHttpUrl("https://storage.example.com")).toStrictEqual(
    true,
  );
});

test("DNS解決後に内部IPを指すURLは拒否する", async () => {
  await expect(
    isResolvedLocalOrPublicHttpUrl("http://localhost:9000"),
  ).resolves.toStrictEqual(true);
  await expect(
    isResolvedLocalOrPublicHttpUrl("http://10.0.0.1"),
  ).resolves.toStrictEqual(false);
});
