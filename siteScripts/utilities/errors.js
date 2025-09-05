/**
 * MyTunes Music App - Error Handling System
 * 
 * This module provides centralized error handling and reporting for the MyTunes application.
 * It works in conjunction with the debug script to provide comprehensive error tracking.
 * 
 * @author ClockBlocked
 * @version 1.0.0
 */

// Error types and codes
const ERROR_TYPES = {
    AUDIO_LOAD_ERROR: 'AUDIO_LOAD_ERROR',
    SONG_NOT_FOUND: 'SONG_NOT_FOUND', 
    PLAYLIST_ERROR: 'PLAYLIST_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    STORAGE_ERROR: 'STORAGE_ERROR',
    UI_ERROR: 'UI_ERROR',
    PLAYBACK_ERROR: 'PLAYBACK_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR'
};

const ERROR_CODES = {
    // Audio errors (1xx)
    100: 'Audio file not found',
    101: 'Audio format not supported',
    102: 'Audio playback failed',
    103: 'Audio loading timeout',
    104: 'Audio decoding error',
    
    // Playlist errors (2xx)
    200: 'Playlist not found',
    201: 'Playlist creation failed',
    202: 'Playlist update failed',
    203: 'Invalid playlist format',
    
    // Network errors (3xx)  
    300: 'Network connection failed',
    301: 'Server not responding',
    302: 'Resource not found (404)',
    303: 'CORS policy violation',
    304: 'Request timeout',
    
    // Storage errors (4xx)
    400: 'LocalStorage quota exceeded',
    401: 'Storage write failed',
    402: 'Storage read failed', 
    403: 'Invalid storage data',
    
    // UI errors (5xx)
    500: 'Element not found',
    501: 'Event binding failed',
    502: 'Theme loading failed',
    503: 'Component initialization failed',
    
    // Permission errors (6xx)
    600: 'Microphone access denied',
    601: 'Media access denied',
    602: 'Notification permission denied'
};

// Error handler class
class MyTunesErrorHandler {
    constructor() {
        this.errorQueue = [];
        this.maxErrors = 100;
        this.isInitialized = false;
    }

    // Initialize error handling
    initialize() {
        if (this.isInitialized) return;
        
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError({
                type: ERROR_TYPES.UI_ERROR,
                code: 500,
                message: event.message,
                file: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: ERROR_TYPES.NETWORK_ERROR,
                code: 300,
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        });

        this.isInitialized = true;
        console.log('MyTunes Error Handler initialized');
    }

    // Handle and log errors
    handleError(error) {
        // Add to error queue
        this.errorQueue.push(error);
        
        // Limit queue size
        if (this.errorQueue.length > this.maxErrors) {
            this.errorQueue.shift();
        }

        // Log error
        console.error(`[MyTunes Error] ${error.type}: ${error.message}`, error);
        
        // Show user notification for critical errors
        if (this.shouldShowNotification(error)) {
            this.showErrorNotification(error);
        }

        // Report to debug script if available
        if (window.MyTunesDebugger && window.MyTunesDebugger.errorTracker) {
            // Let debug script handle the error too
        }
    }

    // Audio-specific error handling
    handleAudioError(audioElement, context = 'Unknown') {
        if (!audioElement || !audioElement.error) return;

        const audioError = audioElement.error;
        let errorType = ERROR_TYPES.AUDIO_LOAD_ERROR;
        let errorCode = 100;
        let message = 'Audio error occurred';

        switch (audioError.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                errorCode = 103;
                message = 'Audio loading was aborted';
                break;
            case MediaError.MEDIA_ERR_NETWORK:
                errorType = ERROR_TYPES.NETWORK_ERROR;
                errorCode = 300;
                message = 'Network error while loading audio';
                break;
            case MediaError.MEDIA_ERR_DECODE:
                errorCode = 104;
                message = 'Audio decoding failed';
                break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorCode = 101;
                message = 'Audio format not supported';
                break;
        }

        this.handleError({
            type: errorType,
            code: errorCode,
            message: message,
            context: context,
            src: audioElement.src,
            readyState: audioElement.readyState,
            networkState: audioElement.networkState,
            timestamp: new Date().toISOString()
        });
    }

    // Storage error handling
    handleStorageError(operation, key, error) {
        this.handleError({
            type: ERROR_TYPES.STORAGE_ERROR,
            code: operation === 'write' ? 401 : 402,
            message: `Storage ${operation} failed for key: ${key}`,
            key: key,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    // Network error handling
    handleNetworkError(url, status, statusText) {
        let errorCode = 300;
        
        if (status === 404) {
            errorCode = 302;
        } else if (status === 0) {
            errorCode = 303; // Likely CORS
        }

        this.handleError({
            type: ERROR_TYPES.NETWORK_ERROR,
            code: errorCode,
            message: `Network request failed: ${status} ${statusText}`,
            url: url,
            status: status,
            timestamp: new Date().toISOString()
        });
    }

    // Determine if error should show user notification
    shouldShowNotification(error) {
        const criticalTypes = [
            ERROR_TYPES.AUDIO_LOAD_ERROR,
            ERROR_TYPES.PLAYLIST_ERROR,
            ERROR_TYPES.STORAGE_ERROR
        ];
        
        return criticalTypes.includes(error.type);
    }

    // Show user-friendly error notification
    showErrorNotification(error) {
        const userMessage = this.getUserFriendlyMessage(error);
        
        // Use existing notification system if available
        if (window.notifications && window.notifications.show) {
            window.notifications.show(userMessage, 'error');
        } else {
            // Fallback to simple alert
            console.warn('User notification:', userMessage);
        }
    }

    // Convert technical error to user-friendly message
    getUserFriendlyMessage(error) {
        switch (error.code) {
            case 100:
            case 101:
                return 'Unable to play this song. The file may be corrupted or in an unsupported format.';
            case 102:
                return 'Playback failed. Please try again.';
            case 200:
            case 201:
                return 'Playlist operation failed. Please try again.';
            case 300:
            case 301:
                return 'Network connection problem. Please check your internet connection.';
            case 400:
                return 'Storage is full. Please clear some data and try again.';
            case 500:
                return 'Interface error occurred. Please refresh the page.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }

    // Get error statistics
    getErrorStats() {
        const stats = {};
        
        this.errorQueue.forEach(error => {
            const type = error.type;
            if (!stats[type]) {
                stats[type] = { count: 0, lastError: null };
            }
            stats[type].count++;
            stats[type].lastError = error.timestamp;
        });
        
        return stats;
    }

    // Clear error history
    clearErrors() {
        this.errorQueue = [];
        console.log('Error history cleared');
    }

    // Get recent errors
    getRecentErrors(limit = 10) {
        return this.errorQueue.slice(-limit);
    }
}

// Global error handler instance
const errorHandler = new MyTunesErrorHandler();

// Convenience functions for common error scenarios
const MyTunesErrors = {
    // Initialize error handling
    init: () => errorHandler.initialize(),
    
    // Audio errors
    audioLoadFailed: (src, context) => {
        errorHandler.handleError({
            type: ERROR_TYPES.AUDIO_LOAD_ERROR,
            code: 100,
            message: 'Failed to load audio file',
            src: src,
            context: context,
            timestamp: new Date().toISOString()
        });
    },
    
    audioFormatUnsupported: (src, format) => {
        errorHandler.handleError({
            type: ERROR_TYPES.AUDIO_LOAD_ERROR,
            code: 101,
            message: 'Audio format not supported',
            src: src,
            format: format,
            timestamp: new Date().toISOString()
        });
    },
    
    // Playlist errors
    playlistNotFound: (playlistId) => {
        errorHandler.handleError({
            type: ERROR_TYPES.PLAYLIST_ERROR,
            code: 200,
            message: 'Playlist not found',
            playlistId: playlistId,
            timestamp: new Date().toISOString()
        });
    },
    
    // Network errors  
    networkTimeout: (url) => {
        errorHandler.handleError({
            type: ERROR_TYPES.NETWORK_ERROR,
            code: 304,
            message: 'Request timeout',
            url: url,
            timestamp: new Date().toISOString()
        });
    },
    
    // Storage errors
    storageQuotaExceeded: (operation) => {
        errorHandler.handleError({
            type: ERROR_TYPES.STORAGE_ERROR,
            code: 400,
            message: 'Storage quota exceeded',
            operation: operation,
            timestamp: new Date().toISOString()
        });
    },
    
    // UI errors
    elementNotFound: (elementId) => {
        errorHandler.handleError({
            type: ERROR_TYPES.UI_ERROR,
            code: 500,
            message: 'Required UI element not found',
            elementId: elementId,
            timestamp: new Date().toISOString()
        });
    },
    
    // Get error handler instance
    getHandler: () => errorHandler,
    
    // Error type constants
    TYPES: ERROR_TYPES,
    CODES: ERROR_CODES
};

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MyTunesErrors.init());
    } else {
        MyTunesErrors.init();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MyTunesErrors;
} else if (typeof window !== 'undefined') {
    window.MyTunesErrors = MyTunesErrors;
}
