import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if the request is coming from the iOS app
 * This is determined by the presence of the X-App-Platform header set to 'iOS'
 * Allows the request to proceed only if coming from a verified iOS app
 */
export const isIOSApp = (req: Request, res: Response, next: NextFunction) => {
  // Check for the presence of X-App-Platform header with value 'iOS'
  const platform = req.headers['x-app-platform'];
  
  if (platform && platform === 'iOS') {
    return next();
  }
  
  // If not from iOS app, return 403 Forbidden
  return res.status(403).json({
    success: false,
    message: 'Access restricted to iOS app only',
    code: 'IOS_APP_REQUIRED'
  });
};

/**
 * Middleware to check if the request is coming from a mobile app (iOS or Android)
 * Determined by the presence of the X-App-Platform header
 */
export const isMobileApp = (req: Request, res: Response, next: NextFunction) => {
  // Check for the presence of X-App-Platform header
  const platform = req.headers['x-app-platform'];
  
  if (platform && (platform === 'iOS' || platform === 'Android')) {
    return next();
  }
  
  // If not from a mobile app, return 403 Forbidden
  return res.status(403).json({
    success: false,
    message: 'Access restricted to mobile apps only',
    code: 'MOBILE_APP_REQUIRED'
  });
};

/**
 * Middleware to add app-related properties to the request
 * This enriches the request with information about the app platform
 */
export const appInfo = (req: Request, res: Response, next: NextFunction) => {
  // Add app-related properties to the request object
  const platform = req.headers['x-app-platform'] as string;
  const version = req.headers['x-app-version'] as string;
  const buildNumber = req.headers['x-app-build'] as string;
  
  // Add these as properties to the request object
  (req as any).appInfo = {
    platform: platform || null,
    version: version || null,
    buildNumber: buildNumber || null,
    isIOS: platform === 'iOS',
    isAndroid: platform === 'Android',
    isMobile: platform === 'iOS' || platform === 'Android'
  };
  
  next();
};

export default {
  isIOSApp,
  isMobileApp,
  appInfo
};