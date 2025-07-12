import { describe, test, expect } from "bun:test";
import { getRootDomain, extractDomainFromUrl, getFaviconUrls, getFaviconUrlsFromUrl } from "./faviconUtils";

describe("getRootDomain", () => {
  test("通常のサブドメインを正しく処理する", () => {
    expect(getRootDomain("api.example.com")).toStrictEqual("example.com");
    expect(getRootDomain("subdomain.github.com")).toStrictEqual("github.com");
    expect(getRootDomain("blog.company.org")).toStrictEqual("company.org");
  });

  test("複数部分TLDを正しく処理する", () => {
    expect(getRootDomain("api.example.co.jp")).toStrictEqual("example.co.jp");
    expect(getRootDomain("subdomain.example.com.au")).toStrictEqual("example.com.au");
    expect(getRootDomain("test.company.co.uk")).toStrictEqual("company.co.uk");
    expect(getRootDomain("api.v1.example.co.jp")).toStrictEqual("example.co.jp");
  });

  test("wwwサブドメインを保持する", () => {
    expect(getRootDomain("www.example.com")).toStrictEqual("www.example.com");
    expect(getRootDomain("www.example.co.jp")).toStrictEqual("www.example.co.jp");
  });

  test("IPv4アドレスをそのまま返す", () => {
    expect(getRootDomain("192.168.1.1")).toStrictEqual("192.168.1.1");
    expect(getRootDomain("10.0.0.1")).toStrictEqual("10.0.0.1");
    expect(getRootDomain("127.0.0.1")).toStrictEqual("127.0.0.1");
  });

  test("localhostをそのまま返す", () => {
    expect(getRootDomain("localhost")).toStrictEqual("localhost");
  });

  test("2つ以下の部分のドメインをそのまま返す", () => {
    expect(getRootDomain("example.com")).toStrictEqual("example.com");
    expect(getRootDomain("github.io")).toStrictEqual("github.io");
    expect(getRootDomain("localhost")).toStrictEqual("localhost");
  });

  test("複雑な複数部分TLDを処理する", () => {
    expect(getRootDomain("test.example.ac.jp")).toStrictEqual("example.ac.jp");
    expect(getRootDomain("api.company.gov.uk")).toStrictEqual("company.gov.uk");
    expect(getRootDomain("sub1.sub2.example.com.cn")).toStrictEqual("example.com.cn");
  });

  test("大文字小文字を正しく処理する", () => {
    expect(getRootDomain("API.EXAMPLE.CO.JP")).toStrictEqual("EXAMPLE.CO.JP");
    expect(getRootDomain("Subdomain.Example.Com")).toStrictEqual("Example.Com");
  });
});

describe("extractDomainFromUrl", () => {
  test("HTTPSのURLからドメインを抽出する", () => {
    expect(extractDomainFromUrl("https://api.example.com/path")).toStrictEqual("example.com");
    expect(extractDomainFromUrl("https://subdomain.github.com")).toStrictEqual("github.com");
  });

  test("HTTPのURLからドメインを抽出する", () => {
    expect(extractDomainFromUrl("http://api.example.com/path")).toStrictEqual("example.com");
  });

  test("プロトコルなしのURLからドメインを抽出する", () => {
    expect(extractDomainFromUrl("api.example.com")).toStrictEqual("example.com");
    expect(extractDomainFromUrl("subdomain.github.com/path")).toStrictEqual("github.com");
  });

  test("複数部分TLDのURLからドメインを抽出する", () => {
    expect(extractDomainFromUrl("https://api.example.co.jp")).toStrictEqual("example.co.jp");
    expect(extractDomainFromUrl("subdomain.company.com.au")).toStrictEqual("company.com.au");
  });

  test("ポート付きのURLからドメインを抽出する", () => {
    expect(extractDomainFromUrl("https://api.example.com:8080/path")).toStrictEqual("example.com");
    expect(extractDomainFromUrl("localhost:3000")).toStrictEqual("localhost");
  });

  test("無効なURLの場合nullを返す", () => {
    expect(extractDomainFromUrl("")).toStrictEqual(null);
    expect(extractDomainFromUrl("invalid-url")).toStrictEqual(null);
    expect(extractDomainFromUrl("://invalid")).toStrictEqual(null);
  });

  test("IPv4アドレスをそのまま返す", () => {
    expect(extractDomainFromUrl("https://192.168.1.1")).toStrictEqual("192.168.1.1");
    expect(extractDomainFromUrl("127.0.0.1:8080")).toStrictEqual("127.0.0.1");
  });

  test("wwwサブドメインを保持する", () => {
    expect(extractDomainFromUrl("https://www.example.com")).toStrictEqual("www.example.com");
    expect(extractDomainFromUrl("www.example.co.jp/path")).toStrictEqual("www.example.co.jp");
  });
});

describe("getFaviconUrls", () => {
  test("ドメインからファビコンURLの配列を生成する", () => {
    const urls = getFaviconUrls("example.com");
    expect(urls).toHaveLength(3);
    expect(urls[0]).toStrictEqual("https://www.google.com/s2/favicons?domain=example.com&sz=32");
    expect(urls[1]).toStrictEqual("https://example.com/favicon.ico");
    expect(urls[2]).toStrictEqual("https://icons.duckduckgo.com/ip3/example.com.ico");
  });

  test("カスタムサイズでファビコンURLを生成する", () => {
    const urls = getFaviconUrls("example.com", 64);
    expect(urls[0]).toStrictEqual("https://www.google.com/s2/favicons?domain=example.com&sz=64");
  });

  test("空のドメインの場合空配列を返す", () => {
    expect(getFaviconUrls("")).toStrictEqual([]);
    expect(getFaviconUrls(null as any)).toStrictEqual([]);
    expect(getFaviconUrls(undefined as any)).toStrictEqual([]);
  });
});

describe("getFaviconUrlsFromUrl", () => {
  test("URLからファビコンURLの配列を取得する", () => {
    const urls = getFaviconUrlsFromUrl("https://api.example.com");
    expect(urls).toHaveLength(3);
    expect(urls[0]).toStrictEqual("https://www.google.com/s2/favicons?domain=example.com&sz=32");
  });

  test("複数部分TLDのURLからファビコンURLを取得する", () => {
    const urls = getFaviconUrlsFromUrl("https://api.example.co.jp");
    expect(urls[0]).toStrictEqual("https://www.google.com/s2/favicons?domain=example.co.jp&sz=32");
  });

  test("無効なURLの場合空配列を返す", () => {
    expect(getFaviconUrlsFromUrl("")).toStrictEqual([]);
    expect(getFaviconUrlsFromUrl("invalid-url")).toStrictEqual([]);
  });

  test("カスタムサイズでファビコンURLを取得する", () => {
    const urls = getFaviconUrlsFromUrl("https://example.com", 64);
    expect(urls[0]).toStrictEqual("https://www.google.com/s2/favicons?domain=example.com&sz=64");
  });
});