"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, User, ChevronDown, Bell } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logout } from "@/lib/auth";
import { OrganizationNavigation } from "@/app/_components/OrganizationNavigation";
import { useUser } from "@tumiki/auth/client";
import { useMemo, useState } from "react";
import { guestRegex } from "@/lib/constants";
import { useRouter } from "next/navigation";

type NotificationType = "error" | "warning" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  value?: number;
  details?: string;
  link?: {
    href: string;
    label: string;
  };
}

export const Header = () => {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const isGuest = useMemo(() => {
    return guestRegex.test(user?.email ?? "");
  }, [user?.email]);

  // モックの通知データ
  const notifications: Notification[] = [
    {
      id: "1",
      type: "error",
      title: "接続エラー",
      message: "GitHub Copilot MCPサーバーへの接続が失敗しました",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      value: 3,
      details: "エラーコード: CONNECTION_TIMEOUT\n再試行回数: 3回\n最終試行時刻: 2024-01-15 14:23:45"
    },
    {
      id: "2",
      type: "warning",
      title: "異常なアクセス検知",
      message: "Database MCPサーバーへの異常なアクセスパターンを検知しました",
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      value: 127,
      details: "検知内容: 短時間での大量リクエスト\nIPアドレス: 192.168.1.105\nリクエスト数: 127回/分\n通常の平均: 10-15回/分\n対応: 自動的にレート制限を適用済み",
      link: {
        href: "/mcp/servers/database-mcp?tab=logs",
        label: "ログを確認"
      }
    },
    {
      id: "3",
      type: "warning",
      title: "メモリ使用率警告",
      message: "Slack MCPサーバーのメモリ使用率が高くなっています",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      value: 85,
      details: "現在のメモリ使用率: 85%\n推奨上限: 80%\n継続時間: 30分"
    },
    {
      id: "4",
      type: "warning",
      title: "異常なAPI利用検知",
      message: "GitHub MCPサーバーで短時間に大量のAPIリクエストを検知しました",
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      value: 892,
      details: "検知内容: 異常なAPI呼び出しパターン\nユーザー: user_12345\nリクエスト数: 892回/5分\n通常の平均: 50-100回/5分\n使用されたツール: repo_search, code_search, issue_create\n対応: APIレート制限に到達、一時的に制限中",
      link: {
        href: "/mcp/servers/github-mcp?tab=logs",
        label: "ログを確認"
      }
    },
    {
      id: "5",
      type: "info",
      title: "更新完了",
      message: "Weather MCPサーバーが正常に更新されました",
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      value: 1,
      details: "バージョン: 2.3.0 → 2.4.0\n更新内容: パフォーマンス改善とバグ修正"
    }
  ];

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case "error":
        return "text-red-600 bg-red-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "info":
        return "text-blue-600 bg-blue-50";
    }
  };

  const formatTimestamp = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    return date.toLocaleDateString("ja-JP");
  };
  return (
    <>
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="mx-6 flex items-center space-x-2">
            <Image
              src="/favicon/logo.svg"
              alt="Tumiki"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <span className="font-bold">Tumiki</span>
          </Link>

          {/* 組織ナビゲーション */}
          <OrganizationNavigation />
        </div>

        <div className="flex items-center space-x-3">
          {/* 通知ベルアイコン */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* 通知一覧モーダル */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-200 p-4">
                    <h3 className="text-lg font-semibold">通知</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        通知はありません
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedNotification(notification);
                              setShowNotifications(false);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`rounded-lg p-2 ${getNotificationColor(notification.type)}`}>
                                {notification.type === "error" && "⚠️"}
                                {notification.type === "warning" && "⚡"}
                                {notification.type === "info" && "ℹ️"}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-gray-500">
                                    {formatTimestamp(notification.timestamp)}
                                  </span>
                                  {notification.value !== undefined && (
                                    <button
                                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedNotification(notification);
                                        setShowNotifications(false);
                                      }}
                                    >
                                      数値: {notification.value}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ユーザーメニュー */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex h-auto items-center space-x-2 px-3 py-2"
                aria-label="ユーザーメニューを開く"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
                    <span className="text-muted-foreground text-sm">
                      読み込み中...
                    </span>
                  </div>
                ) : (
                  <>
                    {user?.picture ? (
                      <Image
                        src={user.picture}
                        alt={user.email ?? "ユーザーアバター"}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                        {isGuest
                          ? "G"
                          : (user?.email?.[0]?.toUpperCase() ?? "U")}
                      </div>
                    )}
                    <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
                      {isGuest
                        ? "ゲスト"
                        : (user?.name ?? user?.email ?? "ユーザー")}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user && (
                <>
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    <div className="font-medium">
                      {isGuest ? "ゲストユーザー" : user.name}
                    </div>
                    <div className="truncate">{user.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>設定</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>プロフィール</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center"
                >
                  ログアウト
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="border-t md:hidden">
        <div className="space-y-2 p-2">
          {/* モバイル組織ナビゲーション */}
          <div className="flex items-center justify-center">
            <OrganizationNavigation />
          </div>
        </div>
      </div>

      </header>
      
      {/* 通知詳細モーダル - Headerの外に配置 */}
      {selectedNotification && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black bg-opacity-50"
            onClick={() => setSelectedNotification(null)}
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl pointer-events-auto">
              <div className={`rounded-t-lg p-4 ${getNotificationColor(selectedNotification.type)}`}>
                <h3 className="text-lg font-semibold">{selectedNotification.title}</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-4">{selectedNotification.message}</p>
                
                {selectedNotification.value !== undefined && (
                  <div className="mb-4">
                    <span className="font-medium text-gray-900">数値: </span>
                    <span className="text-2xl font-bold text-gray-900">
                      {selectedNotification.value}
                    </span>
                  </div>
                )}
                
                {selectedNotification.details && (
                  <div className="rounded-lg bg-gray-100 p-4">
                    <h4 className="font-medium text-gray-900 mb-2">詳細情報</h4>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedNotification.details}
                    </pre>
                  </div>
                )}
                
                <div className="mt-4 text-sm text-gray-500">
                  発生時刻: {selectedNotification.timestamp.toLocaleString("ja-JP")}
                </div>
              </div>
              <div className="border-t border-gray-200 p-4 flex justify-between">
                {selectedNotification.link ? (
                  <button
                    onClick={() => {
                      router.push(selectedNotification.link!.href);
                      setSelectedNotification(null);
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
                  >
                    {selectedNotification.link.label}
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
