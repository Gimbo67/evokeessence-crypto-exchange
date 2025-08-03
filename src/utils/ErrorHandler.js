import { Alert, Platform } from 'react-native';

/**
 * ErrorHandler - Centralized error handling utility
 * This service provides methods for handling various types of errors
 * throughout the application in a consistent way.
 */
class ErrorHandler {
  constructor() {
    this.defaultMessage = 'An unexpected error occurred. Please try again.';
  }

  /**
   * Handle API errors
   * @param {Error} error - The error object from the API request
   * @param {Function} callback - Optional callback after error is handled
   */
  handleApiError(error, callback) {
    try {
      console.error('API Error:', error);
      
      let errorMessage = this.defaultMessage;
      let errorTitle = 'Error';
      
      // Extract error message from response if available
      if (error.response) {
        console.error('Response error data:', error.response.data);
        
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        }
        
        // Handle specific HTTP status codes
        switch (error.response.status) {
          case 400:
            errorTitle = 'Invalid Request';
            break;
          case 401:
            errorTitle = 'Authentication Error';
            errorMessage = 'Your session has expired. Please log in again.';
            break;
          case 403:
            errorTitle = 'Permission Denied';
            errorMessage = 'You do not have permission to perform this action.';
            break;
          case 404:
            errorTitle = 'Not Found';
            errorMessage = 'The requested resource was not found.';
            break;
          case 422:
            errorTitle = 'Validation Error';
            break;
          case 429:
            errorTitle = 'Too Many Requests';
            errorMessage = 'You have made too many requests. Please try again later.';
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorTitle = 'Server Error';
            errorMessage = 'Server error. Please try again later.';
            break;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.message) {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message;
      }
      
      // Show alert
      this.showErrorAlert(errorTitle, errorMessage, callback);
      
      // Return error details
      return {
        title: errorTitle,
        message: errorMessage,
        error: error
      };
    } catch (handlingError) {
      console.error('Error while handling API error:', handlingError);
      this.showErrorAlert('Error', this.defaultMessage, callback);
      
      return {
        title: 'Error',
        message: this.defaultMessage,
        error: error
      };
    }
  }

  /**
   * Handle form validation errors
   * @param {Object} errors - Object containing validation errors
   * @param {Function} callback - Optional callback after error is handled
   */
  handleValidationErrors(errors, callback) {
    try {
      console.error('Validation errors:', errors);
      
      // Get the first error message
      let errorMessage = 'Please fix the errors in the form.';
      
      if (errors && typeof errors === 'object') {
        const firstErrorField = Object.keys(errors)[0];
        
        if (firstErrorField && errors[firstErrorField]) {
          errorMessage = `${firstErrorField}: ${errors[firstErrorField]}`;
          
          // Capitalize first letter and format field name
          errorMessage = errorMessage.charAt(0).toUpperCase() + 
            errorMessage.slice(1).replace(/_/g, ' ');
        }
      }
      
      // Show alert
      this.showErrorAlert('Form Error', errorMessage, callback);
      
      return {
        title: 'Form Error',
        message: errorMessage,
        errors: errors
      };
    } catch (handlingError) {
      console.error('Error while handling validation errors:', handlingError);
      this.showErrorAlert('Form Error', 'Please fix the errors in the form.', callback);
      
      return {
        title: 'Form Error',
        message: 'Please fix the errors in the form.',
        errors: errors
      };
    }
  }

  /**
   * Handle network errors
   * @param {Error} error - The network error
   * @param {Function} callback - Optional callback after error is handled
   */
  handleNetworkError(error, callback) {
    console.error('Network Error:', error);
    
    const errorMessage = 'Network error. Please check your connection and try again.';
    
    // Show alert
    this.showErrorAlert('Network Error', errorMessage, callback);
    
    return {
      title: 'Network Error',
      message: errorMessage,
      error: error
    };
  }

  /**
   * Handle transaction errors
   * @param {Error} error - The transaction error
   * @param {Function} callback - Optional callback after error is handled
   */
  handleTransactionError(error, callback) {
    console.error('Transaction Error:', error);
    
    let errorMessage = 'Failed to process the transaction. Please try again.';
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    // Show alert
    this.showErrorAlert('Transaction Error', errorMessage, callback);
    
    return {
      title: 'Transaction Error',
      message: errorMessage,
      error: error
    };
  }

  /**
   * Handle websocket errors
   * @param {Error} error - The websocket error
   * @param {Function} callback - Optional callback after error is handled
   */
  handleWebsocketError(error, callback) {
    console.error('Websocket Error:', error);
    
    let errorMessage = 'Connection error. Reconnecting...';
    
    // For websocket errors, we typically don't show alerts unless specifically requested
    if (callback) {
      callback({
        title: 'Connection Error',
        message: errorMessage,
        error: error
      });
    }
    
    return {
      title: 'Connection Error',
      message: errorMessage,
      error: error
    };
  }

  /**
   * Handle general errors
   * @param {Error} error - The error object
   * @param {string} title - Alert title
   * @param {Function} callback - Optional callback after error is handled
   */
  handleError(error, title = 'Error', callback) {
    console.error('Error:', error);
    
    let errorMessage = this.defaultMessage;
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    // Show alert
    this.showErrorAlert(title, errorMessage, callback);
    
    return {
      title: title,
      message: errorMessage,
      error: error
    };
  }

  /**
   * Show error alert
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @param {Function} callback - Optional callback after alert is dismissed
   */
  showErrorAlert(title, message, callback) {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'OK',
          onPress: () => {
            if (callback) callback();
          }
        }
      ],
      { cancelable: false }
    );
  }

  /**
   * Get error message from error object or string
   * @param {Error|string} error - The error object or message
   * @returns {string} - Error message
   */
  getErrorMessage(error) {
    if (!error) {
      return this.defaultMessage;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.response && error.response.data) {
      const responseData = error.response.data;
      
      if (responseData.message) {
        return responseData.message;
      } else if (responseData.error) {
        return responseData.error;
      }
    }
    
    if (error.message) {
      return error.message;
    }
    
    return this.defaultMessage;
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

export default errorHandler;