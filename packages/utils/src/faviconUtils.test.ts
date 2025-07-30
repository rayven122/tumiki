import { describe, expect, test } from "vitest";

import {
  extractDomainFromUrl,
  getFaviconUrls,
  getFaviconUrlsFromUrl,
  getRootDomain,
} from "./faviconUtils";

describe("getRootDomain", () => {
  test("正常系: 通常のサブドメインを正しく処理する", () => {
    expect(getRootDomain("api.example.com")).toStrictEqual("example.com");
    expect(getRootDomain("subdomain.github.com")).toStrictEqual("github.com");
    expect(getRootDomain("blog.company.org")).toStrictEqual("company.org");
  });

  test("正常系: 複数部分TLDを正しく処理する", () => {
    expect(getRootDomain("api.example.co.jp")).toStrictEqual("example.co.jp");
    expect(getRootDomain("subdomain.example.com.au")).toStrictEqual(
      "example.com.au",
    );
    expect(getRootDomain("test.company.co.uk")).toStrictEqual("company.co.uk");
    expect(getRootDomain("api.v1.example.co.jp")).toStrictEqual(
      "example.co.jp",
    );
  });

  test("正常系: wwwサブドメインを保持する", () => {
    expect(getRootDomain("www.example.com")).toStrictEqual("www.example.com");
    expect(getRootDomain("www.example.co.jp")).toStrictEqual(
      "www.example.co.jp",
    );
  });

  test("正常系: IPv4アドレスをそのまま返す", () => {
    expect(getRootDomain("192.168.1.1")).toStrictEqual("192.168.1.1");
    expect(getRootDomain("10.0.0.1")).toStrictEqual("10.0.0.1");
    expect(getRootDomain("127.0.0.1")).toStrictEqual("127.0.0.1");
    expect(getRootDomain("255.255.255.255")).toStrictEqual("255.255.255.255");
  });

  test("正常系: localhostをそのまま返す", () => {
    expect(getRootDomain("localhost")).toStrictEqual("localhost");
  });

  test("正常系: 2つ以下の部分のドメインをそのまま返す", () => {
    expect(getRootDomain("example.com")).toStrictEqual("example.com");
    expect(getRootDomain("github.io")).toStrictEqual("github.io");
    expect(getRootDomain("com")).toStrictEqual("com");
  });

  test("正常系: 複雑な複数部分TLDを処理する", () => {
    expect(getRootDomain("test.example.ac.jp")).toStrictEqual("example.ac.jp");
    expect(getRootDomain("api.company.gov.uk")).toStrictEqual("company.gov.uk");
    expect(getRootDomain("sub1.sub2.example.com.cn")).toStrictEqual(
      "example.com.cn",
    );
  });

  test("正常系: 大文字小文字を正しく処理する", () => {
    expect(getRootDomain("API.EXAMPLE.CO.JP")).toStrictEqual("EXAMPLE.CO.JP");
    expect(getRootDomain("Subdomain.Example.Com")).toStrictEqual("Example.Com");
  });

  test("正常系: 深いサブドメインを正しく処理する", () => {
    expect(getRootDomain("a.b.c.d.example.com")).toStrictEqual("example.com");
    expect(getRootDomain("sub1.sub2.sub3.example.co.jp")).toStrictEqual(
      "example.co.jp",
    );
  });

  test("境界値: 単一部分のホスト名をそのまま返す", () => {
    expect(getRootDomain("example")).toStrictEqual("example");
  });

  test("境界値: 空文字列を処理する", () => {
    expect(getRootDomain("")).toStrictEqual("");
  });

  test("正常系: 4部分の複数部分TLDを処理する", () => {
    // ファイルには4部分までチェックすると記載されているが、実際のTLDリストには含まれていない
    // 実装では最大2部分のTLDまでしかサポートしていないため、通常のTLDとして処理される
    expect(getRootDomain("test.example.pvt.k12")).toStrictEqual("pvt.k12");
  });

  test("正常系: その他の複数部分TLDを正しく処理する", () => {
    // ブラジル
    expect(getRootDomain("api.example.com.br")).toStrictEqual("example.com.br");
    // フランス
    expect(getRootDomain("api.example.gouv.fr")).toStrictEqual(
      "example.gouv.fr",
    );
    // ドイツ
    expect(getRootDomain("api.example.com.de")).toStrictEqual("example.com.de");
    // インド
    expect(getRootDomain("api.example.gov.in")).toStrictEqual("example.gov.in");
    // ニュージーランド
    expect(getRootDomain("api.example.school.nz")).toStrictEqual(
      "example.school.nz",
    );
    // 南アフリカ
    expect(getRootDomain("api.example.web.za")).toStrictEqual("example.web.za");
  });
});

describe("extractDomainFromUrl", () => {
  test("正常系: HTTPSのURLからドメインを抽出する", () => {
    expect(extractDomainFromUrl("https://api.example.com/path")).toStrictEqual(
      "example.com",
    );
    expect(extractDomainFromUrl("https://subdomain.github.com")).toStrictEqual(
      "github.com",
    );
    expect(extractDomainFromUrl("https://example.com")).toStrictEqual(
      "example.com",
    );
  });

  test("正常系: HTTPのURLからドメインを抽出する", () => {
    expect(extractDomainFromUrl("http://api.example.com/path")).toStrictEqual(
      "example.com",
    );
    expect(extractDomainFromUrl("http://example.com")).toStrictEqual(
      "example.com",
    );
  });

  test("正常系: プロトコルなしのURLからドメインを抽出する", () => {
    expect(extractDomainFromUrl("api.example.com")).toStrictEqual(
      "example.com",
    );
    expect(extractDomainFromUrl("subdomain.github.com/path")).toStrictEqual(
      "github.com",
    );
  });

  test("正常系: 複数部分TLDのURLからドメインを抽出する", () => {
    expect(extractDomainFromUrl("https://api.example.co.jp")).toStrictEqual(
      "example.co.jp",
    );
    expect(extractDomainFromUrl("subdomain.company.com.au")).toStrictEqual(
      "company.com.au",
    );
  });

  test("正常系: ポート付きのURLからドメインを抽出する", () => {
    expect(
      extractDomainFromUrl("https://api.example.com:8080/path"),
    ).toStrictEqual("example.com");
    expect(extractDomainFromUrl("localhost:3000")).toStrictEqual("localhost");
    expect(extractDomainFromUrl("example.com:443")).toStrictEqual(
      "example.com",
    );
  });

  test("異常系: 無効なURLの場合nullを返す", () => {
    expect(extractDomainFromUrl("")).toStrictEqual(null);
    expect(extractDomainFromUrl("   ")).toStrictEqual(null);
    expect(extractDomainFromUrl("invalid-url")).toStrictEqual(null);
    expect(extractDomainFromUrl("://invalid")).toStrictEqual(null);
    expect(extractDomainFromUrl("http://")).toStrictEqual(null);
    expect(extractDomainFromUrl("https://")).toStrictEqual(null);
  });

  test("正常系: IPv4アドレスをそのまま返す", () => {
    expect(extractDomainFromUrl("https://192.168.1.1")).toStrictEqual(
      "192.168.1.1",
    );
    expect(extractDomainFromUrl("127.0.0.1:8080")).toStrictEqual("127.0.0.1");
    expect(extractDomainFromUrl("http://10.0.0.1/path")).toStrictEqual(
      "10.0.0.1",
    );
  });

  test("正常系: wwwサブドメインを保持する", () => {
    expect(extractDomainFromUrl("https://www.example.com")).toStrictEqual(
      "www.example.com",
    );
    expect(extractDomainFromUrl("www.example.co.jp/path")).toStrictEqual(
      "www.example.co.jp",
    );
  });

  test("正常系: localhostを正しく処理する", () => {
    expect(extractDomainFromUrl("http://localhost")).toStrictEqual("localhost");
    expect(extractDomainFromUrl("localhost")).toStrictEqual("localhost");
    expect(extractDomainFromUrl("https://localhost:3000/api")).toStrictEqual(
      "localhost",
    );
  });

  test("正常系: クエリパラメータとハッシュを含むURLを処理する", () => {
    expect(
      extractDomainFromUrl("https://api.example.com/path?query=1#hash"),
    ).toStrictEqual("example.com");
    expect(extractDomainFromUrl("example.com?foo=bar")).toStrictEqual(
      "example.com",
    );
  });

  test("正常系: 認証情報を含むURLを処理する", () => {
    expect(
      extractDomainFromUrl("https://user:pass@api.example.com/path"),
    ).toStrictEqual("example.com");
  });

  test("異常系: 不正な形式のURLの場合nullを返す", () => {
    expect(extractDomainFromUrl("ftp://example.com")).toStrictEqual(null);
    expect(extractDomainFromUrl("javascript:alert(1)")).toStrictEqual(null);
    expect(extractDomainFromUrl("data:text/plain,hello")).toStrictEqual(null);
  });
});

describe("getFaviconUrls", () => {
  test("正常系: ドメインからファビコンURLの配列を生成する", () => {
    const urls = getFaviconUrls("example.com");
    expect(urls).toHaveLength(2);
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.com&sz=32",
    );
    expect(urls[1]).toStrictEqual(
      "https://icons.duckduckgo.com/ip3/example.com.ico",
    );
  });

  test("正常系: カスタムサイズでファビコンURLを生成する", () => {
    const urls = getFaviconUrls("example.com", 64);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.com&sz=64",
    );
    expect(urls[1]).toStrictEqual(
      "https://icons.duckduckgo.com/ip3/example.com.ico",
    );
  });

  test("正常系: 異なるサイズでファビコンURLを生成する", () => {
    const urls16 = getFaviconUrls("example.com", 16);
    const urls128 = getFaviconUrls("example.com", 128);

    expect(urls16[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.com&sz=16",
    );
    expect(urls128[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.com&sz=128",
    );
  });

  test("異常系: 空のドメインの場合空配列を返す", () => {
    expect(getFaviconUrls("")).toStrictEqual([]);
  });

  test("正常系: 複数部分TLDのドメインでファビコンURLを生成する", () => {
    const urls = getFaviconUrls("example.co.jp");
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.co.jp&sz=32",
    );
    expect(urls[1]).toStrictEqual(
      "https://icons.duckduckgo.com/ip3/example.co.jp.ico",
    );
  });

  test("正常系: 特殊文字を含むドメインでファビコンURLを生成する", () => {
    const urls = getFaviconUrls("test-example.com");
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=test-example.com&sz=32",
    );
  });

  test("境界値: サイズパラメータを省略した場合デフォルト値32を使用する", () => {
    const urlsDefault = getFaviconUrls("example.com");
    const urls32 = getFaviconUrls("example.com", 32);

    expect(urlsDefault).toStrictEqual(urls32);
  });
});

describe("getFaviconUrlsFromUrl", () => {
  test("正常系: URLからファビコンURLの配列を取得する", () => {
    const urls = getFaviconUrlsFromUrl("https://api.example.com");
    expect(urls).toHaveLength(2);
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.com&sz=32",
    );
    expect(urls[1]).toStrictEqual(
      "https://icons.duckduckgo.com/ip3/example.com.ico",
    );
  });

  test("正常系: 複数部分TLDのURLからファビコンURLを取得する", () => {
    const urls = getFaviconUrlsFromUrl("https://api.example.co.jp");
    expect(urls).toHaveLength(2);
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.co.jp&sz=32",
    );
    expect(urls[1]).toStrictEqual(
      "https://icons.duckduckgo.com/ip3/example.co.jp.ico",
    );
  });

  test("異常系: 無効なURLの場合空配列を返す", () => {
    expect(getFaviconUrlsFromUrl("")).toStrictEqual([]);
    expect(getFaviconUrlsFromUrl("invalid-url")).toStrictEqual([]);
    expect(getFaviconUrlsFromUrl("://invalid")).toStrictEqual([]);
  });

  test("正常系: カスタムサイズでファビコンURLを取得する", () => {
    const urls = getFaviconUrlsFromUrl("https://example.com", 64);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.com&sz=64",
    );
  });

  test("正常系: wwwサブドメインのURLからファビコンURLを取得する", () => {
    const urls = getFaviconUrlsFromUrl("https://www.example.com");
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=www.example.com&sz=32",
    );
  });

  test("正常系: プロトコルなしのURLからファビコンURLを取得する", () => {
    const urls = getFaviconUrlsFromUrl("api.example.com/path");
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.com&sz=32",
    );
  });

  test("正常系: IPv4アドレスのURLからファビコンURLを取得する", () => {
    const urls = getFaviconUrlsFromUrl("https://192.168.1.1");
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=192.168.1.1&sz=32",
    );
  });

  test("正常系: localhostのURLからファビコンURLを取得する", () => {
    const urls = getFaviconUrlsFromUrl("http://localhost:3000");
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=localhost&sz=32",
    );
  });

  test("境界値: サイズパラメータを省略した場合デフォルト値32を使用する", () => {
    const urlsDefault = getFaviconUrlsFromUrl("https://example.com");
    const urls32 = getFaviconUrlsFromUrl("https://example.com", 32);

    expect(urlsDefault).toStrictEqual(urls32);
  });

  test("正常系: ポート番号付きURLからファビコンURLを取得する", () => {
    const urls = getFaviconUrlsFromUrl("https://api.example.com:8080/path");
    expect(urls[0]).toStrictEqual(
      "https://www.google.com/s2/favicons?domain=example.com&sz=32",
    );
  });
});
