import type { UIMessageStreamWriter } from "ai";
import { createDocumentHandler } from "@/lib/artifacts/server";

// UIMessageStreamWriterにデータを書き込むヘルパー関数
// AI SDK 6では `data-${string}` パターンを使用
const writeArtifactData = (
  writer: UIMessageStreamWriter,
  dataType: string,
  content: unknown,
) => {
  writer.write({
    type: `data-artifact-${dataType}` as `data-${string}`,
    data: content,
  });
};

// 注意: AI Gateway では画像生成モデルは現在サポートされていません
// 将来的にサポートされた場合は、gateway.imageModel() を使用するように更新してください
export const imageDocumentHandler = createDocumentHandler<"image">({
  kind: "image",
  onCreateDocument: async ({ writer }) => {
    // 画像生成は現在無効化されています
    writeArtifactData(
      writer,
      "error",
      "画像生成は現在利用できません。AI Gateway で画像モデルがサポートされるまでお待ちください。",
    );

    return "";
  },
  onUpdateDocument: async ({ writer }) => {
    // 画像生成は現在無効化されています
    writeArtifactData(
      writer,
      "error",
      "画像生成は現在利用できません。AI Gateway で画像モデルがサポートされるまでお待ちください。",
    );

    return "";
  },
});
