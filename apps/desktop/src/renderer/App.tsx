import React from "react";

export const App = (): React.ReactElement => {
  const [versions, setVersions] = React.useState<{
    node: string;
    chrome: string;
    electron: string;
  } | null>(null);

  React.useEffect(() => {
    // Electron APIから情報を取得
    if (window.electronAPI) {
      setVersions({
        node: window.electronAPI.versions.node(),
        chrome: window.electronAPI.versions.chrome(),
        electron: window.electronAPI.versions.electron(),
      });
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-3xl font-bold text-gray-800">
          tumiki Desktop
        </h1>
        <p className="mb-6 text-gray-600">
          Electronアプリケーションが正常に起動しました！
        </p>

        {versions && (
          <div className="space-y-2 rounded bg-gray-50 p-4">
            <h2 className="mb-2 font-semibold text-gray-700">
              バージョン情報:
            </h2>
            <p className="text-sm text-gray-600">Node: {versions.node}</p>
            <p className="text-sm text-gray-600">Chrome: {versions.chrome}</p>
            <p className="text-sm text-gray-600">
              Electron: {versions.electron}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
