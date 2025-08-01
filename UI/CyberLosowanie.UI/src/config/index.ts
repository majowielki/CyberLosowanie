// Environment configuration
const getEnvironmentVariable = (key: string, defaultValue: string): string => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    console.warn(`Environment variable ${key} is not set, using default: ${defaultValue}`);
    return defaultValue;
  }
  return value;
};

const getBooleanEnvironmentVariable = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
};

export const config = {
  API_BASE_URL: getEnvironmentVariable('VITE_API_BASE_URL', 'https://localhost:7078/api/'),
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  
  // Feature flags
  ENABLE_DEBUG_LOGS: getBooleanEnvironmentVariable('VITE_ENABLE_DEBUG_LOGS', false),
  
  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: 'auth/login',
      REGISTER: 'auth/register',
    },
    CYBER_LOSOWANIE: {
      BASE: 'CyberLosowanie',
      VALIDATE: 'CyberLosowanie/available-targets',
      CYBEREK_ASSIGNMENT: 'CyberLosowanie/assign-cyberek',
      GIFTED_CYBEREK_ASSIGNMENT: 'CyberLosowanie/assign-gift',
    }
  },
  
  // App settings
  APP_NAME: 'CyberLosowanie',
  VERSION: '1.0.0',
  
  // Toast settings
  TOAST_DURATION: 5000,
} as const;

// Type-safe environment check
export const isProduction = config.NODE_ENV === 'production';
export const isDevelopment = config.NODE_ENV === 'development';

// Debug logging utility
export const debugLog = (...args: unknown[]) => {
  if (config.ENABLE_DEBUG_LOGS) {
    console.log('[DEBUG]', ...args);
  }
};
