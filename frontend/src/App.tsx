import { useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { SolsticeProvider } from './contexts/SolsticeContext';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import Home from './pages/Home';
import './App.css';
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  // Configure Solana network
  const network = (import.meta.env.VITE_SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta' | 'testnet';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Configure wallet adapters - only Phantom to avoid duplicate keys
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  return (
    <BrowserRouter>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <SolsticeProvider>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route 
                  path="/app" 
                  element={
                    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                      <Header />
                      <main className="container mx-auto px-4 py-8">
                        <Dashboard />
                      </main>
                    </div>
                  } 
                />
              </Routes>
            </SolsticeProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  );
}

export default App;
