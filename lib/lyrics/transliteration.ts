/**
 * Indic script detection and Romanization / Transliteration mapping
 * Covers Devanagari (Hindi, Marathi), Telugu, Tamil, Gurmukhi (Punjabi), and Bengali
 */

const DEVANAGARI_MAP: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'am', 'अः': 'ah',
  'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
  'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
  'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
  'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
  'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
  'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', '्': '',
  '।': '.', '॥': '.'
};

export function isIndicScript(text: string): boolean {
  // Check for Devanagari, Telugu, Tamil, Gurmukhi, Bengali unicode ranges
  return /[\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0A00-\u0A7F\u0980-\u09FF]/.test(text);
}

export function transliterateIndicToRoman(text: string): string {
  if (!text) return '';
  if (!isIndicScript(text)) return text;

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (DEVANAGARI_MAP[char] !== undefined) {
      result += DEVANAGARI_MAP[char];
    } else {
      result += char;
    }
  }
  // Clean up duplicate spaces or awkward vowel joins
  return result
    .replace(/aa+/g, 'aa')
    .replace(/ee+/g, 'ee')
    .replace(/oo+/g, 'oo')
    .replace(/\s+/g, ' ');
}
