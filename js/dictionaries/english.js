// Eumenides - English Language Dictionary
// English aggression detection dictionary

const ENGLISH_DICTIONARY = {
  language_code: 'en',
  language_name: 'English',

  anger_words: [
    // Insults & derogatory terms
    'idiot', 'moron', 'imbecile', 'fool', 'dumbass', 'dumb',
    'stupid', 'retard', 'retarded', 'brain-dead', 'brainless',
    'ignorant', 'clueless', 'dense', 'thick', 'dimwit',
    'jackass', 'jerk', 'asshole', 'dickhead', 'prick', 'dick',
    'bastard', 'son of a bitch', 'sob', 'motherfucker', 'mf',
    'bitch', 'whore', 'slut', 'cunt', 'twat', 'pussy',
    'scumbag', 'douchebag', 'douche', 'tool', 'clown', 'joke',
    'loser', 'failure', 'reject', 'outcast', 'nobody', 'nothing',
    'weakling', 'coward', 'chicken', 'spineless', 'gutless',

    // Profanity & vulgar expressions
    'fuck', 'fucking', 'fucked', 'fucker', 'fck', 'fuk',
    'shit', 'shitty', 'bullshit', 'bs', 'crap', 'crappy',
    'damn', 'goddamn', 'hell', 'bloody', 'freaking',
    'screw you', 'piss off', 'shove it', 'bite me',
    'stfu', 'shut the fuck up', 'fuck off', 'get fucked',

    // Negative character judgments
    'incompetent', 'useless', 'worthless', 'hopeless', 'helpless',
    'pathetic', 'pitiful', 'miserable', 'wretched', 'sorry',
    'ridiculous', 'absurd', 'laughable', 'ludicrous', 'preposterous',
    'moronic', 'idiotic', 'asinine', 'foolish', 'senseless',
    'mindless', 'thoughtless', 'reckless', 'careless', 'negligent',
    'incompetent', 'inept', 'inadequate', 'subpar', 'mediocre',
    'terrible', 'awful', 'horrible', 'dreadful', 'atrocious',

    // Extreme negativity
    'disgusting', 'revolting', 'repulsive', 'vile', 'foul',
    'nasty', 'gross', 'sick', 'sickening', 'nauseating',
    'appalling', 'abysmal', 'deplorable', 'shameful', 'disgraceful',
    'despicable', 'contemptible', 'abhorrent', 'odious', 'heinous',
    'monstrous', 'hideous', 'ghastly', 'horrendous', 'horrid',

    // Intense disapproval
    'unacceptable', 'intolerable', 'insufferable', 'unbearable',
    'outrageous', 'scandalous', 'shocking', 'appalling',
    'offensive', 'insulting', 'disrespectful', 'rude',
    'inappropriate', 'improper', 'wrong', 'evil', 'wicked',

    // Unfair/unjust
    'unfair', 'unjust', 'biased', 'prejudiced', 'discriminatory',
    'dishonest', 'corrupt', 'crooked', 'shady', 'sketchy',

    // Malicious intent
    'toxic', 'poisonous', 'venomous', 'malicious', 'vicious',
    'cruel', 'sadistic', 'brutal', 'savage', 'barbaric',
    'evil', 'wicked', 'sinister', 'nefarious', 'villainous',
    'harmful', 'damaging', 'destructive', 'cancerous',

    // Trash/garbage metaphors
    'trash', 'garbage', 'rubbish', 'junk', 'waste', 'filth',
    'scum', 'vermin', 'parasite', 'leech', 'rat', 'worm',

    // Mental state insults
    'crazy', 'insane', 'mad', 'psycho', 'lunatic', 'maniac',
    'deranged', 'delusional', 'nuts', 'bonkers', 'mental',
    'unhinged', 'unstable', 'disturbed', 'twisted', 'warped',

    // Competence attacks
    'amateur', 'hack', 'fraud', 'fake', 'phony', 'charlatan',
    'pretender', 'wannabe', 'has-been', 'never-was',

    // Social rejection
    'loner', 'outcast', 'reject', 'unwanted', 'unloved',
    'friendless', 'alone', 'isolated', 'abandoned',

    // Additional profanity variations
    'gtfo', 'stfu', 'ffs', 'pos', 'piece of shit',
    'shithead', 'shitface', 'dipshit', 'horseshit',
    'cocksucker', 'wanker', 'tosser', 'bellend', 'knobhead'
  ],

  very_negative_words: [
    'hate', 'hatred', 'despise', 'loathe', 'detest',
    'kill', 'die', 'death', 'dead', 'murder', 'destroy',
    'fucking hate', 'piece of shit', 'pos',
    'kys', 'kill yourself', 'go die', 'drop dead',
    'cancer', 'terrorist', 'nazi', 'fascist',
    'rape', 'rapist', 'genocide', 'massacre', 'slaughter'
  ],

  frustration_words: [
    'seriously', 'really', 'honestly', 'literally', 'actually',
    'obviously', 'clearly', 'evidently', 'apparently',
    'annoying', 'irritating', 'frustrating', 'infuriating',
    'maddening', 'aggravating', 'exasperating', 'tiresome',
    'tedious', 'boring', 'dull', 'bland', 'lame',
    'ugh', 'urgh', 'argh', 'gah', 'sigh', 'ffs', 'smh',
    'again', 'still', 'always', 'never', 'every time',
    'how', 'why', 'what', 'wtf', 'omg', 'fml',
    'unbelievable', 'incredible', 'ridiculous', 'absurd',
    'come on', 'gimme a break', 'for real', 'no way'
  ]
};

// Export for use in aggression-detector.js
if (typeof window !== 'undefined') {
  window.EUMENIDES_DICTIONARIES = window.EUMENIDES_DICTIONARIES || {};
  window.EUMENIDES_DICTIONARIES.en = ENGLISH_DICTIONARY;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ENGLISH_DICTIONARY;
}
