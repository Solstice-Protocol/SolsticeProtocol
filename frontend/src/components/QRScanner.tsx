import { useState, useRef } from 'react';
import jsQR from 'jsqr';
import { useSolstice } from '../contexts/SolsticeContext';
import { Camera, Upload, CheckCircle, Loader } from 'lucide-react';

export function QRScanner() {
  const { parseQRCode, registerIdentity, loading } = useSolstice();
  const [scanning, setScanning] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [commitment, setCommitment] = useState<string | null>(null);
  const [step, setStep] = useState<'scan' | 'parsed' | 'registered'>('scan');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          if (imageData) {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              await handleQRData(code.data);
            } else {
              alert('No QR code found in image');
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing QR image:', error);
      alert('Failed to process QR code image');
    }
  };

  const handleQRData = async (data: string) => {
    try {
      setQrData(data);
      const result = await parseQRCode(data);
      
      if (result.success) {
        setCommitment(result.commitment);
        setStep('parsed');
      }
    } catch (error) {
      console.error('Error parsing QR code:', error);
    }
  };

  const handleRegister = async () => {
    if (!commitment) return;

    try {
      // Generate merkle root (in production, this would involve actual merkle tree)
      const merkleRoot = commitment; // Simplified for demo
      
      const success = await registerIdentity(commitment, merkleRoot);
      
      if (success) {
        setStep('registered');
      }
    } catch (error) {
      console.error('Error registering identity:', error);
    }
  };

  const resetFlow = () => {
    setQrData(null);
    setCommitment(null);
    setStep('scan');
    setScanning(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Scan Aadhaar QR Code</h2>
        <p className="text-gray-400">
          Open your mAadhaar app and scan the secure QR code to begin identity verification.
        </p>
      </div>

      {step === 'scan' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-purple-500 transition-colors bg-gray-900/50"
            >
              <Upload className="w-12 h-12 text-purple-400 mb-3" />
              <span className="text-white font-semibold">Upload QR Image</span>
              <span className="text-sm text-gray-400 mt-1">JPG, PNG (Max 5MB)</span>
            </button>

            <button
              onClick={() => setScanning(true)}
              disabled={loading}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-xl hover:border-purple-500 transition-colors bg-gray-900/50"
            >
              <Camera className="w-12 h-12 text-purple-400 mb-3" />
              <span className="text-white font-semibold">Scan with Camera</span>
              <span className="text-sm text-gray-400 mt-1">Use device camera</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <p className="text-blue-200 text-sm">
              <strong>Privacy Note:</strong> Your Aadhaar data never leaves your device in plain text. 
              Only cryptographic commitments are stored on-chain.
            </p>
          </div>
        </div>
      )}

      {step === 'parsed' && commitment && (
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-green-200 font-semibold mb-2">QR Code Parsed Successfully</h3>
                <p className="text-green-300 text-sm mb-4">
                  Your Aadhaar signature has been verified. Identity commitment generated.
                </p>
                <div className="bg-gray-900 rounded p-3 mb-4">
                  <p className="text-xs text-gray-400 mb-1">Identity Commitment:</p>
                  <p className="text-white font-mono text-sm break-all">{commitment.slice(0, 64)}...</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRegister}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Identity On-Chain'
              )}
            </button>
            <button
              onClick={resetFlow}
              className="px-6 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'registered' && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Identity Registered!</h3>
          <p className="text-green-200 mb-6">
            Your identity commitment has been registered on Solana. You can now verify attributes.
          </p>
          <button
            onClick={resetFlow}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
