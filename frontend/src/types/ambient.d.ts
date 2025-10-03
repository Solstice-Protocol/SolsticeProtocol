// Temporary ambient type shims to avoid build errors from upstream TS sources
// These keep the build from failing on Vercel; ideally upstream packages should publish types.

declare module '@anon-aadhaar/core' {
  // Export any so usage compiles; more precise types can be added if necessary
  export const parseAadhaarQR: any;
  export const DEFAULT_OPTIONS: any;
  export type AnonAadhaarClaim = any;
  export type AnonAadhaarProof = any;
  export type DisplayOptions = any;
  export type PCD = any;
  export type PCDPackage = any;
  export type SerializedPCD = any;
  export type InitArgs = any;
  export type AnonAadhaarArgs = any;
  export type ProverInferace = any;
  export default any;
}
