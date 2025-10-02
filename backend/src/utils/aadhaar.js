import NodeRSA from 'node-rsa';
import { Buffer } from 'buffer';

/**
 * Parse Aadhaar QR code data
 * QR code format: Version|Name|DOB|Gender|Address|Photo|Signature
 */
export function parseAadhaarQR(qrData) {
    try {
        let parts;
        
        // Try to parse as base64 first
        try {
            const decoded = Buffer.from(qrData, 'base64');
            parts = decoded.toString('utf8').split('|');
        } catch (e) {
            // If not base64, try parsing as plain text
            console.log('QR data is not base64, parsing as plain text');
            parts = qrData.split('|');
        }
        
        if (parts.length < 7) {
            console.error('Invalid Aadhaar QR format - insufficient fields:', parts.length);
            throw new Error(`Invalid Aadhaar QR format - expected at least 7 fields, got ${parts.length}`);
        }

        console.log('Successfully parsed Aadhaar QR with', parts.length, 'fields');

        return {
            version: parts[0],
            name: parts[1],
            dob: parts[2],
            gender: parts[3],
            address: parts[4],
            photo: parts[5], // Base64 encoded photo
            signature: parts[6], // RSA signature
            timestamp: Date.now()
        };

    } catch (error) {
        console.error('Error parsing Aadhaar QR:', error);
        throw new Error('Failed to parse Aadhaar QR code: ' + error.message);
    }
}

/**
 * Verify UIDAI RSA 2048-bit digital signature
 * @param {Object} parsedData - Parsed Aadhaar data
 * @returns {Promise<boolean>} - True if signature is valid
 */
export async function verifyAadhaarSignature(parsedData) {
    try {
        // UIDAI public key (2048-bit RSA)
        // In production, fetch this from a secure source
        const UIDAI_PUBLIC_KEY = process.env.UIDAI_PUBLIC_KEY || `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyour-public-key-here
-----END PUBLIC KEY-----
        `;

        const key = new NodeRSA(UIDAI_PUBLIC_KEY, 'public');

        // Create data to verify (everything except signature)
        const dataToVerify = `${parsedData.version}|${parsedData.name}|${parsedData.dob}|${parsedData.gender}|${parsedData.address}|${parsedData.photo}`;

        // Verify signature
        const isValid = key.verify(
            Buffer.from(dataToVerify),
            Buffer.from(parsedData.signature, 'base64'),
            'buffer',
            'base64'
        );

        return isValid;

    } catch (error) {
        console.error('Error verifying Aadhaar signature:', error);
        // In development, return true to allow testing
        if (process.env.NODE_ENV === 'development') {
            console.warn('Development mode: Skipping signature verification');
            return true;
        }
        return false;
    }
}

/**
 * Extract age from date of birth
 * @param {string} dob - Date of birth in DD/MM/YYYY format
 * @returns {number} - Age in years
 */
export function calculateAge(dob) {
    const [day, month, year] = dob.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

/**
 * Check if age is within range
 * @param {string} dob - Date of birth
 * @param {number} minAge - Minimum age
 * @param {number} maxAge - Maximum age
 * @returns {boolean}
 */
export function isAgeInRange(dob, minAge, maxAge = 150) {
    const age = calculateAge(dob);
    return age >= minAge && age <= maxAge;
}
