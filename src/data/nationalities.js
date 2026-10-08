/** Tables de correspondance nationalités / pays → codes drapeaux (flagcdn.com) et libellés FR */

/** Drapeaux par nationalité */
export const NATIONALITY_CODES = {
  Dutch: 'nl',
  British: 'gb',
  Monegasque: 'mc',
  Australian: 'au',
  Spanish: 'es',
  Mexican: 'mx',
  German: 'de',
  Finnish: 'fi',
  Canadian: 'ca',
  Danish: 'dk',
  Japanese: 'jp',
  Chinese: 'cn',
  American: 'us',
  Brazilian: 'br',
  French: 'fr',
  Italian: 'it',
  Thai: 'th',
  Russian: 'ru',
  Polish: 'pl',
  Argentine: 'ar',
  Swiss: 'ch',
  Austrian: 'at',
  'New Zealander': 'nz',
  Portuguese: 'pt',
  'South African': 'za',
  Bahraini: 'bh',
  Andorran: 'ad',
  Swedish: 'se',
  Belgian: 'be',
  Venezuelan: 've',
  Indonesian: 'id',
  Korean: 'kr',
  Indian: 'in',
  Argentinian: 'ar'
}

/** Noms FR des nationalités */
export const NATIONALITY_FR = {
  Dutch: 'Néerlandais',
  British: 'Britannique',
  Monegasque: 'Monégasque',
  Australian: 'Australien',
  Spanish: 'Espagnol',
  Mexican: 'Mexicain',
  German: 'Allemand',
  Finnish: 'Finlandais',
  Canadian: 'Canadien',
  Danish: 'Danois',
  Japanese: 'Japonais',
  Chinese: 'Chinois',
  American: 'Américain',
  Brazilian: 'Brésilien',
  French: 'Français',
  Italian: 'Italien',
  Thai: 'Thaïlandais',
  Russian: 'Russe',
  Polish: 'Polonais',
  Argentine: 'Argentin',
  Swiss: 'Suisse',
  Austrian: 'Autrichien',
  'New Zealander': 'Néo-Zélandais',
  Portuguese: 'Portugais',
  'South African': 'Sud-Africain',
  Bahraini: 'Bahreïni',
  Swedish: 'Suédois',
  Venezuelan: 'Vénézuélien',
  Indonesian: 'Indonésien',
  Korean: 'Coréen',
  Indian: 'Indien',
  Argentinian: 'Argentin'
}

/** Drapeaux des pays (courses) */
export const COUNTRY_CODES = {
  Australia: 'au',
  Bahrain: 'bh',
  China: 'cn',
  Japan: 'jp',
  'Saudi Arabia': 'sa',
  USA: 'us',
  'United States': 'us',
  Italy: 'it',
  Monaco: 'mc',
  Spain: 'es',
  Canada: 'ca',
  Austria: 'at',
  UK: 'gb',
  'United Kingdom': 'gb',
  Belgium: 'be',
  Hungary: 'hu',
  Netherlands: 'nl',
  Azerbaijan: 'az',
  Singapore: 'sg',
  Mexico: 'mx',
  Brazil: 'br',
  Qatar: 'qa',
  UAE: 'ae',
  France: 'fr',
  'Las Vegas': 'us',
  Miami: 'us',
  Russia: 'ru',
  Turkey: 'tr',
  Indonesia: 'id',
  Germany: 'de',
  Malaysia: 'my',
  Korea: 'kr',
  India: 'in',
  Argentina: 'ar',
  Portugal: 'pt',
  'South Africa': 'za',
  Sweden: 'se'
}


const flagUrl = (code) => (code ? `https://flagcdn.com/${code}.svg` : '')

export function getNationalityFlag(nationality) {
  return flagUrl(NATIONALITY_CODES[nationality])
}

export function getCountryFlag(country, raceName) {
  const code = COUNTRY_CODES[country] ?? (raceName ? COUNTRY_CODES[raceName.split(' ').pop()] : null)
  return flagUrl(code)
}

export function getNationalityLabel(nationality) {
  return NATIONALITY_FR[nationality] ?? nationality
}
