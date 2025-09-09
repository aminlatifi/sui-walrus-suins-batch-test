import {
  ConnectButton,
  useCurrentAccount,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import "./App.css";

function App() {
  return (
    <>
      <div>
        <h1>Sui Testnet dApp</h1>
        <div className="card">
          <ConnectButton />
        </div>
        <ConnectedAccount />
      </div>
    </>
  );
}

function ConnectedAccount() {
  const account = useCurrentAccount();

  if (!account) {
    return null;
  }

  return (
    <div>
      <div>Connected to {account.address}</div>
      <OwnedObjects address={account.address} />
    </div>
  );
}

function OwnedObjects({ address }: { address: string }) {
  const { data } = useSuiClientQuery("getOwnedObjects", {
    owner: address,
  });

  if (!data) {
    return <div>Loading objects...</div>;
  }

  return (
    <div>
      <h3>Owned Objects ({data.data.length})</h3>
      <ul>
        {data.data.map((object) => (
          <li key={object.data?.objectId}>
            <a
              href={`https://suiscan.xyz/testnet/object/${object.data?.objectId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {object.data?.objectId}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
