// create a hook to check the balance of the wallet

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export const useCheckWalBalance = () => {
  const [walBalance, setWalBalance] = useState<string | null>(null);
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  // Check WAL balance
  useEffect(() => {
    const checkWalBalance = async () => {
      if (account?.address && suiClient) {
        try {
          // WAL token type for Sui testnet
          const walCoinType =
            "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL";

          const balance = await suiClient.getBalance({
            owner: account.address,
            coinType: walCoinType,
          });

          const walBalanceValue = (Number(balance.totalBalance) / 1e9).toFixed(
            3
          );
          setWalBalance(walBalanceValue);

          // Show balance info toast
          if (Number(walBalanceValue) === 0) {
            toast(
              `💰 WAL Balance: ${walBalanceValue} WAL\n💡 Get WAL tokens from Sui Discord #testnet-faucet for user-paid uploads`,
              {
                icon: "⚠️",
                duration: 6000,
              }
            );
          } else {
            toast.success(`💰 WAL Balance loaded: ${walBalanceValue} WAL`);
          }
        } catch (error) {
          console.log("WAL balance not found or error:", error);
          setWalBalance("0.000");
          toast.error("Failed to load WAL balance");
        }
      }
    };
    checkWalBalance();
  }, [account?.address, suiClient]);

  return walBalance;
};
