import { userModel } from '@/interfaces';

export const userStateUtils = {
  // Save current user state to localStorage (as backup)
  saveUserState: (userData: userModel): void => {
    try {
      localStorage.setItem('userState', JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to save user state:', error);
    }
  },

  // Load user state from localStorage
  loadUserState: (): userModel | null => {
    try {
      const saved = localStorage.getItem('userState');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load user state:', error);
      return null;
    }
  },

  // Clear saved user state
  clearUserState: (): void => {
    localStorage.removeItem('userState');
  },

  // Merge token data with saved local state
  mergeUserState: (tokenData: userModel, savedData: userModel | null): userModel => {
    if (!savedData) return tokenData;

    return {
      fullName: tokenData.fullName || savedData.fullName || '',
      id: tokenData.id || savedData.id || '',
      // Prefer saved state for cyberek selections as they're more recent
      cyberekId: savedData.cyberekId !== '0' ? savedData.cyberekId : (tokenData.cyberekId || '0'),
      giftedCyberekId: savedData.giftedCyberekId !== '0' ? savedData.giftedCyberekId : (tokenData.giftedCyberekId || '0')
    };
  }
};
