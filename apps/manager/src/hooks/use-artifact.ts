"use client";

/**
 * @file アーティファクト状態管理フック
 *
 * このファイルはアーティファクト機能のスタブ実装を提供します。
 * 現在は機能が無効化されており、将来の実装に向けたプレースホルダーです。
 *
 * ## スタブ実装について
 *
 * 現在のスタブ実装では:
 * - 全ての状態は初期値を返す
 * - 全てのセッター関数は何も行わない
 * - セレクターは常に初期データに基づいた値を返す
 *
 * ## 将来の実装方針
 *
 * 本実装時には以下の対応が必要:
 * - Jotaiを使用したグローバル状態管理への移行
 * - アーティファクトの永続化機能（tRPC経由でのDB保存）
 * - リアルタイム同期機能（WebSocket または Server-Sent Events）
 * - アーティファクトのバージョン管理
 *
 * @module hooks/use-artifact
 */

import type { UIArtifact } from "@/components/artifact";

/**
 * アーティファクトの初期データ
 *
 * アーティファクトが未作成または読み込み前の状態を表すデフォルト値。
 * 全てのフィールドが空または初期状態に設定されている。
 */
export const initialArtifactData: UIArtifact = {
  id: "",
  documentId: "",
  title: "",
  kind: "text",
  content: "",
  status: "idle",
  isVisible: false,
};

/**
 * アーティファクト状態を管理するフック（スタブ実装）
 *
 * このフックはアーティファクトの状態とメタデータを管理するためのインターフェースを提供する。
 * 現在はスタブ実装のため、状態の変更は反映されない。
 *
 * ## 将来の実装
 *
 * 本実装時には以下の機能が追加される予定:
 * - Jotai atomを使用した状態管理
 * - 楽観的更新によるUX向上
 * - エラーハンドリングとリトライ機能
 *
 * @returns アーティファクト状態と更新関数を含むオブジェクト
 * @returns artifact - 現在のアーティファクト状態（スタブでは常に初期値）
 * @returns setArtifact - アーティファクト状態を更新する関数（スタブでは何もしない）
 * @returns metadata - アーティファクトのメタデータ（スタブでは空オブジェクト）
 * @returns setMetadata - メタデータを更新する関数（スタブでは何もしない）
 */
export const useArtifact = () => {
  return {
    artifact: initialArtifactData,
    setArtifact: (
      _artifact: UIArtifact | ((prev: UIArtifact) => UIArtifact),
    ) => {
      // スタブ実装: 状態管理が実装されるまで何もしない
    },
    metadata: {},
    setMetadata: (_metadata: unknown) => {
      // スタブ実装: メタデータ管理が実装されるまで何もしない
    },
  };
};

/**
 * アーティファクト状態のセレクター（スタブ実装）
 *
 * アーティファクト状態から特定の値を抽出するためのセレクターフック。
 * Jotaiのセレクターパターンに準拠したインターフェースを提供する。
 *
 * 現在はスタブ実装のため、常に初期データに基づいた値を返す。
 *
 * ## 将来の実装
 *
 * 本実装時には以下の機能が追加される予定:
 * - メモ化による再レンダリング最適化
 * - 複数セレクターの組み合わせサポート
 *
 * @typeParam T - セレクター関数の戻り値の型
 * @param selector - アーティファクト状態から値を抽出する関数
 * @returns セレクター関数によって抽出された値（スタブでは初期データに基づく値）
 */
export const useArtifactSelector = <T>(
  selector: (artifact: UIArtifact) => T,
): T => {
  return selector(initialArtifactData);
};
