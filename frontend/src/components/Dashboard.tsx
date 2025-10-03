import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolstice } from '../contexts/SolsticeContext';
import { QRScanner } from './QRScanner';
import { IdentityStatus } from './IdentityStatus';
import { ProofsDashboard } from './ProofsDashboard';
import { AlertCircle } from 'lucide-react';

export function Dashboard() {
  const { publicKey, connected } = useWallet();
  const { identity, fetchIdentity, loading, error } = useSolstice();
  const [activeTab, setActiveTab] = useState<'scan' | 'verify' | 'status'>('scan');

  useEffect(() => {
    if (publicKey && connected) {
      fetchIdentity(publicKey.toString());
    }
  }, [publicKey, connected, fetchIdentity]);

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto mt-20">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-12 text-center border border-gray-700">
          <div className="w-20 h-20 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 text-lg mb-8">
            Connect your Solana wallet to start using Solstice Protocol for zero-knowledge identity verification.
          </p>
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
              <p className="text-gray-300 text-left">Connect your Solana wallet</p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
              <p className="text-gray-300 text-left">Scan your Aadhaar QR code</p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
              <p className="text-gray-300 text-left">Verify attributes privately with ZK proofs</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <IdentityStatus identity={identity} loading={loading} />
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'scan'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-900/50 text-gray-400 hover:text-white'
            }`}
          >
            Scan QR Code
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'verify'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-900/50 text-gray-400 hover:text-white'
            }`}
          >
            My Proofs
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'status'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-900/50 text-gray-400 hover:text-white'
            }`}
          >
            Status & Details
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'scan' && <QRScanner />}
          {activeTab === 'verify' && <ProofsDashboard />}
          {activeTab === 'status' && <IdentityStatus identity={identity} loading={loading} expanded />}
        </div>
      </div>
    </div>
  );
}
