// Eumenides - French Language Dictionary
// Dictionnaire de détection d'agressivité en français

const FRENCH_DICTIONARY = {
  language_code: 'fr',
  language_name: 'Français',

  anger_words: [
    // Insults & derogatory terms (Insultes et termes péjoratifs)
    'con', 'conne', 'connard', 'connasse', 'salaud', 'salope', 'ordure',
    'idiot', 'idiote', 'imbécile', 'crétin', 'crétine', 'débile', 'abruti',
    'enfoiré', 'enculé', 'pute', 'fils de pute', 'fdp', 'pd', 'enculer',
    'taré', 'tarée', 'cinglé', 'dingue', 'malade', 'tordu', 'tordue',
    'demeuré', 'attardé', 'mongolien', 'trisomique', 'autiste',

    // Profanity & vulgar expressions (Vulgarités)
    'merde', 'putain', 'bordel', 'chier', 'foutre', 'niquer',
    'emmerdeur', 'emmerdeuse', 'emmerdant', 'emmerdante', 'chiant', 'chiante',
    'casse-couilles', 'casse-burnes', 'fait chier', 'va te faire',

    // Negative character judgments (Jugements négatifs)
    'incompétent', 'incompétente', 'nul', 'nulle', 'minable', 'nullité',
    'pathétique', 'lamentable', 'pitoyable', 'ridicule', 'grotesque',
    'aberrant', 'aberrante', 'absurde', 'stupide', 'bête',
    'médiocre', 'pourri', 'pourrie', 'foutu', 'foutue',

    // Extreme negativity (Négativité extrême)
    'horrible', 'atroce', 'abominable', 'dégueulasse', 'dégoûtant',
    'répugnant', 'ignoble', 'infâme', 'immonde', 'infecte', 'sordide',
    'hideux', 'hideuse', 'monstrueux', 'monstrueuse', 'odieux', 'odieuse',
    'abject', 'abjecte', 'vil', 'vile', 'innommable',

    // Intense disapproval (Désapprobation intense)
    'insupportable', 'inacceptable', 'inadmissible', 'intolérable',
    'scandaleux', 'scandaleuse', 'honteux', 'honteuse', 'révoltant',
    'choquant', 'choquante', 'consternant', 'consternante',
    'catastrophique', 'désastreux', 'désastreuse', 'déplorable',
    'navrant', 'navrante', 'affligeant', 'affligeante',

    // Unfair/unjust (Injuste)
    'injuste', 'injustifiable', 'indéfendable', 'incompréhensible',
    'hors de question', 'pas question',

    // Malicious intent (Intention malveillante)
    'vicieux', 'vicieuse', 'malveillant', 'malveillante', 'toxique',
    'nocif', 'nocive', 'néfaste', 'pervers', 'perverse', 'sadique',
    'méchant', 'méchante', 'cruel', 'cruelle', 'barbare',

    // Worthlessness (Sans valeur)
    'rien', 'zéro', 'nullard', 'raté', 'ratée', 'loser', 'perdant',
    'bon à rien', 'incapable', 'inutile', 'fainéant',

    // Dehumanizing (Déshumanisant)
    'déchet', 'rebut', 'sous-merde', 'sous-homme', 'parasite', 'vermine',

    // Contempt expressions (Expressions de mépris)
    'méprisable', 'mépris', 'exécrable', 'démentiel', 'démentielle',
    'délirant', 'délirante', 'aberration', 'farce', 'blague', 'bouffon',

    // Additional vulgarities
    'connerie', 'conneries', 'foutaise', 'branler', 'branleur',
    'enculé de ta race', 'ta gueule', 'ferme ta gueule', 'ta race',
    'nique', 'nique ta mère', 'ntm', 'batard', 'fumier', 'ordure'
  ],

  very_negative_words: [
    'haine', 'déteste', 'détester', 'crever', 'mort', 'tuer',
    'enculer', 'niquer sa mère', 'ntm', 'nique ta mère',
    'va mourir', 'crève', 'suicide', 'cancer', 'sida',
    'sale race', 'racaille', 'terroriste', 'fasciste', 'nazi',
    'violer', 'viol', 'assassin', 'massacre', 'génocide'
  ],

  frustration_words: [
    'sérieusement', 'franchement', 'vraiment', 'sincèrement',
    'frustrant', 'frustrante', 'énervant', 'énervante',
    'agaçant', 'agaçante', 'irritant', 'irritante',
    'pénible', 'gonflant', 'gonflante', 'saoulant', 'saoulante',
    'insensé', 'insensée', 'dément', 'démente',
    'n\'importe quoi', 'quoi', 'encore', 'toujours', 'jamais',
    'comment', 'pourquoi', 'pfff', 'tss', 'bref',
    'la honte', 'honte', 'gênant', 'gênante', 'embarrassant',
    'oh la la', 'purée', 'punaise', 'zut', 'flûte'
  ]
};

// Export for use in aggression-detector.js
if (typeof window !== 'undefined') {
  window.EUMENIDES_DICTIONARIES = window.EUMENIDES_DICTIONARIES || {};
  window.EUMENIDES_DICTIONARIES.fr = FRENCH_DICTIONARY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FRENCH_DICTIONARY;
}
