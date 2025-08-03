/**
 * Middleware to ensure API routes return proper JSON responses
 * This helps prevent Vite from intercepting API responses and returning HTML
 */
import { Request, Response, NextFunction } from 'express';

export const ensureJsonResponse = (req: Request, res: Response, next: NextFunction) => {
  // Set the correct content type
  res.setHeader('Content-Type', 'application/json');
  
  // Override res.send to ensure we don't get HTML responses
  const originalSend = res.send;
  res.send = function(body?: any): Response {
    // Check if the response is HTML and convert to JSON error if so
    if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
      console.error('[API] Intercepted HTML response from API route, converting to JSON error');
      return res.status(500).json({
        success: false,
        error: "Server error",
        message: "An unexpected error occurred. Please try again."
      });
    }
    return originalSend.call(this, body);
  };
  
  next();
};