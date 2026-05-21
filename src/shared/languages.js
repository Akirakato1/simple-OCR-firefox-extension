const LANGUAGE_RECORDS = Object.freeze({
  AR: {
    name: 'Arabic',
    countries: ['Algeria', 'Bahrain', 'Egypt', 'Iraq', 'Jordan', 'Kuwait', 'Lebanon', 'Libya', 'Morocco', 'Oman', 'Palestine', 'Qatar', 'Saudi Arabia', 'Sudan', 'Syria', 'Tunisia', 'United Arab Emirates', 'Yemen'],
    aliases: ['ARA', 'ARABIC']
  },
  BG: {
    name: 'Bulgarian',
    countries: ['Bulgaria'],
    aliases: ['BUL', 'BULGARIAN']
  },
  CS: {
    name: 'Czech',
    countries: ['Czechia'],
    aliases: ['CZE', 'CZECH']
  },
  DA: {
    name: 'Danish',
    countries: ['Denmark'],
    aliases: ['DAN', 'DANISH']
  },
  DE: {
    name: 'German',
    countries: ['Austria', 'Germany', 'Liechtenstein', 'Switzerland'],
    aliases: ['GER', 'DEU', 'GERMAN']
  },
  EL: {
    name: 'Greek',
    countries: ['Cyprus', 'Greece'],
    aliases: ['GRE', 'ELL', 'GREEK']
  },
  EN: {
    name: 'English',
    countries: ['Australia', 'Canada', 'Ireland', 'New Zealand', 'United Kingdom', 'United States'],
    aliases: ['ENG', 'ENGLISH']
  },
  ES: {
    name: 'Spanish',
    countries: ['Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Dominican Republic', 'Ecuador', 'El Salvador', 'Equatorial Guinea', 'Guatemala', 'Honduras', 'Mexico', 'Nicaragua', 'Panama', 'Paraguay', 'Peru', 'Spain', 'Uruguay', 'Venezuela'],
    aliases: ['SPA', 'SPANISH']
  },
  FI: {
    name: 'Finnish',
    countries: ['Finland'],
    aliases: ['FIN', 'FINNISH']
  },
  FR: {
    name: 'French',
    countries: ['Belgium', 'France', 'Haiti', 'Luxembourg', 'Monaco', 'Switzerland'],
    aliases: ['FRE', 'FRA', 'FRENCH']
  },
  HR: {
    name: 'Croatian',
    countries: ['Croatia'],
    aliases: ['HRV', 'CRO', 'CROATIAN']
  },
  HU: {
    name: 'Hungarian',
    countries: ['Hungary'],
    aliases: ['HUN', 'HUNGARIAN']
  },
  IT: {
    name: 'Italian',
    countries: ['Italy', 'San Marino', 'Switzerland', 'Vatican City'],
    aliases: ['ITA', 'ITALIAN']
  },
  JA: {
    name: 'Japanese',
    countries: ['Japan'],
    aliases: ['JPN', 'JAPANESE']
  },
  KO: {
    name: 'Korean',
    countries: ['North Korea', 'South Korea'],
    aliases: ['KOR', 'KOREAN']
  },
  NL: {
    name: 'Dutch',
    countries: ['Belgium', 'Netherlands', 'Suriname'],
    aliases: ['DUT', 'NLD', 'DUTCH']
  },
  PL: {
    name: 'Polish',
    countries: ['Poland'],
    aliases: ['POL', 'POLISH']
  },
  PT: {
    name: 'Portuguese',
    countries: ['Brazil', 'Portugal'],
    aliases: ['POR', 'PORTUGUESE']
  },
  RU: {
    name: 'Russian',
    countries: ['Belarus', 'Russia'],
    aliases: ['RUS', 'RUSSIAN']
  },
  SL: {
    name: 'Slovenian',
    countries: ['Slovenia'],
    aliases: ['SLV', 'SLOVENIAN']
  },
  SV: {
    name: 'Swedish',
    countries: ['Sweden'],
    aliases: ['SWE', 'SWEDISH']
  },
  BN: {
    name: 'Bengali',
    countries: ['Bangladesh', 'India'],
    aliases: ['BEN', 'BENGALI']
  },
  FA: {
    name: 'Persian',
    countries: ['Iran'],
    aliases: ['FAS', 'PER', 'PERSIAN']
  },
  GU: {
    name: 'Gujarati',
    countries: ['India'],
    aliases: ['GUJ', 'GUJARATI']
  },
  HE: {
    name: 'Hebrew',
    countries: ['Israel'],
    aliases: ['HEB', 'IW', 'HEBREW']
  },
  HI: {
    name: 'Hindi',
    countries: ['India'],
    aliases: ['HIN', 'HINDI']
  },
  ID: {
    name: 'Indonesian',
    countries: ['Indonesia'],
    aliases: ['IND', 'INDONESIAN']
  },
  KN: {
    name: 'Kannada',
    countries: ['India'],
    aliases: ['KAN', 'KANNADA']
  },
  ML: {
    name: 'Malayalam',
    countries: ['India'],
    aliases: ['MAL', 'MALAYALAM']
  },
  MR: {
    name: 'Marathi',
    countries: ['India'],
    aliases: ['MAR', 'MARATHI']
  },
  MS: {
    name: 'Malay',
    countries: ['Brunei', 'Malaysia'],
    aliases: ['MAY', 'MSA', 'MALAY']
  },
  PA: {
    name: 'Punjabi',
    countries: ['India', 'Pakistan'],
    aliases: ['PAN', 'PUNJABI']
  },
  TH: {
    name: 'Thai',
    countries: ['Thailand'],
    aliases: ['THA', 'THAI']
  },
  TA: {
    name: 'Tamil',
    countries: ['India', 'Singapore', 'Sri Lanka'],
    aliases: ['TAM', 'TAMIL']
  },
  TE: {
    name: 'Telugu',
    countries: ['India'],
    aliases: ['TEL', 'TELUGU']
  },
  TR: {
    name: 'Turkish',
    countries: ['Cyprus', 'Turkey'],
    aliases: ['TUR', 'TURKISH']
  },
  UR: {
    name: 'Urdu',
    countries: ['India', 'Pakistan'],
    aliases: ['URD', 'URDU']
  },
  UK: {
    name: 'Ukrainian',
    countries: ['Ukraine'],
    aliases: ['UKR', 'UKRAINIAN']
  },
  VI: {
    name: 'Vietnamese',
    countries: ['Vietnam'],
    aliases: ['VIE', 'VIETNAMESE']
  },
  'ZH-CN': {
    name: 'Chinese (Simplified)',
    countries: ['China', 'Singapore'],
    aliases: ['CHS', 'ZH-HANS', 'CHINESE SIMPLIFIED']
  },
  'ZH-TW': {
    name: 'Chinese (Traditional)',
    countries: ['Taiwan'],
    aliases: ['CHT', 'ZH-HANT', 'CHINESE TRADITIONAL']
  }
});

const LANGUAGE_ALIASES = new Map();
const LANGUAGE_DISPLAY_NAMES = typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'language' })
  : null;

for (const [code, record] of Object.entries(LANGUAGE_RECORDS)) {
  LANGUAGE_ALIASES.set(code, code);
  for (const alias of record.aliases) {
    LANGUAGE_ALIASES.set(alias, code);
  }
}

export const TARGET_LANGUAGE_OPTIONS = Object.freeze([
  'EN',
  'JA',
  'KO',
  'ZH-CN',
  'ZH-TW',
  'ES',
  'FR',
  'DE',
  'IT',
  'PT',
  'RU',
  'UK',
  'VI',
  'TH',
  'TR',
  'AR'
]);

function normalizedKey(value) {
  return String(value || '').trim().replace(/_/g, '-').toUpperCase();
}

export function normalizeLanguageCode(value) {
  const key = normalizedKey(value);
  if (!key) {
    return '';
  }
  return LANGUAGE_ALIASES.get(key) || key;
}

export function languageName(value) {
  const code = normalizeLanguageCode(value);
  if (!code) {
    return 'Unknown';
  }
  return LANGUAGE_RECORDS[code]?.name
    || LANGUAGE_DISPLAY_NAMES?.of(code.toLowerCase())
    || String(value).trim();
}

export function languagePairLabel(sourceLanguage, targetLanguage) {
  return `${languageName(sourceLanguage)} -> ${languageName(targetLanguage)}`;
}

export function primaryLanguageCountries(language) {
  const code = normalizeLanguageCode(language);
  return [...(LANGUAGE_RECORDS[code]?.countries || [])];
}

export function filterPrimaryLanguageCountries(language, query = '') {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const countries = primaryLanguageCountries(language);
  if (!normalizedQuery) {
    return countries;
  }
  return countries.filter((country) => country.toLowerCase().includes(normalizedQuery));
}

export function targetLanguageOptions() {
  return TARGET_LANGUAGE_OPTIONS.map((code) => ({
    code,
    name: languageName(code)
  }));
}
