/**
 * Données statiques des écuries (non fournies par l'API Jolpica).
 * Couleurs 2026 issues d'OpenF1 (`team_colour`), anciennes écuries en secours pour l'historique.
 */

export const TEAM_COLORS = {
  mercedes: '#00D7B6',
  ferrari: '#ED1131',
  mclaren: '#F47600',
  red_bull: '#4781D7',
  aston_martin: '#229971',
  alpine: '#00A1E8',
  williams: '#1868DB',
  rb: '#6C98FF',
  audi: '#F50537',
  haas: '#9C9FA2',
  cadillac: '#909090',
  // Historique
  sauber: '#52E252',
  alfa: '#C92D4B',
  alphatauri: '#5E8FAA',
  toro_rosso: '#469BFF',
  racing_point: '#F596C8',
  force_india: '#F596C8',
  renault: '#FFF500',
  lotus_f1: '#FFB800',
  manor: '#ED1C24',
  marussia: '#6E0000',
  caterham: '#005030',
  brawn: '#B8FD6E',
  toyota: '#CC0000',
  bmw_sauber: '#6CD3BF',
  honda: '#FFFFFF',
  jordan: '#F9D71C',
  minardi: '#191919',
  benetton: '#00A3E0',
  jaguar: '#004225',
  ligier: '#0055A4',
  tyrrell: '#1D428A',
  brabham: '#1B5E20',
  lotus: '#005030',
}

export const DEFAULT_ACCENT = '#E10600'

export function getTeamColor(constructorId) {
  return TEAM_COLORS[constructorId] ?? '#8A8F98'
}

/** Écuries proposées dans le sélecteur d'écurie favorite (grille 2026) */
export const PICKABLE_TEAMS = [
  { id: 'mercedes', name: 'Mercedes' },
  { id: 'ferrari', name: 'Ferrari' },
  { id: 'mclaren', name: 'McLaren' },
  { id: 'red_bull', name: 'Red Bull' },
  { id: 'aston_martin', name: 'Aston Martin' },
  { id: 'alpine', name: 'Alpine' },
  { id: 'williams', name: 'Williams' },
  { id: 'rb', name: 'Racing Bulls' },
  { id: 'audi', name: 'Audi' },
  { id: 'haas', name: 'Haas' },
  { id: 'cadillac', name: 'Cadillac' },
].map((t) => ({ ...t, color: TEAM_COLORS[t.id] }))

/** Métadonnées de la saison en cours (affichées uniquement pour la saison actuelle) */
export const TEAM_META = {
  mercedes: {
    base: 'Brackley, Royaume-Uni',
    principal: 'Toto Wolff',
    engine: 'Mercedes',
    founded: 2010,
    championships: 8,
    bio: "Après trois saisons dans l'ombre, Mercedes a parfaitement négocié le virage réglementaire de 2026.",
  },
  ferrari: {
    base: 'Maranello, Italie',
    principal: 'Frédéric Vasseur',
    engine: 'Ferrari',
    founded: 1950,
    championships: 16,
    bio: "La Scuderia, l'écurie la plus titrée de l'histoire, aligne Leclerc et Hamilton pour retrouver le sommet.",
  },
  mclaren: {
    base: 'Woking, Royaume-Uni',
    principal: 'Andrea Stella',
    engine: 'Mercedes',
    founded: 1963,
    championships: 10,
    bio: 'Double championne constructeurs en titre, McLaren défend sa couronne avec Norris et Piastri.',
  },
  red_bull: {
    base: 'Milton Keynes, Royaume-Uni',
    principal: 'Laurent Mekies',
    engine: 'Red Bull Ford',
    founded: 2005,
    championships: 6,
    bio: 'Red Bull Racing entre dans une nouvelle ère avec son propre moteur, développé avec Ford.',
  },
  aston_martin: {
    base: 'Silverstone, Royaume-Uni',
    principal: 'Adrian Newey',
    engine: 'Honda',
    founded: 2021,
    championships: 0,
    bio: 'Adrian Newey, Honda et une nouvelle soufflerie : Aston Martin a tout misé sur 2026.',
  },
  alpine: {
    base: 'Enstone, Royaume-Uni',
    principal: 'Flavio Briatore',
    engine: 'Mercedes',
    founded: 1981,
    championships: 2,
    bio: "Héritière de Toleman, Benetton et Renault, l'équipe d'Enstone court désormais avec un moteur Mercedes.",
  },
  williams: {
    base: 'Grove, Royaume-Uni',
    principal: 'James Vowles',
    engine: 'Mercedes',
    founded: 1977,
    championships: 9,
    bio: 'La reconstruction de Williams se poursuit sous la houlette de James Vowles, avec Sainz et Albon.',
  },
  rb: {
    base: 'Faenza, Italie',
    principal: 'Alan Permane',
    engine: 'Red Bull Ford',
    founded: 2006,
    championships: 0,
    bio: "L'équipe sœur de Red Bull reste le tremplin des jeunes talents de la filière.",
  },
  audi: {
    base: 'Hinwil, Suisse',
    principal: 'Jonathan Wheatley',
    engine: 'Audi',
    founded: 1993,
    championships: 0,
    bio: "Sauber devient Audi : le constructeur allemand fait ses débuts en F1 en tant qu'équipe d'usine.",
  },
  haas: {
    base: 'Kannapolis, États-Unis',
    principal: 'Ayao Komatsu',
    engine: 'Ferrari',
    founded: 2016,
    championships: 0,
    bio: 'Haas F1 Team, partenaire de Toyota, poursuit sa progression en milieu de grille.',
  },
  cadillac: {
    base: 'Silverstone, Royaume-Uni / Fishers, États-Unis',
    principal: 'Graeme Lowdon',
    engine: 'Ferrari',
    founded: 2026,
    championships: 0,
    bio: 'Onzième équipe de la grille, Cadillac débarque en F1 avec deux pilotes expérimentés : Bottas et Pérez.',
  },
}

/** Bios des pilotes (non fournies par l'API) */
export const DRIVER_BIOS = {
  norris: 'Champion du monde 2025, Lando Norris porte désormais le numéro 1 chez McLaren.',
  piastri: "Vainqueur de multiples Grands Prix, Oscar Piastri s'est imposé comme l'un des pilotes les plus réguliers du plateau.",
  max_verstappen: "Quadruple champion du monde, Max Verstappen est l'un des pilotes les plus complets de l'histoire de la F1.",
  hadjar: "Révélation de 2025 chez Racing Bulls, Isack Hadjar a été promu chez Red Bull aux côtés de Verstappen.",
  leclerc: 'Le porte-drapeau de Ferrari, Charles Leclerc allie vitesse pure et technique irréprochable.',
  hamilton: 'Septuple champion du monde, Lewis Hamilton écrit le dernier chapitre de sa légende en rouge.',
  russell: 'Leader de Mercedes, George Russell est méthodique et régulier dans sa quête du titre.',
  antonelli: "La pépite Mercedes, Andrea Kimi Antonelli s'est imposé comme le grand favori au titre 2026.",
  albon: 'Alexander Albon est devenu un pilier de Williams, apportant expérience et régularité.',
  sainz: 'Quadruple vainqueur en Grand Prix, Carlos Sainz apporte son expérience précieuse chez Williams.',
  alonso: 'Double champion du monde, Fernando Alonso continue de défier le temps avec une passion intacte.',
  stroll: 'Lance Stroll poursuit sa carrière chez Aston Martin, désormais motorisée par Honda.',
  hulkenberg: "Nico Hülkenberg, l'un des pilotes les plus expérimentés du paddock, mène le projet Audi.",
  bortoleto: 'Champion de F2, Gabriel Bortoleto incarne l’avenir de l’équipe Audi.',
  gasly: 'Pierre Gasly, vainqueur à Monza en 2020, est le leader de l’équipe Alpine.',
  colapinto: 'Franco Colapinto, le prometteur Argentin, cherche à s’imposer chez Alpine.',
  ocon: "Esteban Ocon, vainqueur en Hongrie en 2021, apporte son expérience chez Haas.",
  bearman: 'Oliver Bearman confirme chez Haas le talent entrevu lors de ses débuts remarqués avec Ferrari.',
  lawson: 'Liam Lawson, le talent néo-zélandais, impose son style agressif chez Racing Bulls.',
  arvid_lindblad: 'Arvid Lindblad, plus jeune pilote de la grille, fait ses débuts en F1 chez Racing Bulls.',
  tsunoda: 'Yuki Tsunoda, le pilote japonais au tempérament de feu, a longtemps porté les couleurs de la filière Red Bull.',
  bottas: 'Dix fois vainqueur en Grand Prix, Valtteri Bottas fait son retour en titulaire avec Cadillac.',
  perez: 'Sergio « Checo » Pérez, six fois vainqueur, revient en F1 pour lancer le projet Cadillac.',
}

/**
 * Livrées simplifiées pour l'illustration SVG de l'intro (grille 2026).
 * primary : carrosserie, secondary : nez / bandes, accent : liserés et détails, helmet : casque.
 */
export const TEAM_LIVERIES = {
  mercedes: { primary: '#15171A', secondary: '#C3C8CC', accent: '#00D7B6', helmet: '#E8EBEE' },
  ferrari: { primary: '#D40000', secondary: '#F2F2F2', accent: '#FFD200', helmet: '#D40000' },
  mclaren: { primary: '#FF8000', secondary: '#1B1D21', accent: '#47C7FC', helmet: '#FF8000' },
  red_bull: { primary: '#1B2552', secondary: '#D7212E', accent: '#FFC906', helmet: '#1B2552' },
  aston_martin: { primary: '#00584D', secondary: '#CEDC00', accent: '#F2F2F2', helmet: '#00584D' },
  alpine: { primary: '#0A7FD6', secondary: '#FF87BC', accent: '#101820', helmet: '#0A7FD6' },
  williams: { primary: '#1868DB', secondary: '#0B1E3F', accent: '#F2F2F2', helmet: '#1868DB' },
  rb: { primary: '#EEF0F3', secondary: '#1634CC', accent: '#E10600', helmet: '#1634CC' },
  audi: { primary: '#C5C9CE', secondary: '#F50537', accent: '#141414', helmet: '#141414' },
  haas: { primary: '#EDEDED', secondary: '#151515', accent: '#E10600', helmet: '#151515' },
  cadillac: { primary: '#111214', secondary: '#D9D9D9', accent: '#A3A3A3', helmet: '#D9D9D9' },
}

/** Livrée d'une écurie, ou livrée générique dérivée de sa couleur (écuries historiques) */
export function getLivery(teamId) {
  return (
    TEAM_LIVERIES[teamId] ?? {
      primary: getTeamColor(teamId),
      secondary: '#16181C',
      accent: '#F2F2F2',
      helmet: getTeamColor(teamId),
    }
  )
}
