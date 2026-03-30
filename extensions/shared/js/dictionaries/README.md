# Eumenides Language Dictionaries

This directory contains language-specific word dictionaries used by the aggression detection algorithm.

## Supported Languages

- 🇫🇷 **French** (Français) - `french.js`
- 🇬🇧 **English** - `english.js`
- 🇪🇸 **Spanish** (Español) - `spanish.js`
- 🇩🇪 **German** (Deutsch) - `german.js`
- 🇮🇹 **Italian** (Italiano) - `italian.js`
- 🇵🇹 **Portuguese** (Português) - `portuguese.js`

## Adding a New Language

Adding a new language is easy! Follow these steps:

### 1. Create a New Dictionary File

Create a new file named `{language}.js` in this directory (e.g., `japanese.js`, `arabic.js`, `russian.js`).

### 2. Use This Template

```javascript
// Eumenides - {Language Name} Language Dictionary
// {Native language name}

const {LANGUAGE_NAME}_DICTIONARY = {
  language_code: '{iso-code}',  // e.g., 'ja', 'ar', 'ru'
  language_name: '{Language Name}',  // e.g., 'Japanese', '日本語'
  
  anger_words: [
    // Add insults, profanity, and angry words here
    'word1', 'word2', 'word3',
    // Organize by category with comments for clarity
  ],
  
  very_negative_words: [
    // Add extreme negativity, hate speech, violent words
    'hateful1', 'violent1', 'extreme1'
  ],
  
  frustration_words: [
    // Add frustration indicators, exasperation, annoyance
    'frustrating1', 'annoying1', 'ugh'
  ]
};

// Export for use in aggression-detector.js
if (typeof window !== 'undefined') {
  window.EUMENIDES_DICTIONARIES = window.EUMENIDES_DICTIONARIES || {};
  window.EUMENIDES_DICTIONARIES.{iso-code} = {LANGUAGE_NAME}_DICTIONARY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {LANGUAGE_NAME}_DICTIONARY;
}
```

### 3. Add to manifest.json

Edit `/manifest.json` and add your dictionary file to the `content_scripts` section **before** `aggression-detector.js`:

```json
"js": [
  "js/dictionaries/french.js",
  "js/dictionaries/english.js",
  "js/dictionaries/spanish.js",
  "js/dictionaries/german.js",
  "js/dictionaries/italian.js",
  "js/dictionaries/portuguese.js",
  "js/dictionaries/YOUR_NEW_LANGUAGE.js",  // <- Add here
  "js/aggression-detector.js",
  "js/content.js"
]
```

### 4. Test It!

Reload the extension and check the browser console. You should see:

```
Eumenides Aggression Detector loaded:
  → 7 languages
  → {Your Language}: XX words
```

## Word Categories Explained

### `anger_words` (Weight: +2 points each)
Words that express anger, insults, or strong negativity:
- Insults (idiot, stupid, etc.)
- Profanity (shit, fuck, etc.)
- Negative character judgments (incompetent, worthless, etc.)
- Derogatory terms
- Strong disapproval

### `very_negative_words` (Weight: +3 points each)
Extremely negative words that should trigger immediate detection:
- Hate speech
- Violent language (kill, die, murder, etc.)
- Extreme insults
- Threats
- Discriminatory slurs

### `frustration_words` (Weight: +1 point each)
Words indicating frustration, exasperation, or annoyance:
- Exasperation expressions (seriously, really, ugh)
- Temporal frustration (again, always, never)
- Mild complaints (annoying, frustrating)
- Interjections (wtf, omg, ffs)

## Tips for Building Good Dictionaries

1. **Include variations**: singular/plural, masculine/feminine forms
2. **Add common misspellings**: "fuk" for "fuck", "fck" for "fuck"
3. **Include abbreviations**: "wtf", "stfu", "fml"
4. **Consider context**: Some words are aggressive in one language but not in another
5. **Test with real examples**: Try posts in your language to verify detection
6. **Balance sensitivity**: Too many words = false positives, too few = missed aggression

## Example: Adding Japanese

```javascript
// Eumenides - Japanese Language Dictionary
// 日本語の攻撃性検出辞書

const JAPANESE_DICTIONARY = {
  language_code: 'ja',
  language_name: '日本語',
  
  anger_words: [
    // Insults
    '馬鹿', 'バカ', 'ばか', 'アホ', 'あほ', '間抜け',
    'くそ', 'クソ', 'カス', 'ゴミ', '死ね',
    
    // Negative
    '最悪', 'うざい', 'きもい', 'ダサい', '気持ち悪い'
  ],
  
  very_negative_words: [
    '死ね', '殺す', '殺せ', '消えろ'
  ],
  
  frustration_words: [
    'マジで', '本当に', 'ほんとに', 'まじで', 'は？',
    'なんで', 'どうして', 'うざ', 'めんどい'
  ]
};

if (typeof window !== 'undefined') {
  window.EUMENIDES_DICTIONARIES = window.EUMENIDES_DICTIONARIES || {};
  window.EUMENIDES_DICTIONARIES.ja = JAPANESE_DICTIONARY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JAPANESE_DICTIONARY;
}
```

## Contributing

To contribute a new language dictionary:

1. Fork the repository
2. Add your dictionary file following the template
3. Update manifest.json
4. Test thoroughly with native speakers
5. Submit a pull request with examples

## Language Coverage

We welcome dictionaries for:
- 🇯🇵 Japanese (日本語)
- 🇨🇳 Chinese (中文) - Simplified & Traditional
- 🇰🇷 Korean (한국어)
- 🇦🇪 Arabic (العربية)
- 🇷🇺 Russian (Русский)
- 🇳🇱 Dutch (Nederlands)
- 🇸🇪 Swedish (Svenska)
- 🇵🇱 Polish (Polski)
- 🇹🇷 Turkish (Türkçe)
- 🇮🇳 Hindi (हिन्दी)
- And many more!

## Notes

- All dictionaries are loaded automatically on extension startup
- Words are automatically converted to lowercase for matching
- Duplicates across languages are automatically removed
- The system detects aggression in **all loaded languages simultaneously**
- You can add custom words at runtime using `EumenidesDetector.addCustomWord()`

## API Usage

```javascript
// Get statistics about all loaded languages
console.log(EumenidesDetector.getStats());

// Get list of supported languages
console.log(EumenidesDetector.getSupportedLanguages());

// Add a custom word dynamically
EumenidesDetector.addCustomWord('toxic_word', 'anger', 'en');

// Add an entire language dynamically
EumenidesDetector.addLanguage('ja', {
  language_code: 'ja',
  language_name: '日本語',
  anger_words: ['馬鹿', 'くそ'],
  very_negative_words: ['死ね'],
  frustration_words: ['マジで']
});
```

---

**Need help?** Open an issue on GitHub with the `language-request` label!
