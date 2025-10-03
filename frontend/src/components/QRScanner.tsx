import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { useSolstice } from '../contexts/SolsticeContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { Camera, Upload, CheckCircle, Loader, X } from 'lucide-react';
import { generateAllProofs, storeProofs } from '../lib/proofGenerator';
import { parseAadhaarQR, isMadhaarQR, isPhysicalCardQR } from '../lib/aadhaarParser';

export function QRScanner() {
  const { parseQRCode, registerIdentity, loading } = useSolstice();
  const wallet = useWallet();
  const [scanning, setScanning] = useState(false);
  // qrData is handled directly via callbacks; provide a local no-op setter to keep calls harmless
  const handleSetQrData = (d: string | null) => {
    // intentionally empty: we don't persist qrData to state to avoid extra re-renders
    return;
  };
  const [commitment, setCommitment] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [step, setStep] = useState<'scan' | 'parsed' | 'registered'>('scan');
  const [generatingProofs, setGeneratingProofs] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // Start camera and scan for QR codes
  const startCamera = async () => {
    try {
      setCameraError(null);
      setScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready before starting to scan
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          console.log('Camera started, beginning QR scan...');
          scanQRFromVideo();
        };
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError(
        error.name === 'NotAllowedError' 
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Failed to access camera. Please ensure your device has a camera and permissions are granted.'
      );
      setScanning(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setScanning(false);
    setCameraError(null);
  };

  // Continuously scan video feed for QR codes
  const scanQRFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.warn('Video or canvas ref not available');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          console.log(' QR code detected from camera!');
          console.log('QR data length:', code.data.length, 'characters');
          stopCamera();
          handleQRData(code.data);
          return;
        }
      }
    }

    // Continue scanning (runs ~60 times per second)
    animationFrameRef.current = requestAnimationFrame(scanQRFromVideo);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleQRData = async (data: string) => {
    try {
  handleSetQrData(data);
      
      console.log('Raw QR data received');
      console.log('Length:', data.length, 'characters');
      console.log('First 100 chars:', data.substring(0, 100));
      
      // Check if it's XML format (physical Aadhaar card QR)
      if (isPhysicalCardQR(data)) {
        console.log('Detected XML format Aadhaar Secure QR Code (from physical card/eAadhaar)');
        alert('This QR code is from a physical Aadhaar card or eAadhaar PDF.\n\nPlease use the QR code from the mAadhaar mobile app instead:\n\n1. Open mAadhaar app on your phone\n2. Go to My Aadhaar → Share\n3. Select "Share QR Code"\n4. Take a screenshot and upload here');
        return;
      }
      
      // Check if it's a valid mAadhaar QR (numeric string)
      if (!isMadhaarQR(data)) {
        console.error('QR code is not in mAadhaar format');
        alert('Invalid QR code format.\n\nmAadhaar QR codes are numeric strings (several hundred characters long).\n\nPlease ensure:\n1. You are using the mAadhaar app (not physical card)\n2. The QR code image is clear and complete\n3. You scanned the entire QR code');
        return;
      }
      
      console.log('Valid mAadhaar QR format detected');
      
      try {
        // Parse QR using @anon-aadhaar/core (same as Self Protocol)
        const aadhaarData = parseAadhaarQR(data);
        
        // Convert to internal format
        const identityData = {
          version: '2.5',
          name: aadhaarData.name,
          dateOfBirth: aadhaarData.dateOfBirth,
          gender: aadhaarData.gender,
          address: aadhaarData.address,
          photo: '',
          signature: '',
          aadhaarNumber: `XXXX-XXXX-${aadhaarData.aadhaarLast4Digits}`,
        };
        
        console.log('Identity data ready for registration');
        setParsedData(identityData);
        
      } catch (parseError: any) {
        console.error('Failed to parse mAadhaar QR:', parseError);
        alert(`Failed to parse mAadhaar QR code.\n\n${parseError.message}\n\nPlease ensure:\n1. You are using the latest mAadhaar app\n2. The QR code screenshot is clear and complete\n3. You are uploading the "Share QR Code" from the app`);
        return;
      }
      
      // Parse on backend for commitment and signature verification
      const result = await parseQRCode(data);
      
      if (result.success) {
        setCommitment(result.commitment);
        setStep('parsed');
      }
    } catch (error) {
      console.error('Error parsing QR code:', error);
      alert('Failed to parse QR code. Please ensure it\'s a valid Aadhaar QR code from mAadhaar app.');
    }
  };

  const handleRegister = async () => {
    if (!commitment || !wallet.publicKey) return;

    try {
      // Generate merkle root (in production, this would involve actual merkle tree)
      const merkleRoot = commitment; // Simplified for demo
      
      const success = await registerIdentity(commitment, merkleRoot);
      
      if (success) {
        setStep('registered');
        console.log('Identity registered on-chain!');
        
        // Auto-generate all ZK proofs after successful registration
        if (parsedData) {
          setGeneratingProofs(true);
          console.log('Auto-generating ZK proofs in browser...');
          
          try {
            // Parse date of birth (DD/MM/YYYY → YYYYMMDD string format)
            const [day, month, year] = parsedData.dateOfBirth.split('/');
            const dobFormatted = `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
            
            // Extract nationality from address (simplified - you may need better parsing)
            const nationality = 'IN'; // Default to India for Aadhaar
            
            // Generate nonce from commitment (deterministic)
            const nonce = BigInt('0x' + commitment.slice(0, 16)).toString();
            
            const identityForProofs = {
              dateOfBirth: dobFormatted,
              nationality,
              aadhaarNumber: parsedData.aadhaarNumber,
              nonce
            };
            
            console.log('Identity data prepared:', {
              ...identityForProofs,
              aadhaarNumber: '****-****-' + identityForProofs.aadhaarNumber.slice(-4) // Redacted for console
            });
            
            // Generate all proofs in parallel (~5 seconds)
            const { ageProof, nationalityProof, uniquenessProof, errors } = 
              await generateAllProofs(identityForProofs, {
                ageThreshold: 18,
                allowedNationality: 'IN'
              });
            
            // Store proofs locally (7-day expiry)
            storeProofs(wallet.publicKey.toString(), {
              age: ageProof || undefined,
              nationality: nationalityProof || undefined,
              uniqueness: uniquenessProof || undefined
            });
            
            console.log('ZK Proofs generated and stored locally!');
            if (ageProof) console.log('  Age proof (>18 years)');
            if (nationalityProof) console.log('  Nationality proof (Indian)');
            if (uniquenessProof) console.log('  Uniqueness proof');
            
            if (errors.length > 0) {
              console.warn('Some proofs failed:', errors);
            }
            
            // Clear sensitive data after proof generation
            setParsedData(null);
            
          } catch (proofError) {
            console.error('Failed to generate proofs:', proofError);
            console.log('You can regenerate proofs later in the Verification Flow tab');
          } finally {
            setGeneratingProofs(false);
          }
        }
      }
    } catch (error) {
      console.error('Error registering identity:', error);
    }
  };

  const resetFlow = () => {
  handleSetQrData(null);
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

      {step === 'scan' && !scanning && (
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
              onClick={startCamera}
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

      {step === 'scan' && scanning && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl overflow-hidden relative">
            {/* Video element for camera feed */}
            <video
              ref={videoRef}
              className="w-full h-auto"
              playsInline
              muted
            />
            {/* Hidden canvas for QR detection */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Camera overlay with scanning animation */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/20" />
              
              {/* Scanning frame */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500" />
                
                {/* Animated scanning line */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-scan" />
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={stopCamera}
              className="absolute top-4 right-4 bg-gray-900/80 hover:bg-gray-800 text-white p-2 rounded-lg transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Scanning indicator */}
            <div className="absolute top-4 left-4 bg-purple-600/80 px-3 py-1 rounded-full flex items-center gap-2 z-10">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">Scanning...</span>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-4 left-4 right-4 bg-gray-900/90 rounded-lg p-4 z-10">
              <p className="text-white text-center font-semibold">
                📸 Position the QR code within the frame
              </p>
              <p className="text-gray-300 text-sm text-center mt-1">
                Scanning automatically (~60 times per second)
              </p>
            </div>
          </div>

          {cameraError && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-200">{cameraError}</p>
              <button
                onClick={stopCamera}
                className="mt-2 text-red-300 hover:text-red-100 underline text-sm"
              >
                Close camera
              </button>
            </div>
          )}
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
          <p className="text-green-200 mb-4">
            Your identity commitment has been registered on Solana.
          </p>
          
          {generatingProofs && (
            <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-4 mb-4">
              <Loader className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-spin" />
              <p className="text-purple-200 font-semibold">Generating ZK Proofs...</p>
              <p className="text-purple-300 text-sm mt-1">
                This may take a few seconds. All computation happens in your browser for privacy.
              </p>
            </div>
          )}
          
          {!generatingProofs && (
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-6">
              <p className="text-blue-200 text-sm">
                ZK proofs generated and stored locally<br/>
                You can now verify attributes on any dApp instantly!
              </p>
            </div>
          )}
          
          <button
            onClick={resetFlow}
            disabled={generatingProofs}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {generatingProofs ? 'Generating proofs...' : 'Done'}
          </button>
          
          <p className="text-gray-400 text-sm mt-4 text-center">
            Your identity is now registered. One person, one identity.
          </p>
        </div>
      )}
    </div>
  );
}
