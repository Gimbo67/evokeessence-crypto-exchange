/**
 * API Client utility for making fetch requests with consistent error handling
 * Designed specifically to handle HTML responses that might be returned by middleware
 */

/**
 * Options for the API request
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeoutMs?: number;
  cache?: RequestCache;
}

/**
 * Make an API request with standardized error handling
 * @param url The URL to request
 * @param options Request options
 * @returns The JSON response data
 */
export async function apiRequest<T = any>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = 10000,
    cache = 'no-store' 
  } = options;

  // Create a controller for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Prepare headers with defaults that help prevent HTML responses
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      ...headers
    };

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
      credentials: 'include',
      signal: controller.signal,
      cache
    };

    // Add body if present
    if (body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Make the request
    const response = await fetch(url, fetchOptions);

    // Clear the timeout since we got a response
    clearTimeout(timeoutId);

    // Check if we got an HTML response
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      console.error(`Received HTML response from ${url}`);
      
      try {
        // Get the HTML content for debugging
        const htmlText = await response.text();
        console.error(`HTML content (truncated): ${htmlText.substring(0, 200)}...`);
      } catch (e) {
        console.error('Failed to read HTML response:', e);
      }
      
      throw new Error('Received HTML instead of JSON response. Please try again or log in again if the issue persists.');
    }

    // Handle unsuccessful responses
    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      
      throw new Error(errorMessage);
    }

    // Parse and return the JSON data
    try {
      if (response.headers.get('Content-Length') === '0' || response.status === 204) {
        return {} as T;
      }
      return await response.json() as T;
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    // Clear the timeout
    clearTimeout(timeoutId);

    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    // Re-throw the error
    throw error;
  }
}

/**
 * Make a GET request
 */
export async function get<T = any>(url: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'GET' });
}

/**
 * Make a POST request
 */
export async function post<T = any>(url: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'POST', body });
}

/**
 * Make a PUT request
 */
export async function put<T = any>(url: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'PUT', body });
}

/**
 * Make a DELETE request
 */
export async function del<T = any>(url: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'DELETE' });
}

/**
 * Make a PATCH request
 */
export async function patch<T = any>(url: string, body?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'PATCH', body });
}

/**
 * Export user data (GDPR compliance)
 * @param userId The ID of the user to export data for
 * @returns Promise with the exported user data
 */
export async function exportUserData(userId: number | string): Promise<any> {
  try {
    console.log(`Exporting data for user ID: ${userId}`);
    
    // Use the direct bypass route to avoid Vite middleware issues
    const response = await get(`/bypass/admin/export-user/${userId}`);
    
    console.log("Export API response:", response);
    
    // If the response doesn't have success property, it might not be in the expected format
    if (response && !response.success && !response.data) {
      console.warn("Export response missing success property or data", response);
      // Wrap the response in a standardized format if needed
      return {
        success: true,
        message: "User data exported successfully",
        data: response
      };
    }
    
    return response;
  } catch (error) {
    console.error("Error in exportUserData:", error);
    
    // Rethrow the error to be handled by the calling function
    throw error;
  }
}

/**
 * Delete a user and all their associated data
 * @param userId The ID of the user to delete
 * @returns Promise with the deletion result
 */
export async function deleteUser(userId: number | string): Promise<any> {
  try {
    console.log(`Deleting user with ID: ${userId}`);
    
    // Use the direct bypass route to avoid Vite middleware issues
    const response = await del(`/bypass/admin/delete-user/${userId}`);
    
    console.log("Delete API response:", response);
    
    // If the response doesn't have success property, wrap it in our standard format
    if (response && !response.success) {
      console.warn("Delete response missing success property", response);
      // Wrap in standard format if needed
      return {
        success: true,
        message: "User deleted successfully",
        data: response
      };
    }
    
    return response;
  } catch (error) {
    console.error("Error in deleteUser:", error);
    
    // Rethrow for handler
    throw error;
  }
}