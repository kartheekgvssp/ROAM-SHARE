/**
 * Formats a date string (YYYY-MM-DD or ISO string) to DD-MM-YYYY
 */
export function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}-${month}-${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  } catch {
    return dateStr || '';
  }
}

/**
 * Converts a DD-MM-YYYY string back to standard YYYY-MM-DD for storage / inputs
 */
export function parseDDMMYYYYToISO(ddmmyyyy: string): string {
  if (!ddmmyyyy) return '';
  const parts = ddmmyyyy.split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return ddmmyyyy;
}

/**
 * Generates a short, clean, human-friendly 6-character unique Trip Code
 * Example: '7K9M2P'
 */
export function generateShortTripCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars like 0, O, 1, I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Ensures any trip ID or string is strictly a 6-digit alphanumeric code
 * Examples: '7K9M2P', 'K4N8M2'
 */
export function getCleanSixDigitTripCode(rawId?: string): string {
  if (!rawId) return generateShortTripCode();
  const cleaned = rawId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length === 6) return cleaned;
  // Deterministic 6-character hash from any longer string
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let hash = 5381;
  for (let i = 0; i < rawId.length; i++) {
    hash = ((hash << 5) + hash + rawId.charCodeAt(i)) >>> 0;
  }
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt((hash >> (i * 4)) % chars.length);
  }
  return code;
}
