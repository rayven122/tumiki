"use client";

import { useState, useCallback, useEffect } from "react";
import type { Notification } from "@/types/notification";
import { mockNotifications } from "@/lib/mockNotifications";

export const useNotifications = () => {
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);

  // 新しい通知を追加（実際の実装では API から取得）
  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  // 通知を既読にする
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  // すべての通知を既読にする
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // 通知を削除
  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // すべての通知を削除
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // リアルタイム更新のシミュレーション
  useEffect(() => {
    // 実際の実装では WebSocket や SSE を使用
    const simulateNewNotification = () => {
      const random = Math.random();
      if (random < 0.1) {
        // 10% の確率で新しい通知を追加
        const newNotification: Notification = {
          id: `new-${Date.now()}`,
          title: "新しい通知",
          message: "リアルタイムで受信した通知です。",
          type: "info",
          priority: "medium",
          timestamp: new Date(),
          read: false,
          category: "システム",
        };
        // addNotification(newNotification);
      }
    };

    const interval = setInterval(simulateNewNotification, 60000); // 1分ごと

    return () => clearInterval(interval);
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
};
