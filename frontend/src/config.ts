// Frontend Configuration
export const config = {
  // Solana
  programId: import.meta.env.VITE_PROGRAM_ID || 'ELqNcvWpY4L5qAe7P4PuEKMo86zrouKctZF3KuSysuYY',
  solanaNetwork: import.meta.env.VITE_SOLANA_NETWORK || 'devnet',
  solanaRpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  
  // API
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  
  // App
  appName: import.meta.env.VITE_APP_NAME || 'Solstice Protocol',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
} as const;

export default config;
