import { MessageCatalog } from './catalog';

// Landing page: hero copy and the "how it works" steps.
const pl = {
  'landing.eyebrow': 'Świąteczne losowanie prezentów',
  'landing.tagline': 'Wylosuj, komu w tym roku zrobisz prezent.',
  'landing.subtitle':
    'Wybierz siebie z listy, otwórz tajemnicze pudełko i podejrzyj listę życzeń osoby, którą wylosujesz.',
  'landing.heroAlt': 'Choinka z cyberkami i logo Cyber Losowanie',
  'landing.steps.title': 'Jak to działa',
  'landing.step1.title': 'Wybierz siebie',
  'landing.step1.body': 'Znajdź się na liście cyberków i potwierdź, że to Ty.',
  'landing.step2.title': 'Otwórz pudełko',
  'landing.step2.body': 'Każde pudełko kryje jednego cyberka. Twój wybór to Twoje losowanie.',
  'landing.step3.title': 'Zobacz listę życzeń',
  'landing.step3.body': 'Sprawdź, o czym marzy wylosowana osoba, i przygotuj prezent.',
} as const;

export type LandingKey = keyof typeof pl;

export const landing: MessageCatalog<LandingKey> = {
  pl,
  en: {
    'landing.eyebrow': 'Festive gift draw',
    'landing.tagline': 'Draw the person you will surprise this year.',
    'landing.subtitle':
      'Pick yourself from the list, open a mystery box and peek at the wishlist of the person you draw.',
    'landing.heroAlt': 'Christmas tree with cybereks and the Cyber Losowanie logo',
    'landing.steps.title': 'How it works',
    'landing.step1.title': 'Pick yourself',
    'landing.step1.body': 'Find yourself on the list of cybereks and confirm it is you.',
    'landing.step2.title': 'Open a box',
    'landing.step2.body': 'Every box hides one cyberek. Your pick is your draw.',
    'landing.step3.title': 'See the wishlist',
    'landing.step3.body': 'Check what the person you drew is dreaming of and prepare a gift.',
  },
};
