// Eumenides - German Language Dictionary
// Deutsches Wörterbuch zur Aggressionserkennung

const GERMAN_DICTIONARY = {
  language_code: 'de',
  language_name: 'Deutsch',

  anger_words: [
    // Insults (Beleidigungen)
    'idiot', 'dummkopf', 'trottel', 'vollidiot', 'schwachkopf',
    'arschloch', 'arsch', 'scheiße', 'scheiß', 'mist',
    'blöd', 'blödmann', 'depp', 'vollpfosten', 'spacken',
    'hurensohn', 'wichser', 'fotze', 'nutte', 'schlampe',
    'drecksau', 'schwein', 'sau', 'mistkerl', 'penner',

    // Negative judgments (Negative Bewertungen)
    'schrecklich', 'furchtbar', 'grässlich', 'ekelhaft', 'widerlich',
    'erbärmlich', 'lächerlich', 'absurd', 'bescheuert', 'dämlich',
    'nutzlos', 'unfähig', 'inkompetent', 'katastrophal',
    'jämmerlich', 'kläglich', 'armselig', 'mickrig',
    'dumm', 'doof', 'beschränkt', 'hirnlos', 'geistlos',

    // Extreme negativity (Extreme Negativität)
    'abscheulich', 'widerlich', 'ekelhaft', 'abstoßend',
    'scheußlich', 'grauenhaft', 'grausam', 'brutal',
    'unmenschlich', 'barbarisch', 'sadistisch', 'pervers',
    'dreckig', 'versaut', 'verdorben', 'verfault',

    // Vulgar expressions (Vulgäre Ausdrücke)
    'scheiße', 'kacke', 'kotzen', 'kotze', 'pissen',
    'verdammt', 'verflucht', 'verfickt', 'beschissen',
    'fick dich', 'verpiss dich', 'leck mich',

    // Worthlessness (Wertlosigkeit)
    'nichts', 'niemand', 'versager', 'loser', 'verlierer',
    'taugenichts', 'nichtsnutz', 'abschaum', 'pack'
  ],

  very_negative_words: [
    'hass', 'hassen', 'töten', 'sterben', 'tot', 'tod',
    'fick dich', 'verpiss dich', 'verrecke', 'krepier',
    'umbringen', 'mord', 'vergewaltigung', 'terrorist',
    'nazi', 'faschist'
  ],

  frustration_words: [
    'ernsthaft', 'echt jetzt', 'schon wieder', 'immer', 'nie',
    'nervig', 'lästig', 'ärgerlich', 'frustrierend',
    'oh mann', 'meine güte', 'unglaublich', 'unmöglich',
    'wie', 'warum', 'was', 'bitte', 'ach', 'mensch'
  ]
};

// Export for use in aggression-detector.js
if (typeof window !== 'undefined') {
  window.EUMENIDES_DICTIONARIES = window.EUMENIDES_DICTIONARIES || {};
  window.EUMENIDES_DICTIONARIES.de = GERMAN_DICTIONARY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GERMAN_DICTIONARY;
}
