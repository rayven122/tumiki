import { type RouterOutputs } from "@/trpc/react";

type ServerInstance =
  RouterOutputs["userMcpServerInstance"]["findCustomServers"][number];

type EditServerInstanceModalProps = {
  onClose: () => void;
  serverInstance: ServerInstance;
  onSuccess: () => void | Promise<void>;
};

// 古い関数定義は削除されました

export function EditServerInstanceModal({
  onClose: _onClose,
  serverInstance: _serverInstance,
  onSuccess: _onSuccess,
}: EditServerInstanceModalProps) {
  // 簡素化されたデータ構造では、このモーダルは使用できないため一時的に無効化
  console.warn("EditServerInstanceModal is temporarily disabled due to data structure changes");
  
  return null;
}
