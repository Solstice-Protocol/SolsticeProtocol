import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Share2, RefreshCw } from 'lucide-react';

interface ProofData {
  type: 'age' | 'nationality' | 'uniqueness';
  status: 'valid' | 'expired' | 'pending';
  generatedAt: number;
  expiresAt?: number;
  proof: any;
  publicSignals: any[];
}

export function ProofsDashboard() {
  const [proofs, setProofs] = useState<ProofData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProofs();
  }, []);

  const loadProofs = async () => {
    try {
      setLoading(true);
      
      // Load proofs from IndexedDB
      const storedProofs = await getStoredProofs();
      setProofs(storedProofs);
      
    } catch (error) {
      console.error('Error loading proofs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStoredProofs = async (): Promise<ProofData[]> => {
    return new Promise((resolve) => {
      const request = indexedDB.open('SolsticeProofs', 1);
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('proofs')) {
          db.createObjectStore('proofs', { keyPath: 'type' });
        }
      };
      
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(['proofs'], 'readonly');
        const store = transaction.objectStore('proofs');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result || []);
        };
        
        getAllRequest.onerror = () => {
          resolve([]);
        };
      };
      
      request.onerror = () => {
        resolve([]);
      };
    });
  };

  const shareProof = async (proofType: string) => {
    const proof = proofs.find(p => p.type === proofType);
    if (!proof) return;

    const proofData = {
      type: proof.type,
      proof: proof.proof,
      publicSignals: proof.publicSignals,
      generatedAt: proof.generatedAt,
    };

    // Copy to clipboard as JSON
    await navigator.clipboard.writeText(JSON.stringify(proofData, null, 2));
    alert('Proof copied to clipboard! You can now share it with services that need verification.');
  };

  const regenerateProof = async (proofType: string) => {
    alert(`Regenerating ${proofType} proof... This feature will generate a fresh proof with updated timestamp.`);
    // TODO: Implement proof regeneration
  };

  const getProofIcon = (type: string) => {
    switch (type) {
      case 'age':
        return '🎂';
      case 'nationality':
        return '🌍';
      case 'uniqueness':
        return '🔒';
      default:
        return '📜';
    }
  };

  const getProofTitle = (type: string) => {
    switch (type) {
      case 'age':
        return 'Age Proof';
      case 'nationality':
        return 'Nationality Proof';
      case 'uniqueness':
        return 'Uniqueness Proof';
      default:
        return 'Unknown Proof';
    }
  };

  const getProofDescription = (type: string) => {
    switch (type) {
      case 'age':
        return 'Proves you are above a certain age without revealing your date of birth';
      case 'nationality':
        return 'Proves your nationality without revealing other personal information';
      case 'uniqueness':
        return 'Proves you are a unique individual without revealing your identity';
      default:
        return 'Zero-knowledge proof of identity attribute';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (proofs.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Proofs Generated Yet</h3>
        <p className="text-gray-500 mb-6">
          Upload your Aadhaar QR code in the "Scan QR Code" tab to automatically generate your identity proofs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">My Identity Proofs</h2>
        <p className="text-gray-400">
          Your zero-knowledge proofs allow you to verify attributes without revealing personal data.
          Share these proofs with services that need identity verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {proofs.map((proof) => (
          <div
            key={proof.type}
            className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getProofIcon(proof.type)}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {getProofTitle(proof.type)}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {proof.status === 'valid' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-500">Valid</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-500">Expired</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400 mb-4">
              {getProofDescription(proof.type)}
            </p>

            {/* Metadata */}
            <div className="text-xs text-gray-500 mb-4 space-y-1">
              <div>
                Generated: {new Date(proof.generatedAt).toLocaleDateString()}
              </div>
              {proof.expiresAt && (
                <div>
                  Expires: {new Date(proof.expiresAt).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => shareProof(proof.type)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => regenerateProof(proof.type)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                title="Regenerate proof with fresh timestamp"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-2">How to Use Your Proofs</h3>
        <ul className="space-y-2 text-sm text-blue-200">
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>Click "Share" to copy the proof data to your clipboard</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>Paste the proof into any service that supports Solstice Protocol verification</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>The service can verify your attribute without seeing your actual data</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-0.5">•</span>
            <span>Regenerate proofs periodically for fresh timestamps</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
