"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, BarChart3 } from "lucide-react";
import { api } from "@/trpc/react";
import { decompressGzipData } from "@/utils/dataDecompression";
import { formatDataSize } from "@/utils/formatters";
import { JsonViewer } from "@/components/JsonViewer";

type RequestDataDetailModalProps = {
  requestLogId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export const RequestDataDetailModal = ({
  requestLogId,
  isOpen,
  onClose,
}: RequestDataDetailModalProps) => {
  const [inputData, setInputData] = useState<unknown>(null);
  const [outputData, setOutputData] = useState<unknown>(null);
  const [decompressionError, setDecompressionError] = useState<string | null>(
    null,
  );
  const [isDecompressing, setIsDecompressing] = useState(false);

  const {
    data: requestDataDetail,
    isLoading,
    error,
  } = api.userMcpServerInstance.getRequestDataDetail.useQuery(
    { requestLogId: requestLogId! },
    { enabled: !!requestLogId && isOpen },
  );

  // データの解凍処理
  useEffect(() => {
    const decompressData = async () => {
      if (!requestDataDetail) return;

      setIsDecompressing(true);
      setDecompressionError(null);
      setInputData(null);
      setOutputData(null);

      try {
        // 入力データの解凍
        const inputResult = await decompressGzipData(
          requestDataDetail.inputDataCompressed,
        );
        if (!inputResult.success) {
          const errorMsg = `入力データの解凍に失敗: ${inputResult.message}`;
          setDecompressionError(errorMsg);
          return;
        }

        // 出力データの解凍
        const outputResult = await decompressGzipData(
          requestDataDetail.outputDataCompressed,
        );
        if (!outputResult.success) {
          const errorMsg = `出力データの解凍に失敗: ${outputResult.message}`;
          console.error("Output decompression failed:", {
            error: outputResult.error,
            message: outputResult.message,
            debugInfo: outputResult.debugInfo,
            dataSize: requestDataDetail.outputDataCompressed.length,
          });
          setDecompressionError(errorMsg);
          return;
        }

        setInputData(inputResult.data);
        setOutputData(outputResult.data);
      } catch (error) {
        setDecompressionError(
          `予期しないエラー: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        setIsDecompressing(false);
      }
    };

    if (requestDataDetail) {
      void decompressData();
    }
  }, [requestDataDetail]);

  const renderJsonData = (data: unknown) => {
    if (isDecompressing) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span>データを解凍しています...</span>
        </div>
      );
    }

    if (decompressionError) {
      return (
        <div className="flex items-center justify-center p-8 text-red-500">
          <AlertCircle className="mr-2 h-6 w-6" />
          <span>{decompressionError}</span>
        </div>
      );
    }

    return <JsonViewer data={data} />;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] w-[80vw] max-w-[100rem] overflow-y-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>リクエスト詳細データ</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>データを読み込んでいます...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center p-8 text-red-500">
            <AlertCircle className="mr-2 h-6 w-6" />
            <span>データの取得に失敗しました: {error.message}</span>
          </div>
        )}

        {requestDataDetail && (
          <>
            {/* リクエスト基本情報 */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">リクエスト情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 1段目: 基本情報 */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <span className="text-muted-foreground text-sm">
                        ツール名
                      </span>
                      <p className="font-mono text-sm">
                        {requestDataDetail.requestLog.toolName}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">
                        メソッド
                      </span>
                      <Badge variant="outline" className="mt-1">
                        {requestDataDetail.requestLog.method}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">
                        ステータス
                      </span>
                      <div className="mt-1">
                        <Badge
                          variant={
                            requestDataDetail.requestLog.responseStatus.startsWith(
                              "2",
                            )
                              ? "default"
                              : "destructive"
                          }
                        >
                          {requestDataDetail.requestLog.responseStatus}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">
                        実行時間
                      </span>
                      <p className="font-mono text-sm">
                        {requestDataDetail.requestLog.durationMs}ms
                      </p>
                    </div>
                  </div>

                  {/* 2段目: データサイズ情報 */}
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                      <span className="text-muted-foreground text-sm">
                        入力データサイズ
                      </span>
                      <p className="font-mono text-sm font-semibold">
                        {formatDataSize(requestDataDetail.originalInputSize)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">
                        出力データサイズ
                      </span>
                      <p className="font-mono text-sm font-semibold">
                        {formatDataSize(requestDataDetail.originalOutputSize)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="input" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="input">入力データ</TabsTrigger>
                <TabsTrigger value="output">出力データ</TabsTrigger>
              </TabsList>

              <TabsContent value="input">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      入力データ (リクエスト)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>{renderJsonData(inputData)}</CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="output">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      出力データ (レスポンス)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>{renderJsonData(outputData)}</CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                閉じる
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
