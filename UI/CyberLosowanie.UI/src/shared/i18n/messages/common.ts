import { MessageCatalog } from './catalog';

// Shared texts: navigation, generic actions, generic errors, a11y labels.
const pl = {
  'common.nav.wishlist': 'Lista życzeń',
  'common.action.back': 'Wróć',
  'common.action.goHome': 'Wróć na stronę główną',
  'common.action.retry': 'Spróbuj ponownie',
  'common.action.edit': 'Edytuj',
  'common.action.save': 'Zapisz',
  'common.action.loading': 'Ładowanie...',
  'common.error.title': 'Coś poszło nie tak',
  'common.error.unexpected': 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
  'common.error.generic': 'Wystąpił błąd...',
  'common.error.tryAgainShort': 'Spróbuj ponownie.',
  'common.error.devDetails': 'Szczegóły błędu (tylko dev)',
  'common.notFound.title': 'Nie znaleziono strony',
  'common.notFound.body': 'Przepraszamy, nie udało się znaleźć strony, której szukasz.',
  'common.carousel.previousSlide': 'Poprzedni slajd',
  'common.carousel.nextSlide': 'Następny slajd',
} as const;

export type CommonKey = keyof typeof pl;

export const common: MessageCatalog<CommonKey> = {
  pl,
  en: {
    'common.nav.wishlist': 'Wishlist',
    'common.action.back': 'Back',
    'common.action.goHome': 'Back to home page',
    'common.action.retry': 'Try again',
    'common.action.edit': 'Edit',
    'common.action.save': 'Save',
    'common.action.loading': 'Loading...',
    'common.error.title': 'Something went wrong',
    'common.error.unexpected': 'We encountered an unexpected error. Please try again.',
    'common.error.generic': 'There was an error...',
    'common.error.tryAgainShort': 'Please try again.',
    'common.error.devDetails': 'Error details (dev only)',
    'common.notFound.title': 'Page not found',
    'common.notFound.body': 'Sorry, we could not find the page you are looking for.',
    'common.carousel.previousSlide': 'Previous slide',
    'common.carousel.nextSlide': 'Next slide',
  },
};
