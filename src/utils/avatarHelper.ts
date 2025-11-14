/**
 * Avatar Helper Utility
 * 
 * Централизованы avatar image management.
 * Бүх profile, seller, user avatar зургийг нэгтгэсэн.
 */

// Default avatar зургууд
export const DEFAULT_AVATARS = {
  default: '/img/human.png',
  male: '/img/Male.png',
  female: '/img/Women.png',
  admin: '/img/AdminChat.png',
} as const;

/**
 * User-ийн avatar зургийг буцаана
 * @param avatar - User.avatar утга
 * @param fallback - Default avatar (optional)
 * @returns Valid avatar URL
 */
export function getUserAvatar(
  avatar: string | null | undefined,
  fallback: string = DEFAULT_AVATARS.default
): string {
  if (!avatar || typeof avatar !== 'string') {
    return fallback;
  }
  
  const trimmed = avatar.trim();
  if (trimmed.length === 0) {
    return fallback;
  }
  
  return trimmed;
}

/**
 * Seller-ийн avatar зургийг буцаана
 * @param seller - Product seller object
 * @returns Valid avatar URL
 */
export function getSellerAvatar(seller: {
  avatar?: string | null;
  name?: string;
}): string {
  return getUserAvatar(seller.avatar);
}

/**
 * Profile avatar зургийг буцаана (localStorage + user combined)
 * @param user - Auth context user object
 * @param storedAvatar - localStorage-аас унших avatar
 * @returns Valid avatar URL
 */
export function getProfileAvatar(
  user: { avatar?: string | null } | null | undefined,
  storedAvatar?: string | null
): string {
  // Эхлээд stored avatar шалгах
  if (storedAvatar) {
    const result = getUserAvatar(storedAvatar, '');
    if (result) return result;
  }
  
  // Дараа нь user.avatar шалгах
  if (user?.avatar) {
    const result = getUserAvatar(user.avatar, '');
    if (result) return result;
  }
  
  // Default avatar буцаах
  return DEFAULT_AVATARS.default;
}

/**
 * Admin avatar шалгах
 * @param user - Auth context user object
 * @returns Admin avatar эсвэл null
 */
export function getAdminAvatar(user: { role?: string } | null | undefined): string | null {
  if (user?.role === 'admin') {
    return DEFAULT_AVATARS.admin;
  }
  return null;
}

/**
 * Review-ийн avatar зургийг буцаана
 * @param review - Review object with userAvatar field
 * @returns Valid avatar URL
 */
export function getReviewAvatar(review: {
  userAvatar?: string | null;
  userName?: string;
}): string {
  return getUserAvatar(review.userAvatar);
}

/**
 * Avatar зургийн validation
 * @param avatar - Avatar URL
 * @returns true if valid, false otherwise
 */
export function isValidAvatar(avatar: string | null | undefined): boolean {
  if (!avatar || typeof avatar !== 'string') {
    return false;
  }
  
  const trimmed = avatar.trim();
  if (trimmed.length === 0) {
    return false;
  }
  
  // Check if it's a valid URL or path
  return trimmed.startsWith('/') || trimmed.startsWith('http');
}

/**
 * Avatar зургийг localStorage-д хадгалах
 * @param avatar - Avatar URL
 */
export function saveAvatarToStorage(avatar: string): void {
  try {
    const profile = JSON.parse(localStorage.getItem('profile') || '{}');
    profile.avatar = avatar;
    localStorage.setItem('profile', JSON.stringify(profile));
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'profile',
      newValue: JSON.stringify(profile),
      oldValue: localStorage.getItem('profile'),
      storageArea: localStorage,
      url: window.location.href,
    }));
  } catch (error) {
    console.error('Failed to save avatar to storage:', error);
  }
}

/**
 * localStorage-аас avatar унших
 * @returns Avatar URL эсвэл null
 */
export function loadAvatarFromStorage(): string | null {
  try {
    const profile = JSON.parse(localStorage.getItem('profile') || '{}');
    return profile.avatar || null;
  } catch (error) {
    console.error('Failed to load avatar from storage:', error);
    return null;
  }
}
