import { useCheckWalBalance } from "../hooks/checkWalBalance";
export const WalBalance = () => {
  const walBalance = useCheckWalBalance();
  return (
    <div
      style={{
        marginBottom: "15px",
        padding: "10px",
        backgroundColor: "#f8f9fa",
        borderRadius: "4px",
      }}
    >
      {walBalance !== null && (
        <div style={{ fontSize: "12px", color: "#666" }}>
          Your WAL balance: <strong>{walBalance} WAL</strong>
          {Number(walBalance) === 0 && (
            <span style={{ color: "#dc3545", marginLeft: "10px" }}>
              (Get WAL tokens from{" "}
              <a
                href="https://discord.gg/Sui"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sui Discord #testnet-faucet
              </a>
              )
            </span>
          )}
        </div>
      )}
    </div>
  );
};
