import { MessageCatalog } from './catalog';

// Login, Register, LoginOrRegister. Backend `ApiResponse` errors are shown
// as-is until the error-code epic (doc §7, strategy A) — only the frontend
// fallbacks below are translated.
const pl = {
  'auth.field.usernamePlaceholder': 'Podaj nazwę użytkownika',
  'auth.field.passwordPlaceholder': 'Podaj hasło',
  'auth.login.title': 'Logowanie',
  'auth.login.submit': 'Zaloguj się',
  'auth.login.failed': 'Logowanie nie powiodło się. Spróbuj ponownie.',
  'auth.login.tokenMissing': 'Brak tokenu w odpowiedzi serwera. Spróbuj ponownie.',
  'auth.login.unexpectedError': 'Wystąpił błąd podczas logowania. Spróbuj ponownie.',
  'auth.register.title': 'Rejestracja',
  'auth.register.submit': 'Zarejestruj się',
  'auth.register.success': 'Rejestracja udana! Zaloguj się, aby kontynuować.',
  'auth.register.failed': 'Rejestracja nie powiodła się. Spróbuj ponownie.',
  'auth.register.unexpectedError': 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie.',
  'auth.error.unexpectedFormat': 'Nieoczekiwany format odpowiedzi. Spróbuj ponownie.',
  'auth.error.siteIdle': 'Strona była przez chwilę nieaktywna. Odśwież ją i spróbuj ponownie za moment.',
  'auth.nav.home': 'Strona główna',
  'auth.nav.login': 'Logowanie',
  'auth.nav.register': 'Rejestracja',
  'auth.signIn': 'Zaloguj się',
  'auth.logout': 'Wyloguj się',
} as const;

export type AuthKey = keyof typeof pl;

export const auth: MessageCatalog<AuthKey> = {
  pl,
  en: {
    'auth.field.usernamePlaceholder': 'Enter Username',
    'auth.field.passwordPlaceholder': 'Enter Password',
    'auth.login.title': 'Login',
    'auth.login.submit': 'Login',
    'auth.login.failed': 'Login failed. Please try again.',
    'auth.login.tokenMissing': 'Token not found in response. Please try again.',
    'auth.login.unexpectedError': 'An error occurred during login. Please try again.',
    'auth.register.title': 'Register',
    'auth.register.submit': 'Register',
    'auth.register.success': 'Registration successful! Please login to continue.',
    'auth.register.failed': 'Registration failed. Please try again.',
    'auth.register.unexpectedError': 'An error occurred during registration. Please try again.',
    'auth.error.unexpectedFormat': 'Unexpected response format. Please try again.',
    'auth.error.siteIdle': 'This site was idle for a while. Please reload the page and try again in a moment.',
    'auth.nav.home': 'Home',
    'auth.nav.login': 'Login',
    'auth.nav.register': 'Register',
    'auth.signIn': 'Sign in',
    'auth.logout': 'Logout',
  },
};
