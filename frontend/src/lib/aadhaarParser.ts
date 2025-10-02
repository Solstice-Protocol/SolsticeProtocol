/**
 * Aadhaar QR Code Parser
 * Uses @anon-aadhaar/core library for proper mAadhaar QR parsing
 * Based on implementation from Self Protocol: https://github.com/selfxyz/self
 */

import { convertBigIntToByteArray, decompressByteArray } from '@anon-aadhaar/core';

export interface AadhaarData {
  name: string;
  dateOfBirth: string; // DD/MM/YYYY format
  gender: string; // 'M' or 'F'
  address: string;
  aadhaarLast4Digits: string;
  pincode?: string;
  state?: string;
  photo?: string; // Base64 encoded if available
}

/**
 * Field positions in Aadhaar QR data (after delimiters)
 * Based on @anon-aadhaar/core constants
 */
const FIELD_POSITIONS = {
  REFERENCE_ID: 2,
  NAME: 3,
  DOB: 4,
  GENDER: 5,
  PINCODE: 11,
  STATE: 13,
  PHONE_NO: 17,
  PHOTO: 18,
} as const;

/**
 * Parse mAadhaar QR code data
 * @param qrData - Numeric string from mAadhaar QR code
 * @returns Parsed Aadhaar data
 */
export function parseAadhaarQR(qrData: string): AadhaarData {
  // Validate input is a numeric string
  if (!/^\d+$/.test(qrData)) {
    throw new Error(
      'Invalid QR code format. Expected numeric string from mAadhaar app. ' +
      'QR codes from physical Aadhaar cards use a different format.'
    );
  }

  if (qrData.length < 100) {
    throw new Error(
      'QR code too short. mAadhaar QR codes are typically several hundred characters long.'
    );
  }

  console.log('📱 Parsing mAadhaar QR code...');
  console.log('📊 QR data length:', qrData.length, 'characters');

  try {
    // Step 1: Convert BigInt string to byte array
    console.log('🔄 Converting BigInt to bytes...');
    const qrDataBytes = convertBigIntToByteArray(BigInt(qrData));
    console.log('✅ Converted to', qrDataBytes.length, 'bytes');

    // Step 2: Decompress the byte array
    console.log('🔄 Decompressing data...');
    const decodedData = decompressByteArray(qrDataBytes);
    console.log('✅ Decompressed to', decodedData.length, 'bytes');

    // Step 3: Extract signed data (everything except last 256 bytes which is signature)
    const signedData = decodedData.slice(0, decodedData.length - 256);
    console.log('📋 Signed data:', signedData.length, 'bytes');

    // Step 4: Find delimiter indices (byte value 255)
    const delimiterIndices: number[] = [];
    for (let i = 0; i < signedData.length; i++) {
      if (signedData[i] === 255) {
        delimiterIndices.push(i);
        if (delimiterIndices.length === 18) {
          break; // We need 18 delimiters
        }
      }
    }

    console.log('📋 Found', delimiterIndices.length, 'delimiters');

    if (delimiterIndices.length < 7) {
      throw new Error(
        `Insufficient delimiters found: ${delimiterIndices.length}/18. ` +
        'This might not be a valid mAadhaar QR code.'
      );
    }

    // Step 5: Extract fields between delimiters
    const extractField = (position: number): string => {
      if (position >= delimiterIndices.length) {
        return '';
      }
      const startIdx = delimiterIndices[position - 1] + 1;
      const endIdx = delimiterIndices[position];
      const bytes = signedData.slice(startIdx, endIdx) as Uint8Array;
      return Array.from(bytes)
        .map(b => String.fromCharCode(b as number))
        .join('')
        .trim();
    };

    // Extract Aadhaar last 4 digits (field 0-1)
    const aadhaarBytes = signedData.slice(5, 9) as Uint8Array;
    const aadhaarLast4Digits = Array.from(aadhaarBytes)
      .map(b => String.fromCharCode(b as number))
      .join('');

    // Extract name (field 3)
    const name = extractField(FIELD_POSITIONS.NAME);

    // Extract DOB (field 4) - format: DD-MM-YYYY
    const dobRaw = extractField(FIELD_POSITIONS.DOB);
    const dobParts = dobRaw.split('-');
    const dateOfBirth = dobParts.length === 3
      ? `${dobParts[0]}/${dobParts[1]}/${dobParts[2]}`
      : dobRaw.replace(/-/g, '/');

    // Extract gender (field 5)
    const gender = extractField(FIELD_POSITIONS.GENDER);

    // Extract address (fields 6-10, concatenated)
    let address = '';
    for (let i = 6; i <= 10; i++) {
      const part = extractField(i);
      if (part) {
        address += (address ? ', ' : '') + part;
      }
    }

    // Extract pincode (field 11)
    const pincode = extractField(FIELD_POSITIONS.PINCODE);

    // Extract state (field 13)
    const state = extractField(FIELD_POSITIONS.STATE);

    const parsedData: AadhaarData = {
      name,
      dateOfBirth,
      gender,
      address: address || 'Address not available',
      aadhaarLast4Digits,
      pincode: pincode || undefined,
      state: state || undefined,
    };

    console.log('✅ Successfully parsed mAadhaar QR code!');
    console.log('   Name:', parsedData.name);
    console.log('   DOB:', parsedData.dateOfBirth);
    console.log('   Gender:', parsedData.gender);
    console.log('   Address:', parsedData.address.substring(0, 50) + '...');
    console.log('   Aadhaar last 4:', parsedData.aadhaarLast4Digits);
    console.log('   Pincode:', parsedData.pincode);
    console.log('   State:', parsedData.state);

    return parsedData;

  } catch (error: any) {
    console.error('❌ Error parsing Aadhaar QR code:', error);
    throw new Error(
      `Failed to parse mAadhaar QR code: ${error.message}. ` +
      'Please ensure you are using the latest mAadhaar app and uploading ' +
      'the "Share QR Code" screenshot (not profile QR or physical card).'
    );
  }
}

/**
 * Check if QR data is from mAadhaar app (numeric string)
 */
export function isMadhaarQR(qrData: string): boolean {
  return /^\d+$/.test(qrData) && qrData.length >= 100;
}

/**
 * Check if QR data is from physical card (XML format)
 */
export function isPhysicalCardQR(qrData: string): boolean {
  return (
    qrData.includes('<?xml') ||
    qrData.includes('<PrintLetterBarcodeData') ||
    qrData.includes('<UidData')
  );
}
