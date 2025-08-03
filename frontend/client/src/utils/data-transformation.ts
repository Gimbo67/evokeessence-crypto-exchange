/**
 * Utilities for transforming data between backend (snake_case) and frontend (camelCase)
 * versions to ensure consistent property access regardless of format.
 */

/**
 * Transforms user data from backend (snake_case) to frontend (camelCase) format,
 * handling both property formats to ensure compatibility.
 * 
 * @param data User data object from API response
 * @returns Standardized user object with camelCase properties
 */
export function transformUserData(data: any): any {
  if (!data) return null;
  
  // Create a new standardized object with proper camelCase properties
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    
    // Role and permissions
    isAdmin: data.isAdmin === true || data.is_admin === true,
    isEmployee: data.isEmployee === true || data.is_employee === true,
    userGroup: data.userGroup || data.user_group,
    
    // Profile info
    fullName: data.fullName || data.full_name,
    phoneNumber: data.phoneNumber || data.phone_number,
    address: data.address,
    countryOfResidence: data.countryOfResidence || data.country_of_residence,
    gender: data.gender,
    
    // KYC status
    kycStatus: data.kycStatus || data.kyc_status,
    
    // Account settings
    twoFactorEnabled: 
      data.twoFactorEnabled === true || 
      data.two_factor_enabled === true || 
      (data.two_factor_secret ? true : false),
    
    // Balance data
    balance: typeof data.balance === 'string' ? parseFloat(data.balance) : data.balance,
    balanceCurrency: data.balanceCurrency || data.balance_currency || 'USD',
    
    // Other metadata
    createdAt: data.createdAt || data.created_at,
    updatedAt: data.updatedAt || data.updated_at,
    
    // Preserve any other properties
    ...data
  };
}

/**
 * Ensures property access works regardless of camelCase or snake_case format
 * This is useful for conditional logic that needs to check either format.
 * 
 * @param obj The object to safely access properties from
 * @param camelCaseKey The camelCase version of the property key
 * @param snakeCaseKey The snake_case version of the property key
 * @param defaultValue Optional default value if neither property exists
 */
export function getPropertySafely<T>(
  obj: any, 
  camelCaseKey: string, 
  snakeCaseKey: string, 
  defaultValue?: T
): T {
  if (!obj) return defaultValue as T;
  
  if (obj[camelCaseKey] !== undefined) {
    return obj[camelCaseKey];
  }
  
  if (obj[snakeCaseKey] !== undefined) {
    return obj[snakeCaseKey];
  }
  
  return defaultValue as T;
}

/**
 * Checks if a user has a specific role, handling both camelCase and snake_case formats
 * 
 * @param userData User data object
 * @param role The role to check for ("admin" or "employee")
 * @returns boolean indicating if user has the specified role
 */
export function hasRole(userData: any, role: 'admin' | 'employee'): boolean {
  if (!userData) return false;
  
  if (role === 'admin') {
    return userData.isAdmin === true || userData.is_admin === true;
  }
  
  if (role === 'employee') {
    return userData.isEmployee === true || userData.is_employee === true;
  }
  
  return false;
}