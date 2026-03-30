// Eumenides - Spanish Language Dictionary
// Diccionario de detección de agresividad en español

const SPANISH_DICTIONARY = {
  language_code: 'es',
  language_name: 'Español',

  anger_words: [
    // Insults (Insultos)
    'idiota', 'imbécil', 'estúpido', 'tonto', 'pendejo', 'gilipollas',
    'capullo', 'cabrón', 'hijo de puta', 'hdp', 'puta', 'zorra',
    'mierda', 'joder', 'coño', 'carajo', 'chingado', 'pinche',
    'mamón', 'marica', 'maricón', 'puto', 'culero', 'verga',
    'huevón', 'boludo', 'pelotudo', 'tarado', 'retrasado',

    // Negative judgments (Juicios negativos)
    'horrible', 'terrible', 'asqueroso', 'repugnante', 'patético',
    'ridículo', 'absurdo', 'estúpido', 'tonto', 'inútil',
    'basura', 'porquería', 'desastre', 'desastroso',
    'lamentable', 'vergonzoso', 'deplorable', 'mediocre',
    'incompetente', 'inepto', 'torpe', 'inservible',

    // Intense negativity (Negatividad intensa)
    'odioso', 'detestable', 'despreciable', 'miserable', 'vil',
    'malvado', 'perverso', 'cruel', 'salvaje', 'bárbaro',
    'inmundo', 'asqueroso', 'repulsivo', 'nauseabundo',
    'espantoso', 'horroroso', 'monstruoso', 'atroz',

    // Vulgar expressions (Expresiones vulgares)
    'mierda', 'cagada', 'cagar', 'mierdero', 'maldito',
    'jodido', 'jodida', 'chingar', 'chingada', 'chingas',
    'verga', 'vergüenza', 'cochino', 'marrano', 'cerdo',

    // Worthlessness (Sin valor)
    'nada', 'cero', 'fracasado', 'perdedor', 'inútil',
    'basura humana', 'escoria', 'lacra', 'parásito'
  ],

  very_negative_words: [
    'odio', 'odiar', 'matar', 'morir', 'muerte', 'muerto',
    'chingar', 'chinga tu madre', 'vete a la mierda',
    'que te den', 'vete al carajo', 'vete al diablo',
    'muérete', 'suicídate', 'asesino', 'violador',
    'terrorista', 'nazi', 'fascista', 'genocidio'
  ],

  frustration_words: [
    'en serio', 'de verdad', 'otra vez', 'siempre', 'nunca',
    'molesto', 'irritante', 'frustrante', 'cansado', 'harto',
    'dios mío', 'por dios', 'increíble', 'ridículo',
    'caramba', 'cielos', 'ya basta', 'no puede ser',
    'qué pasa', 'cómo', 'por qué', 'uff', 'ay'
  ]
};

// Export for use in aggression-detector.js
if (typeof window !== 'undefined') {
  window.EUMENIDES_DICTIONARIES = window.EUMENIDES_DICTIONARIES || {};
  window.EUMENIDES_DICTIONARIES.es = SPANISH_DICTIONARY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SPANISH_DICTIONARY;
}
