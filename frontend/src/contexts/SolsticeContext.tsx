import React, { createContext, useContext, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { 
  createProvider, 
  getSolsticeProgram, 
  registerIdentity as registerIdentityOnChain,
  verifyIdentity as verifyIdentityOnChain 
} from '../lib/anchor';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Identity {
  walletAddress: string;
  isVerified: boolean;
  verificationTimestamp?: number;
  attributesVerified: number;
}

interface SolsticeContextType {
  identity: Identity | null;
  loading: boolean;
  error: string | null;
  parseQRCode: (qrData: string) => Promise<{ commitment: string; success: boolean }>;
  registerIdentity: (commitment: string, merkleRoot: string) => Promise<boolean>;
  generateProof: (attributeType: string, privateInputs: any, publicInputs: any) => Promise<any>;
  verifyIdentity: (proof: any, publicSignals: any, attributeType: string) => Promise<boolean>;
  fetchIdentity: (walletAddress: string) => Promise<void>;
  createSession: () => Promise<string | null>;
}

const SolsticeContext = createContext<SolsticeContextType | undefined>(undefined);

export function SolsticeProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseQRCode = useCallback(async (qrData: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/identity/parse-qr`, { qrData });
      
      return {
        commitment: response.data.commitment,
        success: response.data.success
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to parse QR code';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerIdentity = useCallback(async (commitment: string, merkleRoot: string) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Registering identity on-chain...');
      
      // Create Anchor provider and program
      const provider = createProvider(wallet as AnchorWallet, connection);
      const program = getSolsticeProgram(provider);

      // Register identity on-chain with actual transaction
      const txSignature = await registerIdentityOnChain(
        program,
        wallet.publicKey,
        commitment,
        merkleRoot
      );

      console.log('✅ Identity registered on-chain:', txSignature);

      // Update backend database with real transaction signature
      const response = await axios.post(`${API_BASE_URL}/identity/register`, {
        walletAddress: wallet.publicKey.toString(),
        commitment,
        merkleRoot,
        txSignature // Real transaction signature
      });

      if (response.data.success) {
        await fetchIdentity(wallet.publicKey.toString());
        console.log('✅ Backend database updated');
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('❌ Registration failed:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to register identity';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [wallet, connection]);

  const generateProof = useCallback(async (attributeType: string, privateInputs: any, publicInputs: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/proof/generate`, {
        attributeType,
        privateInputs,
        publicInputs
      });

      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to generate proof';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyIdentity = useCallback(async (proof: any, publicSignals: any, attributeType: string) => {
    if (!wallet.publicKey) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Verifying proof off-chain...');

      // Verify proof off-chain first
      const verifyResponse = await axios.post(`${API_BASE_URL}/proof/verify`, {
        proof,
        publicSignals,
        attributeType
      });

      if (!verifyResponse.data.isValid) {
        console.error('❌ Proof verification failed');
        setError('Invalid proof');
        return false;
      }

      console.log('✅ Proof verified off-chain');
      console.log('🔄 Submitting proof on-chain...');

      // Create Anchor provider and program
      const provider = createProvider(wallet as AnchorWallet, connection);
      const program = getSolsticeProgram(provider);

      // Verify on-chain with actual proof submission
      const txSignature = await verifyIdentityOnChain(
        program,
        wallet.publicKey,
        proof,
        publicSignals,
        attributeType as 'age' | 'nationality' | 'uniqueness'
      );

      console.log('✅ Proof verified on-chain:', txSignature);

      // Update backend with real transaction signature
      const submitResponse = await axios.post(`${API_BASE_URL}/proof/submit`, {
        walletAddress: wallet.publicKey.toString(),
        attributeType,
        txSignature // Real transaction signature
      });

      if (submitResponse.data.success) {
        await fetchIdentity(wallet.publicKey.toString());
        console.log('✅ Backend database updated');
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('❌ Verification failed:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to verify identity';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [wallet, connection]);

  const fetchIdentity = useCallback(async (walletAddress: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/identity/${walletAddress}`);
      
      if (response.data.success) {
        setIdentity(response.data.identity);
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error('Error fetching identity:', err);
      }
      setIdentity(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signMessage) {
      setError('Wallet not connected');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: Sign message for authentication
      const message = `Solstice Protocol Session: ${Date.now()}`;
      const signature = 'mock-signature'; // await wallet.signMessage(Buffer.from(message));

      const response = await axios.post(`${API_BASE_URL}/auth/create-session`, {
        walletAddress: wallet.publicKey.toString(),
        signature
      });

      return response.data.token;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to create session';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  const value = {
    identity,
    loading,
    error,
    parseQRCode,
    registerIdentity,
    generateProof,
    verifyIdentity,
    fetchIdentity,
    createSession
  };

  return <SolsticeContext.Provider value={value}>{children}</SolsticeContext.Provider>;
}

export function useSolstice() {
  const context = useContext(SolsticeContext);
  if (context === undefined) {
    throw new Error('useSolstice must be used within a SolsticeProvider');
  }
  return context;
}
