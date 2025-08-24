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
import { useMemo, useState } from "react";
import { guestRegex } from "@/lib/constants";
import { useRouter } from "next/navigation";
import {
  type Notification,
  type NotificationType,
  mockNotifications,
} from "./mockNotifications";

interface HeaderClientProps {
  user?: {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  };
}

export const HeaderClient = ({ user }: HeaderClientProps) => {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const isGuest = useMemo(() => {
    return guestRegex.test(user?.email ?? "");
  }, [user?.email]);

  // モックの通知データ
  const notifications = mockNotifications;

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
      <div className="flex items-center space-x-3">
        {/* 通知ベルアイコン */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 transition-colors hover:bg-gray-100"
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
              <div className="absolute top-12 right-0 z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-lg">
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
                          className="cursor-pointer p-4 transition-colors hover:bg-gray-50"
                          onClick={() => {
                            setSelectedNotification(notification);
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`rounded-lg p-2 ${getNotificationColor(notification.type)}`}
                            >
                              {notification.type === "error" && "⚠️"}
                              {notification.type === "warning" && "⚡"}
                              {notification.type === "info" && "ℹ️"}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {notification.title}
                              </h4>
                              <p className="mt-1 text-sm text-gray-600">
                                {notification.message}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
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
              {!user ? (
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
                      {isGuest ? "G" : (user?.email?.[0]?.toUpperCase() ?? "U")}
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

      {/* 通知詳細モーダル */}
      {selectedNotification && (
        <>
          <div
            className="bg-opacity-50 fixed inset-0 z-[100] bg-black"
            onClick={() => setSelectedNotification(null)}
          />
          <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="pointer-events-auto w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div
                className={`rounded-t-lg p-4 ${getNotificationColor(selectedNotification.type)}`}
              >
                <h3 className="text-lg font-semibold">
                  {selectedNotification.title}
                </h3>
              </div>
              <div className="p-6">
                <p className="mb-4 text-gray-700">
                  {selectedNotification.message}
                </p>

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
                    <h4 className="mb-2 font-medium text-gray-900">詳細情報</h4>
                    <pre className="text-sm whitespace-pre-wrap text-gray-700">
                      {selectedNotification.details}
                    </pre>
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-500">
                  発生時刻:{" "}
                  {selectedNotification.timestamp.toLocaleString("ja-JP")}
                </div>
              </div>
              <div className="flex justify-between border-t border-gray-200 p-4">
                {selectedNotification.link ? (
                  <button
                    onClick={() => {
                      router.push(selectedNotification.link!.href);
                      setSelectedNotification(null);
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                  >
                    {selectedNotification.link.label}
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800"
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
