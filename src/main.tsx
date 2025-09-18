import "@mysten/dapp-kit/dist/index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient();
const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
  // mainnet: { url: getFullnodeUrl("mainnet") },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
                borderRadius: "8px",
                fontSize: "14px",
                padding: "12px 16px",
              },
              success: {
                duration: 5000,
                style: {
                  background: "#10B981",
                  color: "#fff",
                },
                iconTheme: {
                  primary: "#fff",
                  secondary: "#10B981",
                },
              },
              error: {
                duration: 6000,
                style: {
                  background: "#EF4444",
                  color: "#fff",
                },
                iconTheme: {
                  primary: "#fff",
                  secondary: "#EF4444",
                },
              },
              loading: {
                style: {
                  background: "#3B82F6",
                  color: "#fff",
                },
                iconTheme: {
                  primary: "#fff",
                  secondary: "#3B82F6",
                },
              },
            }}
          />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </StrictMode>
);
