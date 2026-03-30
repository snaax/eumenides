// Eumenides - Portuguese Language Dictionary
// Dicionário português para detecção de agressividade

const PORTUGUESE_DICTIONARY = {
  language_code: 'pt',
  language_name: 'Português',

  anger_words: [
    // Insults (Insultos)
    'idiota', 'imbecil', 'estúpido', 'burro', 'otário',
    'filho da puta', 'fdp', 'puta', 'vadia', 'cachorro',
    'merda', 'bosta', 'porra', 'caralho', 'foda-se',
    'babaca', 'imbecil', 'retardado', 'débil mental',
    'cuzão', 'cu', 'viado', 'bicha', 'paneleiro',

    // Negative judgments (Julgamentos negativos)
    'horrível', 'terrível', 'nojento', 'repugnante', 'patético',
    'ridículo', 'absurdo', 'inútil', 'incompetente',
    'lixo', 'porcaria', 'desastre', 'péssimo',
    'miserável', 'deplorável', 'vergonhoso', 'lamentável',

    // Extreme negativity (Negatividade extrema)
    'odioso', 'detestável', 'desprezível', 'abjeto',
    'imundo', 'fedorento', 'asqueroso', 'repulsivo',
    'monstruoso', 'horrendo', 'atroz', 'horripilante',

    // Vulgar expressions (Expressões vulgares)
    'puta que pariu', 'filho da puta', 'puta merda',
    'vai tomar no cu', 'vai se foder', 'vai pro inferno',
    'vai à merda', 'cala a boca', 'cala-te',

    // Malicious (Malicioso)
    'malvado', 'mau', 'cruel', 'sádico',
    'perverso', 'vil', 'covarde', 'infame',

    // Worthlessness (Sem valor)
    'nada', 'ninguém', 'zero', 'fracassado',
    'perdedor', 'falhado', 'inútil', 'preguiçoso',
    'lixo humano', 'escória', 'parasita', 'verme'
  ],

  very_negative_words: [
    'ódio', 'odiar', 'matar', 'morrer', 'morte', 'morto',
    'vai se foder', 'vai tomar no cu', 'vai pro inferno',
    'foda-se', 'puta que pariu', 'assassino',
    'estuprador', 'terrorista', 'nazista', 'fascista'
  ],

  frustration_words: [
    'sério', 'seriamente', 'de novo', 'sempre', 'nunca',
    'chato', 'irritante', 'frustrante', 'cansativo',
    'meu deus', 'caramba', 'inacreditável', 'ridículo',
    'poxa', 'droga', 'ai', 'nossa', 'pô', 'putz'
  ]
};

// Export for use in aggression-detector.js
if (typeof window !== 'undefined') {
  window.EUMENIDES_DICTIONARIES = window.EUMENIDES_DICTIONARIES || {};
  window.EUMENIDES_DICTIONARIES.pt = PORTUGUESE_DICTIONARY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PORTUGUESE_DICTIONARY;
}
