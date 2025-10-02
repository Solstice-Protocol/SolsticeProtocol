import { useState } from 'react';
import { useSolstice } from '../contexts/SolsticeContext';
import { CheckCircle, Loader, Calendar, Globe, Users } from 'lucide-react';

interface Identity {
  walletAddress: string;
  isVerified: boolean;
  verificationTimestamp?: number;
  attributesVerified: number;
}

interface VerificationFlowProps {
  identity: Identity;
}

type AttributeType = 'age' | 'nationality' | 'uniqueness';

export function VerificationFlow({ identity }: VerificationFlowProps) {
  const { generateProof, verifyIdentity, loading } = useSolstice();
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeType | null>(null);
  const [proofGenerated, setProofGenerated] = useState(false);
  const [currentProof, setCurrentProof] = useState<any>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Check which attributes are already verified
  const isAgeVerified = (identity.attributesVerified & 1) > 0;
  const isNationalityVerified = (identity.attributesVerified & 2) > 0;
  const isUniquenessVerified = (identity.attributesVerified & 4) > 0;

  const handleGenerateProof = async () => {
    if (!selectedAttribute) return;

    try {
      setProofGenerated(false);
      setVerificationSuccess(false);

      // Mock private and public inputs (in production, these would come from actual data)
      const privateInputs = {
        age: selectedAttribute === 'age' ? '25' : undefined,
        nationality: selectedAttribute === 'nationality' ? 'IN' : undefined,
        identity_hash: identity.walletAddress
      };

      const publicInputs = {
        commitment: identity.walletAddress,
        minAge: selectedAttribute === 'age' ? '18' : undefined
      };

      const result = await generateProof(selectedAttribute, privateInputs, publicInputs);
      
      setCurrentProof(result);
      setProofGenerated(true);
    } catch (error) {
      console.error('Error generating proof:', error);
    }
  };

  const handleVerifyProof = async () => {
    if (!selectedAttribute || !currentProof) return;

    try {
      const success = await verifyIdentity(
        currentProof.proof,
        currentProof.publicSignals,
        selectedAttribute
      );

      setVerificationSuccess(success);
    } catch (error) {
      console.error('Error verifying proof:', error);
    }
  };

  const resetFlow = () => {
    setSelectedAttribute(null);
    setProofGenerated(false);
    setCurrentProof(null);
    setVerificationSuccess(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Verify Identity Attributes</h2>
        <p className="text-gray-400">
          Generate zero-knowledge proofs to verify your identity attributes without revealing personal data.
        </p>
      </div>

      {!selectedAttribute ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AttributeButton
            icon={<Calendar className="w-8 h-8" />}
            title="Age Verification"
            description="Prove you're above a certain age"
            verified={isAgeVerified}
            onClick={() => setSelectedAttribute('age')}
            disabled={isAgeVerified}
          />
          <AttributeButton
            icon={<Globe className="w-8 h-8" />}
            title="Nationality"
            description="Verify your country of origin"
            verified={isNationalityVerified}
            onClick={() => setSelectedAttribute('nationality')}
            disabled={isNationalityVerified}
          />
          <AttributeButton
            icon={<Users className="w-8 h-8" />}
            title="Uniqueness"
            description="Prove you're a unique human"
            verified={isUniquenessVerified}
            onClick={() => setSelectedAttribute('uniqueness')}
            disabled={isUniquenessVerified}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selected Attribute Info */}
          <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2 capitalize">
              {selectedAttribute} Verification
            </h3>
            <p className="text-gray-300 text-sm">
              {selectedAttribute === 'age' && 'Generate a proof that you are above 18 years old without revealing your exact age.'}
              {selectedAttribute === 'nationality' && 'Verify your nationality without exposing other personal information.'}
              {selectedAttribute === 'uniqueness' && 'Prove you are a unique individual to prevent Sybil attacks.'}
            </p>
          </div>

          {/* Proof Generation */}
          {!proofGenerated && !verificationSuccess && (
            <div className="space-y-4">
              <button
                onClick={handleGenerateProof}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating ZK Proof...
                  </>
                ) : (
                  'Generate Zero-Knowledge Proof'
                )}
              </button>

              <button
                onClick={resetFlow}
                className="w-full border border-gray-600 hover:border-gray-500 text-gray-300 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Back to Selection
              </button>
            </div>
          )}

          {/* Proof Generated */}
          {proofGenerated && !verificationSuccess && (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-green-200 font-semibold mb-2">Proof Generated Successfully</h3>
                    <p className="text-green-300 text-sm mb-4">
                      Your zero-knowledge proof has been generated. Submit it to verify on-chain.
                    </p>
                    {currentProof && (
                      <div className="bg-gray-900 rounded p-3">
                        <p className="text-xs text-gray-400 mb-1">Proof ID:</p>
                        <p className="text-white font-mono text-xs break-all">{currentProof.proofId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleVerifyProof}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Verifying On-Chain...
                  </>
                ) : (
                  'Submit for On-Chain Verification'
                )}
              </button>

              <button
                onClick={resetFlow}
                className="w-full border border-gray-600 hover:border-gray-500 text-gray-300 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Verification Success */}
          {verificationSuccess && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Verification Complete!</h3>
              <p className="text-green-200 mb-6">
                Your {selectedAttribute} attribute has been verified on-chain.
              </p>
              <button
                onClick={resetFlow}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Verify Another Attribute
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <p className="text-blue-200 text-sm">
          <strong>How it works:</strong> ZK proofs allow you to prove statements about your identity 
          (like being over 18) without revealing the underlying data (your exact age). 
          Proofs are verified on-chain and stored permanently.
        </p>
      </div>
    </div>
  );
}

function AttributeButton({
  icon,
  title,
  description,
  verified,
  onClick,
  disabled
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  verified: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative p-6 rounded-xl border-2 transition-all text-left ${
        verified
          ? 'bg-green-900/20 border-green-700 cursor-not-allowed'
          : disabled
          ? 'bg-gray-900/50 border-gray-700 cursor-not-allowed opacity-50'
          : 'bg-gray-900/50 border-gray-600 hover:border-purple-500 hover:bg-purple-900/20'
      }`}
    >
      {verified && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-6 h-6 text-green-400" />
        </div>
      )}
      <div className={`mb-3 ${verified ? 'text-green-400' : 'text-purple-400'}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
      {verified && (
        <p className="text-xs text-green-400 mt-2 font-semibold">✓ Verified</p>
      )}
    </button>
  );
}
