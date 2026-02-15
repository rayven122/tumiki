"use client";

import type { ReactNode, Dispatch, SetStateAction } from "react";
import type { ArtifactKind, ChatMessage, Attachment } from "@/lib/types";
import type {
  ArtifactActionContext,
  ArtifactToolbarItem,
} from "./create-artifact";

/**
 * バウンディングボックス
 */
export type BoundingBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/**
 * アーティファクトのUI状態
 */
export type UIArtifact = {
  id?: string;
  documentId: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  status: "idle" | "streaming";
  isVisible: boolean;
  boundingBox?: BoundingBox;
};

/**
 * アーティファクトアクション定義
 */
type ArtifactAction = {
  icon: ReactNode;
  label?: string;
  description: string;
  onClick: (context: ArtifactActionContext) => void | Promise<void>;
  isDisabled?: (context: ArtifactActionContext) => boolean;
};

export type { ArtifactToolbarItem } from "./create-artifact";

/**
 * アーティファクト定義
 */
export type ArtifactDefinition = {
  kind: ArtifactKind;
  description: string;
  initialize: (props: {
    documentId: string;
    setMetadata: Dispatch<SetStateAction<unknown>>;
  }) => void;
  onStreamPart?: (props: {
    streamPart: unknown;
    setArtifact: Dispatch<SetStateAction<UIArtifact>>;
    setMetadata: Dispatch<SetStateAction<unknown>>;
  }) => void;
  content: (props: {
    mode: "edit" | "diff";
    status: "idle" | "streaming";
    content: string;
    isCurrentVersion: boolean;
    currentVersionIndex: number;
    onSaveContent: (content: string, debounce?: boolean) => void;
    getDocumentContentById: (
      documentIndex: number,
    ) => Promise<string | undefined>;
    isLoading: boolean;
    metadata: unknown;
    setMetadata: Dispatch<SetStateAction<unknown>>;
  }) => ReactNode;
  actions: ArtifactAction[];
  toolbar: ArtifactToolbarItem[];
};

/**
 * アーティファクト定義のリスト（将来の拡張用）
 */
export const artifactDefinitions: ArtifactDefinition[] = [];

export type { ArtifactKind } from "@/lib/types";

type ArtifactProps = {
  chatId: string;
  orgSlug?: string;
  input: string;
  setInput: (input: string) => void;
  handleSubmit?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessage?: (...args: any[]) => Promise<unknown>;
  status: string;
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  append?: (params: { role: "user"; content: string }) => Promise<unknown>;
  messages: ChatMessage[];
  setMessages: (
    messages: ChatMessage[] | ((messages: ChatMessage[]) => ChatMessage[]),
  ) => void;
  reload?: () => void;
  regenerate?: () => void;
  isReadonly: boolean;
  selectedVisibilityType?: string;
};

/**
 * Artifactコンポーネント（将来の拡張用プレースホルダー）
 */
export const Artifact = (_props: ArtifactProps) => {
  return null;
};
