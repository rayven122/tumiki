/**
 * @vitest-environment jsdom
 */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { OAuthTokenExpirationDisplay } from "../UserMcpServerOAuthTokenExpirationDisplay";

// Reactをグローバルに設定（モック内で使用するため）
(globalThis as unknown as { React: typeof React }).React = React;

describe("OAuthTokenExpirationDisplay", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    // 現在時刻を固定: 2024-01-15 12:00:00
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("有効期限がnullの場合は何も表示しない", () => {
    const { container } = render(
      <OAuthTokenExpirationDisplay expiresAt={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("期限切れの場合は「期限切れ」と表示される", () => {
    // 過去の日付（期限切れ）
    const expiredDate = new Date("2024-01-14T12:00:00.000Z");

    render(<OAuthTokenExpirationDisplay expiresAt={expiredDate} />);

    expect(screen.getByText("OAuth")).toBeInTheDocument();
    expect(screen.getByText("期限切れ")).toBeInTheDocument();
  });

  test("残り5日以上の場合は緑色で表示される", () => {
    // 5日後
    const futureDate = new Date("2024-01-20T12:00:00.000Z");

    render(<OAuthTokenExpirationDisplay expiresAt={futureDate} />);

    expect(screen.getByText("OAuth")).toBeInTheDocument();
    expect(screen.getByText("残り5d")).toBeInTheDocument();
    // 緑色のバッジクラスが適用されていることを確認
    const badge = screen.getByText("残り5d");
    expect(badge).toHaveClass("bg-green-50");
  });

  test("残り3-4日の場合はオレンジ色で表示される", () => {
    // 4日後
    const futureDate = new Date("2024-01-19T12:00:00.000Z");

    render(<OAuthTokenExpirationDisplay expiresAt={futureDate} />);

    expect(screen.getByText("残り4d")).toBeInTheDocument();
    // オレンジ色のバッジクラスが適用されていることを確認
    const badge = screen.getByText("残り4d");
    expect(badge).toHaveClass("bg-orange-50");
  });

  test("残り2日以下の場合は赤色で表示される", () => {
    // 2日後
    const futureDate = new Date("2024-01-17T12:00:00.000Z");

    render(<OAuthTokenExpirationDisplay expiresAt={futureDate} />);

    expect(screen.getByText("残り2d")).toBeInTheDocument();
    // 赤色のバッジクラスが適用されていることを確認
    const badge = screen.getByText("残り2d");
    expect(badge).toHaveClass("bg-red-50");
  });

  test("残り時間が1日未満の場合は時間と分で表示される", () => {
    // 5時間30分後
    const futureDate = new Date("2024-01-15T17:30:00.000Z");

    render(<OAuthTokenExpirationDisplay expiresAt={futureDate} />);

    expect(screen.getByText("残り5h 30m")).toBeInTheDocument();
  });

  test("ShieldCheckアイコンが表示される", () => {
    const futureDate = new Date("2024-01-20T12:00:00.000Z");

    render(<OAuthTokenExpirationDisplay expiresAt={futureDate} />);

    // lucide-react のアイコンは svg として描画される
    const icon = document.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
