import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { trpc, createTRPCClient } from "./utils/trpc";
import "./styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const Root = () => {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <React.StrictMode>
      {/* @ts-expect-error - tRPC型定義の一時的な回避 */}
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Provider>
            <App />
          </Provider>
        </QueryClientProvider>
        {/* @ts-expect-error - tRPC型定義の一時的な回避 */}
      </trpc.Provider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(rootElement).render(<Root />);
