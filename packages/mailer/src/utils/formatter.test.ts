import { describe, expect, test } from "vitest";

import { escapeHtml, formatDateJa, htmlToPlainText } from "./formatter";

describe("formatDateJa", () => {
  test("正常系: 通常の日付をフォーマットする", () => {
    const date = new Date("2024-03-15T14:30:00");
    const result = formatDateJa(date);
    expect(result).toStrictEqual("2024年3月15日 14:30");
  });

  test("正常系: 年末の日付をフォーマットする", () => {
    const date = new Date("2023-12-31T23:59:00");
    const result = formatDateJa(date);
    expect(result).toStrictEqual("2023年12月31日 23:59");
  });

  test("正常系: 年始の日付をフォーマットする", () => {
    const date = new Date("2024-01-01T00:00:00");
    const result = formatDateJa(date);
    expect(result).toStrictEqual("2024年1月1日 00:00");
  });

  test("正常系: 午前0時をフォーマットする", () => {
    const date = new Date("2024-05-20T00:00:00");
    const result = formatDateJa(date);
    expect(result).toStrictEqual("2024年5月20日 00:00");
  });

  test("正常系: 午後11時59分をフォーマットする", () => {
    const date = new Date("2024-05-20T23:59:00");
    const result = formatDateJa(date);
    expect(result).toStrictEqual("2024年5月20日 23:59");
  });

  test("正常系: 一桁の月日をフォーマットする", () => {
    const date = new Date("2024-03-05T09:05:00");
    const result = formatDateJa(date);
    expect(result).toStrictEqual("2024年3月5日 09:05");
  });

  test("境界値: うるう年の2月29日をフォーマットする", () => {
    const date = new Date("2024-02-29T12:00:00");
    const result = formatDateJa(date);
    expect(result).toStrictEqual("2024年2月29日 12:00");
  });

  test("境界値: 月末最終日をフォーマットする", () => {
    const date = new Date("2024-04-30T18:45:00");
    const result = formatDateJa(date);
    expect(result).toStrictEqual("2024年4月30日 18:45");
  });
});

describe("escapeHtml", () => {
  test("正常系: HTMLタグを含む文字列をエスケープする", () => {
    const input = '<div class="test">Hello</div>';
    const result = escapeHtml(input);
    expect(result).toStrictEqual(
      "&lt;div class=&quot;test&quot;&gt;Hello&lt;/div&gt;",
    );
  });

  test("正常系: アンパサンドを含む文字列をエスケープする", () => {
    const input = "Tom & Jerry";
    const result = escapeHtml(input);
    expect(result).toStrictEqual("Tom &amp; Jerry");
  });

  test("正常系: シングルクォートを含む文字列をエスケープする", () => {
    const input = "It's a test";
    const result = escapeHtml(input);
    expect(result).toStrictEqual("It&#039;s a test");
  });

  test("正常系: 全ての特殊文字を含む文字列をエスケープする", () => {
    const input = "&<>\"'";
    const result = escapeHtml(input);
    expect(result).toStrictEqual("&amp;&lt;&gt;&quot;&#039;");
  });

  test("正常系: 特殊文字を含まない文字列はそのまま返す", () => {
    const input = "Hello World 123";
    const result = escapeHtml(input);
    expect(result).toStrictEqual("Hello World 123");
  });

  test("境界値: 空文字列を処理する", () => {
    const input = "";
    const result = escapeHtml(input);
    expect(result).toStrictEqual("");
  });

  test("正常系: 日本語を含む文字列を処理する", () => {
    const input = "こんにちは<br>世界";
    const result = escapeHtml(input);
    expect(result).toStrictEqual("こんにちは&lt;br&gt;世界");
  });

  test("正常系: 複数の同じ特殊文字を含む文字列をエスケープする", () => {
    const input = "<<div>>&&</div>>";
    const result = escapeHtml(input);
    expect(result).toStrictEqual(
      "&lt;&lt;div&gt;&gt;&amp;&amp;&lt;/div&gt;&gt;",
    );
  });

  test("正常系: スクリプトタグを含む文字列をエスケープする", () => {
    const input = '<script>alert("XSS")</script>';
    const result = escapeHtml(input);
    expect(result).toStrictEqual(
      "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;",
    );
  });
});

describe("htmlToPlainText", () => {
  test("正常系: HTMLタグを除去する", () => {
    const input = "<p>Hello <strong>World</strong></p>";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("Hello World");
  });

  test("正常系: &nbsp;を空白に変換する", () => {
    const input = "Hello&nbsp;World";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("Hello World");
  });

  test("正常系: HTMLエンティティを元の文字に変換する", () => {
    const input = "&amp;&lt;&gt;&quot;&#039;";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("&<>\"'");
  });

  test("正常系: ネストしたHTMLタグを除去する", () => {
    const input = "<div><p>Hello <span><strong>World</strong></span></p></div>";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("Hello World");
  });

  test("正常系: 自己完結型タグを除去する", () => {
    const input = 'Hello<br/>World<img src="test.jpg" />';
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("HelloWorld");
  });

  test("正常系: 属性を持つタグを除去する", () => {
    const input = '<a href="https://example.com" class="link">Click here</a>';
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("Click here");
  });

  test("境界値: 空文字列を処理する", () => {
    const input = "";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("");
  });

  test("正常系: タグのみの文字列を処理する", () => {
    const input = "<div><span></span></div>";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("");
  });

  test("正常系: エンティティのみの文字列を処理する", () => {
    const input = "&nbsp;&amp;&lt;&gt;";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual(" &<>");
  });

  test("正常系: 通常のテキストのみの文字列はそのまま返す", () => {
    const input = "Hello World 123";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("Hello World 123");
  });

  test("正常系: 複数の&nbsp;を処理する", () => {
    const input = "Hello&nbsp;&nbsp;&nbsp;World";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("Hello   World");
  });

  test("正常系: スクリプトタグを除去する（内容は残る）", () => {
    const input = 'Hello<script>alert("test")</script>World';
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual('Helloalert("test")World');
  });

  test("正常系: スタイルタグを除去する（内容は残る）", () => {
    const input = "Hello<style>body { color: red; }</style>World";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("Hellobody { color: red; }World");
  });

  test("正常系: コメントを除去する", () => {
    const input = "Hello<!-- comment -->World";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("HelloWorld");
  });

  test("正常系: 改行を含むHTMLを処理する", () => {
    const input = `<p>Hello</p>
<p>World</p>`;
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual(`Hello
World`);
  });

  test("正常系: 日本語を含むHTMLを処理する", () => {
    const input = "<p>こんにちは<strong>世界</strong></p>";
    const result = htmlToPlainText(input);
    expect(result).toStrictEqual("こんにちは世界");
  });
});
