// Eumenides - Italian Language Dictionary
// Dizionario italiano per il rilevamento dell'aggressività

const ITALIAN_DICTIONARY = {
  language_code: 'it',
  language_name: 'Italiano',

  anger_words: [
    // Insults (Insulti)
    'idiota', 'imbecille', 'scemo', 'stupido', 'cretino',
    'stronzo', 'merda', 'cazzo', 'porca', 'puttana',
    'bastardo', 'figlio di puttana', 'vaffanculo', 'fanculo',
    'deficiente', 'demente', 'mongoloide', 'ritardato',
    'pezzo di merda', 'faccia di culo', 'testa di cazzo',

    // Negative judgments (Giudizi negativi)
    'orribile', 'terribile', 'disgustoso', 'ripugnante', 'schifoso',
    'patetico', 'ridicolo', 'assurdo', 'inutile', 'incompetente',
    'pessimo', 'porcheria', 'schifo', 'disastro',
    'miserabile', 'deplorevole', 'vergognoso', 'penoso',

    // Extreme negativity (Negatività estrema)
    'odioso', 'detestabile', 'spregevole', 'abietto',
    'immondo', 'fetido', 'lurido', 'sudicio',
    'mostruoso', 'orrendo', 'atroce', 'raccapricciante',

    // Vulgar expressions (Espressioni volgari)
    'cazzo', 'minchia', 'porco', 'porca madonna',
    'porca miseria', 'porca puttana', 'porco dio',
    'cacchio', 'cavolo', 'accidenti', 'diamine',

    // Malicious (Malevolo)
    'malvagio', 'cattivo', 'crudele', 'sadico',
    'perverso', 'vile', 'vigliacco', 'infame',

    // Worthlessness (Senza valore)
    'nessuno', 'niente', 'zero', 'nullità',
    'perdente', 'fallito', 'sfigato', 'sfigata'
  ],

  very_negative_words: [
    'odio', 'odiare', 'ammazzare', 'morire', 'morte', 'morto',
    'vaffanculo', 'va a morire', 'crepa', 'muori',
    'uccidere', 'assassino', 'terrorista', 'stupratore',
    'nazista', 'fascista'
  ],

  frustration_words: [
    'sul serio', 'davvero', 'di nuovo', 'sempre', 'mai',
    'fastidioso', 'irritante', 'frustrante', 'noioso',
    'dio mio', 'madonna', 'incredibile', 'assurdo',
    'ma dai', 'ma come', 'perché', 'boh', 'basta', 'uffa'
  ]
};

// Export for use in aggression-detector.js
if (typeof window !== 'undefined') {
  window.EUMENIDES_DICTIONARIES = window.EUMENIDES_DICTIONARIES || {};
  window.EUMENIDES_DICTIONARIES.it = ITALIAN_DICTIONARY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ITALIAN_DICTIONARY;
}
