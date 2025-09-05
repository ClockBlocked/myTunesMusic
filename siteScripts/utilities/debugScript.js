/**
 * MyTunes Music App - Comprehensive Debug Script
 * 
 * This script provides extensive debugging capabilities for the MyTunes music application.
 * Run any function from the browser developer console to diagnose issues.
 * 
 * Usage Examples:
 * - MyTunesDebugger.runFullDiagnostic()  // Complete system analysis
 * - MyTunesDebugger.audioDebugger.analyzeAudioState()  // Audio-specific debugging
 * - MyTunesDebugger.uiDebugger.validateUIState()  // UI state validation
 * - MyTunesDebugger.performanceMonitor.start()  // Begin performance monitoring
 * 
 * @author ClockBlocked
 * @version 1.0.0
 */

(function() {
    'use strict';

    // Debug script configuration
    const DEBUG_CONFIG = {
        enableDetailedLogging: true,
        enablePerformanceMonitoring: true,
        enableNetworkTracking: true,
        enableMemoryTracking: true,
        maxLogEntries: 1000,
        performanceInterval: 5000, // 5 seconds
        colors: {
            success: '#10b981',
            warning: '#f59e0b', 
            error: '#ef4444',
            info: '#3b82f6',
            debug: '#8b5cf6'
        }
    };

    // Utility functions for enhanced logging
    const Logger = {
        formatMessage: (level, message, data = null) => {
            const timestamp = new Date().toISOString();
            const color = DEBUG_CONFIG.colors[level] || '#000000';
            
            console.groupCollapsed(`%c[${level.toUpperCase()}] ${timestamp} - ${message}`, 
                `color: ${color}; font-weight: bold;`);
            
            if (data !== null) {
                console.log('Data:', data);
            }
            
            console.trace('Stack trace:');
            console.groupEnd();
        },

        success: (message, data) => Logger.formatMessage('success', message, data),
        warning: (message, data) => Logger.formatMessage('warning', message, data),
        error: (message, data) => Logger.formatMessage('error', message, data),
        info: (message, data) => Logger.formatMessage('info', message, data),
        debug: (message, data) => Logger.formatMessage('debug', message, data),

        table: (title, data) => {
            console.group(`📊 ${title}`);
            console.table(data);
            console.groupEnd();
        },

        section: (title, callback) => {
            console.group(`🔍 ${title}`);
            try {
                callback();
            } catch (error) {
                Logger.error(`Error in ${title}`, error);
            }
            console.groupEnd();
        }
    };

    // Core System Debugger
    const CoreDebugger = {
        analyzeAppState: () => {
            Logger.section('Application State Analysis', () => {
                const state = window.appState;
                
                if (!state) {
                    Logger.error('AppState not found', 'window.appState is undefined');
                    return;
                }

                const stateInfo = {
                    'Audio Element': !!state.audio,
                    'Current Song': state.currentSong?.title || 'None',
                    'Current Artist': state.currentArtist || 'None',
                    'Current Album': state.currentAlbum || 'None',
                    'Is Playing': state.isPlaying,
                    'Duration': state.duration,
                    'Queue Length': state.queue?.length || 0,
                    'Recently Played Count': state.recentlyPlayed?.length || 0,
                    'Shuffle Mode': state.shuffleMode,
                    'Repeat Mode': state.repeatMode,
                    'Popup Visible': state.isPopupVisible,
                    'Current Tab': state.currentTab,
                    'Playlists Count': state.playlists?.length || 0
                };

                Logger.table('Application State', stateInfo);

                // Validate critical components
                if (!state.audio) {
                    Logger.warning('Audio element not initialized', 'This may prevent music playback');
                }

                if (state.queue?.length === 0) {
                    Logger.info('Queue is empty', 'No songs queued for playback');
                }
            });
        },

        validateDOMElements: () => {
            Logger.section('DOM Elements Validation', () => {
                const criticalElements = [
                    'now-playing-area',
                    'play-pause-navbar', 
                    'prev-btn-navbar',
                    'next-btn-navbar',
                    'navbar-album-cover',
                    'theme-toggle',
                    'global-search-trigger'
                ];

                const elementStatus = {};
                let missingElements = [];

                criticalElements.forEach(id => {
                    const element = document.getElementById(id);
                    elementStatus[id] = {
                        exists: !!element,
                        visible: element ? !element.hidden && element.style.display !== 'none' : false,
                        classes: element ? element.className : 'N/A'
                    };

                    if (!element) {
                        missingElements.push(id);
                    }
                });

                Logger.table('Critical DOM Elements', elementStatus);

                if (missingElements.length > 0) {
                    Logger.error('Missing DOM Elements', missingElements);
                } else {
                    Logger.success('All critical DOM elements found');
                }
            });
        },

        checkEventListeners: () => {
            Logger.section('Event Listeners Analysis', () => {
                const eventInfo = {};

                // Check for getEventListeners support (Chrome DevTools)
                if (typeof getEventListeners === 'function') {
                    eventInfo['Document Listeners'] = Object.keys(getEventListeners(document) || {}).length;
                    eventInfo['Window Listeners'] = Object.keys(getEventListeners(window) || {}).length;
                    eventInfo['Body Listeners'] = Object.keys(getEventListeners(document.body) || {}).length;

                    // Check critical button event listeners
                    const playBtn = document.getElementById('play-pause-navbar');
                    const prevBtn = document.getElementById('prev-btn-navbar');
                    const nextBtn = document.getElementById('next-btn-navbar');

                    if (playBtn) {
                        const playListeners = getEventListeners(playBtn);
                        eventInfo['Play Button Listeners'] = playListeners?.click?.length || 0;
                    }
                    if (prevBtn) {
                        const prevListeners = getEventListeners(prevBtn);
                        eventInfo['Previous Button Listeners'] = prevListeners?.click?.length || 0;
                    }
                    if (nextBtn) {
                        const nextListeners = getEventListeners(nextBtn);
                        eventInfo['Next Button Listeners'] = nextListeners?.click?.length || 0;
                    }

                    Logger.table('Event Listeners', eventInfo);
                } else {
                    Logger.warning('getEventListeners not available', 'This function is only available in Chrome DevTools');
                }

                // Validate critical event handlers
                if (window.eventHandlers) {
                    Logger.success('Event handlers object found');
                } else {
                    Logger.error('Event handlers object missing', 'Controls may not work properly');
                }
            });
        }
    };

    // Audio System Debugger
    const AudioDebugger = {
        analyzeAudioState: () => {
            Logger.section('Audio System Analysis', () => {
                const audio = window.appState?.audio;
                
                if (!audio) {
                    Logger.error('Audio element not found', 'Music playback will not work');
                    return;
                }

                const audioInfo = {
                    'Source': audio.src || 'No source',
                    'Current Time': audio.currentTime,
                    'Duration': audio.duration || 'Unknown',
                    'Volume': audio.volume,
                    'Muted': audio.muted,
                    'Paused': audio.paused,
                    'Ended': audio.ended,
                    'Ready State': audio.readyState,
                    'Network State': audio.networkState,
                    'Error': audio.error?.message || 'None',
                    'Autoplay': audio.autoplay,
                    'Loop': audio.loop,
                    'Preload': audio.preload
                };

                Logger.table('Audio Element State', audioInfo);

                // Check for common audio issues
                if (audio.error) {
                    Logger.error('Audio Error Detected', {
                        code: audio.error.code,
                        message: audio.error.message
                    });
                }

                if (audio.networkState === 3) {
                    Logger.error('Network Error', 'No audio source or failed to load');
                }

                if (audio.readyState < 2) {
                    Logger.warning('Audio Not Ready', 'Insufficient data loaded for playback');
                }
            });
        },

        testAudioFormats: () => {
            Logger.section('Audio Format Support', () => {
                const audio = new Audio();
                const formats = {
                    'MP3': 'audio/mpeg',
                    'OGG': 'audio/ogg',
                    'WAV': 'audio/wav',
                    'AAC': 'audio/mp4; codecs="mp4a.40.2"',
                    'WebM': 'audio/webm',
                    'FLAC': 'audio/flac'
                };

                const supportInfo = {};
                
                for (const [format, mimeType] of Object.entries(formats)) {
                    const canPlay = audio.canPlayType(mimeType);
                    supportInfo[format] = canPlay === 'probably' ? 'Full Support' : 
                                          canPlay === 'maybe' ? 'Partial Support' : 'Not Supported';
                }

                Logger.table('Audio Format Support', supportInfo);
            });
        },

        monitorAudioEvents: () => {
            Logger.section('Audio Event Monitoring', () => {
                const audio = window.appState?.audio;
                
                if (!audio) {
                    Logger.error('Cannot monitor audio events - audio element not found');
                    return;
                }

                const events = [
                    'loadstart', 'durationchange', 'loadedmetadata', 'loadeddata',
                    'progress', 'canplay', 'canplaythrough', 'play', 'pause',
                    'seeking', 'seeked', 'timeupdate', 'ended', 'error', 'stalled', 'waiting'
                ];

                Logger.info('Starting audio event monitoring...');
                
                events.forEach(event => {
                    audio.addEventListener(event, (e) => {
                        Logger.debug(`Audio Event: ${event}`, {
                            currentTime: audio.currentTime,
                            duration: audio.duration,
                            readyState: audio.readyState,
                            networkState: audio.networkState
                        });
                    });
                });

                Logger.success('Audio event monitoring started', 'Events will be logged as they occur');
            });
        }
    };

    // UI Debugger
    const UIDebugger = {
        validateUIState: () => {
            Logger.section('UI State Validation', () => {
                const nowPlayingArea = document.getElementById('now-playing-area');
                const playBtn = document.getElementById('play-pause-navbar');
                const albumCover = document.getElementById('navbar-album-cover');

                const uiState = {
                    'Now Playing Visible': nowPlayingArea ? !nowPlayingArea.classList.contains('hidden') : false,
                    'Play Button State': playBtn ? playBtn.getAttribute('aria-pressed') : 'Not found',
                    'Album Cover Source': albumCover?.src || 'No source',
                    'Theme': document.documentElement.className,
                    'Popup Visible': window.appState?.isPopupVisible || false
                };

                Logger.table('UI State', uiState);

                // Check for UI inconsistencies
                if (window.appState?.isPlaying && playBtn?.getAttribute('aria-pressed') !== 'true') {
                    Logger.warning('UI State Mismatch', 'Audio is playing but play button shows paused state');
                }

                if (window.appState?.currentSong && (!albumCover || !albumCover.src)) {
                    Logger.warning('Missing Album Cover', 'Song is playing but no album cover displayed');
                }
            });
        },

        analyzeThemeSystem: () => {
            Logger.section('Theme System Analysis', () => {
                const themeInfo = {
                    'Current Theme': document.documentElement.className,
                    'Theme Toggle Button': !!document.getElementById('theme-toggle'),
                    'CSS Custom Properties': !!getComputedStyle(document.documentElement).getPropertyValue('--primary-color'),
                    'Dark Mode Media Query': window.matchMedia('(prefers-color-scheme: dark)').matches
                };

                Logger.table('Theme System', themeInfo);

                if (window.theme) {
                    Logger.success('Theme controller found');
                } else {
                    Logger.error('Theme controller missing', 'Theme switching may not work');
                }
            });
        },

        scanForDeadLinks: () => {
            Logger.section('Dead Link Detection', () => {
                const links = Array.from(document.querySelectorAll('a[href]'));
                const images = Array.from(document.querySelectorAll('img[src]'));
                const scripts = Array.from(document.querySelectorAll('script[src]'));
                
                let deadLinks = [];
                let suspiciousElements = [];

                // Check for obviously broken links
                [...links, ...images, ...scripts].forEach((element, index) => {
                    const url = element.href || element.src;
                    
                    if (!url || url === '' || url.startsWith('javascript:void(0)')) {
                        return;
                    }

                    if (url.includes('undefined') || url.includes('null') || url.includes('[object')) {
                        deadLinks.push({
                            element: element.tagName,
                            url: url,
                            text: element.textContent?.substring(0, 50) || element.alt || 'No text'
                        });
                    }

                    if (element.tagName === 'IMG' && !element.complete) {
                        suspiciousElements.push({
                            element: 'IMG',
                            src: element.src,
                            alt: element.alt || 'No alt text'
                        });
                    }
                });

                if (deadLinks.length > 0) {
                    Logger.table('Dead Links Detected', deadLinks);
                } else {
                    Logger.success('No obvious dead links found');
                }

                if (suspiciousElements.length > 0) {
                    Logger.table('Images Not Loaded', suspiciousElements);
                }
            });
        }
    };

    // Performance Monitor
    const PerformanceMonitor = {
        data: {
            memorySnapshots: [],
            performanceEntries: [],
            startTime: null,
            isMonitoring: false
        },

        start: () => {
            if (PerformanceMonitor.data.isMonitoring) {
                Logger.warning('Performance monitoring already active');
                return;
            }

            Logger.info('Starting performance monitoring...');
            PerformanceMonitor.data.startTime = Date.now();
            PerformanceMonitor.data.isMonitoring = true;

            // Monitor memory usage
            const monitorMemory = () => {
                if (!PerformanceMonitor.data.isMonitoring) return;

                if (performance.memory) {
                    PerformanceMonitor.data.memorySnapshots.push({
                        timestamp: Date.now(),
                        usedJSHeapSize: performance.memory.usedJSHeapSize,
                        totalJSHeapSize: performance.memory.totalJSHeapSize,
                        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                    });

                    // Keep only recent snapshots
                    if (PerformanceMonitor.data.memorySnapshots.length > 100) {
                        PerformanceMonitor.data.memorySnapshots.shift();
                    }
                }

                setTimeout(monitorMemory, DEBUG_CONFIG.performanceInterval);
            };

            monitorMemory();
            Logger.success('Performance monitoring started');
        },

        stop: () => {
            PerformanceMonitor.data.isMonitoring = false;
            Logger.info('Performance monitoring stopped');
        },

        getReport: () => {
            Logger.section('Performance Report', () => {
                const entries = performance.getEntries();
                const memorySnapshots = PerformanceMonitor.data.memorySnapshots;

                // Navigation timing
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    const navTiming = {
                        'DNS Lookup': `${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`,
                        'Connection': `${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`,
                        'Request': `${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms`,
                        'Response': `${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms`,
                        'DOM Loading': `${(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart).toFixed(2)}ms`,
                        'Page Load': `${(navigation.loadEventEnd - navigation.loadEventStart).toFixed(2)}ms`
                    };

                    Logger.table('Navigation Timing', navTiming);
                }

                // Resource timing
                const resources = entries.filter(entry => entry.entryType === 'resource');
                const resourceSummary = resources.reduce((acc, resource) => {
                    const type = resource.initiatorType || 'other';
                    if (!acc[type]) acc[type] = { count: 0, totalDuration: 0 };
                    acc[type].count++;
                    acc[type].totalDuration += resource.duration;
                    return acc;
                }, {});

                Logger.table('Resource Loading Summary', resourceSummary);

                // Memory usage
                if (memorySnapshots.length > 0) {
                    const latest = memorySnapshots[memorySnapshots.length - 1];
                    const memoryInfo = {
                        'Used JS Heap': `${(latest.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                        'Total JS Heap': `${(latest.totalJSHeapSize / 1048576).toFixed(2)} MB`,
                        'JS Heap Limit': `${(latest.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
                        'Memory Usage': `${((latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100).toFixed(2)}%`
                    };

                    Logger.table('Current Memory Usage', memoryInfo);

                    // Memory trend analysis
                    if (memorySnapshots.length >= 2) {
                        const first = memorySnapshots[0];
                        const trend = latest.usedJSHeapSize - first.usedJSHeapSize;
                        
                        if (trend > 10485760) { // 10MB increase
                            Logger.warning('Memory usage increasing', `+${(trend / 1048576).toFixed(2)} MB since monitoring started`);
                        } else {
                            Logger.success('Memory usage stable');
                        }
                    }
                }

                // Long tasks detection
                const longTasks = entries.filter(entry => entry.entryType === 'longtask');
                if (longTasks.length > 0) {
                    Logger.warning(`Found ${longTasks.length} long tasks`, 'These may cause UI freezing');
                    Logger.table('Long Tasks', longTasks.map(task => ({
                        duration: `${task.duration.toFixed(2)}ms`,
                        startTime: task.startTime
                    })));
                }
            });
        },

        analyzeMainThreadBlocking: () => {
            Logger.section('Main Thread Analysis', () => {
                // Create observer for long tasks
                if ('PerformanceObserver' in window) {
                    const observer = new PerformanceObserver((list) => {
                        const longTasks = list.getEntries();
                        longTasks.forEach(task => {
                            Logger.warning('Long Task Detected', {
                                duration: `${task.duration.toFixed(2)}ms`,
                                startTime: task.startTime,
                                attribution: task.attribution
                            });
                        });
                    });

                    try {
                        observer.observe({ entryTypes: ['longtask'] });
                        Logger.success('Long task monitoring enabled');
                        
                        // Stop monitoring after 30 seconds
                        setTimeout(() => {
                            observer.disconnect();
                            Logger.info('Long task monitoring stopped');
                        }, 30000);
                    } catch (e) {
                        Logger.error('Long task monitoring not supported', e.message);
                    }
                } else {
                    Logger.warning('PerformanceObserver not supported', 'Cannot monitor long tasks');
                }
            });
        }
    };

    // Network Debugger
    const NetworkDebugger = {
        monitorRequests: () => {
            Logger.section('Network Request Monitoring', () => {
                const originalFetch = window.fetch;
                const originalXHR = window.XMLHttpRequest;

                // Monitor fetch requests
                window.fetch = function(...args) {
                    const startTime = Date.now();
                    Logger.debug('Fetch Request Started', args[0]);

                    return originalFetch.apply(this, args)
                        .then(response => {
                            const duration = Date.now() - startTime;
                            Logger.info(`Fetch Completed (${duration}ms)`, {
                                url: args[0],
                                status: response.status,
                                statusText: response.statusText,
                                headers: Object.fromEntries(response.headers.entries())
                            });
                            return response;
                        })
                        .catch(error => {
                            const duration = Date.now() - startTime;
                            Logger.error(`Fetch Failed (${duration}ms)`, {
                                url: args[0],
                                error: error.message
                            });
                            throw error;
                        });
                };

                // Monitor XMLHttpRequest
                const originalOpen = originalXHR.prototype.open;
                const originalSend = originalXHR.prototype.send;

                originalXHR.prototype.open = function(method, url, ...args) {
                    this._debugInfo = { method, url, startTime: Date.now() };
                    Logger.debug('XHR Request Started', { method, url });
                    return originalOpen.apply(this, [method, url, ...args]);
                };

                originalXHR.prototype.send = function(...args) {
                    const xhr = this;
                    
                    xhr.addEventListener('load', function() {
                        const duration = Date.now() - xhr._debugInfo.startTime;
                        Logger.info(`XHR Completed (${duration}ms)`, {
                            method: xhr._debugInfo.method,
                            url: xhr._debugInfo.url,
                            status: xhr.status,
                            statusText: xhr.statusText
                        });
                    });

                    xhr.addEventListener('error', function() {
                        const duration = Date.now() - xhr._debugInfo.startTime;
                        Logger.error(`XHR Failed (${duration}ms)`, {
                            method: xhr._debugInfo.method,
                            url: xhr._debugInfo.url
                        });
                    });

                    return originalSend.apply(this, args);
                };

                Logger.success('Network request monitoring enabled');
                Logger.info('Note: This will monitor all future network requests');
            });
        },

        analyzeConnectionStatus: () => {
            Logger.section('Network Connection Analysis', () => {
                const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
                
                if (connection) {
                    const connectionInfo = {
                        'Effective Type': connection.effectiveType,
                        'Downlink': `${connection.downlink} Mbps`,
                        'RTT': `${connection.rtt} ms`,
                        'Save Data': connection.saveData,
                        'Type': connection.type
                    };

                    Logger.table('Connection Information', connectionInfo);

                    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                        Logger.warning('Slow connection detected', 'Audio streaming may be affected');
                    }

                    if (connection.saveData) {
                        Logger.info('Data saver mode detected', 'User may prefer lower quality audio');
                    }
                } else {
                    Logger.warning('Network Connection API not supported');
                }

                // Test online status
                Logger.info('Online Status', navigator.onLine ? 'Online' : 'Offline');

                // Monitor online/offline events
                window.addEventListener('online', () => Logger.success('Connection restored'));
                window.addEventListener('offline', () => Logger.warning('Connection lost'));
            });
        },

        testCORS: async () => {
            Logger.section('CORS Testing', () => {
                const testURLs = [
                    'https://httpbin.org/get',
                    'https://api.github.com/zen',
                    'https://jsonplaceholder.typicode.com/posts/1'
                ];

                for (const url of testURLs) {
                    try {
                        const response = await fetch(url, { mode: 'cors' });
                        Logger.success(`CORS test passed for ${url}`, { status: response.status });
                    } catch (error) {
                        Logger.error(`CORS test failed for ${url}`, error.message);
                    }
                }
            });
        }
    };

    // Storage Debugger
    const StorageDebugger = {
        analyzeLocalStorage: () => {
            Logger.section('Local Storage Analysis', () => {
                const storageInfo = {
                    'Total Items': localStorage.length,
                    'Estimated Size': `${JSON.stringify(localStorage).length} characters`
                };

                // MyTunes specific storage keys
                const myTunesKeys = [];
                const otherKeys = [];
                let totalSize = 0;

                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    const size = key.length + value.length;
                    totalSize += size;

                    const keyInfo = {
                        key: key,
                        size: `${size} chars`,
                        type: typeof (value ? JSON.parse(value) : null)
                    };

                    try {
                        // Test if it's valid JSON
                        JSON.parse(value || 'null');
                    } catch (e) {
                        keyInfo.type = 'Invalid JSON';
                    }

                    if (key.startsWith('myTunes') || key.includes('music') || key.includes('playlist')) {
                        myTunesKeys.push(keyInfo);
                    } else {
                        otherKeys.push(keyInfo);
                    }
                }

                storageInfo['Estimated Size'] = `${totalSize} characters`;
                Logger.table('Storage Overview', storageInfo);

                if (myTunesKeys.length > 0) {
                    Logger.table('MyTunes Storage Keys', myTunesKeys);
                } else {
                    Logger.warning('No MyTunes-specific storage keys found');
                }

                if (otherKeys.length > 0) {
                    Logger.table('Other Storage Keys', otherKeys.slice(0, 10)); // Show first 10
                }

                // Check for storage quota
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    navigator.storage.estimate().then(estimate => {
                        const quotaInfo = {
                            'Used Space': `${(estimate.usage / 1048576).toFixed(2)} MB`,
                            'Available Quota': `${(estimate.quota / 1048576).toFixed(2)} MB`,
                            'Usage Percentage': `${((estimate.usage / estimate.quota) * 100).toFixed(2)}%`
                        };

                        Logger.table('Storage Quota', quotaInfo);

                        if (estimate.usage / estimate.quota > 0.8) {
                            Logger.warning('Storage quota nearly full', 'May affect app functionality');
                        }
                    });
                }
            });
        },

        validateStorageData: () => {
            Logger.section('Storage Data Validation', () => {
                const criticalKeys = [
                    'myTunes-favorites',
                    'myTunes-playlists',
                    'myTunes-settings',
                    'myTunes-theme',
                    'myTunes-volume'
                ];

                const validationResults = {};

                criticalKeys.forEach(key => {
                    const value = localStorage.getItem(key);
                    
                    if (!value) {
                        validationResults[key] = 'Missing';
                        return;
                    }

                    try {
                        const parsed = JSON.parse(value);
                        validationResults[key] = 'Valid JSON';
                        
                        // Additional validation based on key type
                        if (key.includes('favorites') && !Array.isArray(parsed)) {
                            validationResults[key] = 'Invalid - should be array';
                        } else if (key.includes('playlists') && !Array.isArray(parsed)) {
                            validationResults[key] = 'Invalid - should be array';
                        } else if (key.includes('volume') && (typeof parsed !== 'number' || parsed < 0 || parsed > 1)) {
                            validationResults[key] = 'Invalid - should be number 0-1';
                        }
                    } catch (error) {
                        validationResults[key] = 'Invalid JSON';
                    }
                });

                Logger.table('Storage Validation', validationResults);

                const invalidCount = Object.values(validationResults).filter(v => v.includes('Invalid')).length;
                const missingCount = Object.values(validationResults).filter(v => v === 'Missing').length;

                if (invalidCount > 0) {
                    Logger.error(`${invalidCount} invalid storage entries found`);
                }

                if (missingCount > 0) {
                    Logger.warning(`${missingCount} expected storage entries missing`);
                }

                if (invalidCount === 0 && missingCount === 0) {
                    Logger.success('All storage data validated successfully');
                }
            });
        },

        clearAppStorage: () => {
            Logger.section('Clear App Storage', () => {
                const myTunesKeys = [];
                
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('myTunes') || key.includes('music') || key.includes('playlist'))) {
                        myTunesKeys.push(key);
                    }
                }

                if (myTunesKeys.length === 0) {
                    Logger.info('No MyTunes storage keys found to clear');
                    return;
                }

                const confirmed = confirm(`Clear ${myTunesKeys.length} MyTunes storage entries? This action cannot be undone.`);
                
                if (confirmed) {
                    myTunesKeys.forEach(key => localStorage.removeItem(key));
                    Logger.success(`Cleared ${myTunesKeys.length} storage entries`, myTunesKeys);
                } else {
                    Logger.info('Storage clear cancelled by user');
                }
            });
        }
    };

    // Error Tracker
    const ErrorTracker = {
        errors: [],
        isMonitoring: false,

        start: () => {
            if (ErrorTracker.isMonitoring) {
                Logger.warning('Error tracking already active');
                return;
            }

            ErrorTracker.isMonitoring = true;
            ErrorTracker.errors = [];

            // Global error handler
            window.addEventListener('error', (event) => {
                const error = {
                    timestamp: new Date().toISOString(),
                    type: 'JavaScript Error',
                    message: event.message,
                    filename: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    stack: event.error?.stack
                };

                ErrorTracker.errors.push(error);
                Logger.error('JavaScript Error Caught', error);
            });

            // Unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                const error = {
                    timestamp: new Date().toISOString(),
                    type: 'Unhandled Promise Rejection',
                    message: event.reason?.message || event.reason,
                    stack: event.reason?.stack
                };

                ErrorTracker.errors.push(error);
                Logger.error('Unhandled Promise Rejection', error);
            });

            // Console error override
            const originalConsoleError = console.error;
            console.error = function(...args) {
                const error = {
                    timestamp: new Date().toISOString(),
                    type: 'Console Error',
                    message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
                };

                ErrorTracker.errors.push(error);
                return originalConsoleError.apply(console, args);
            };

            Logger.success('Error tracking started');
            Logger.info('All errors will be captured and logged');
        },

        stop: () => {
            ErrorTracker.isMonitoring = false;
            Logger.info('Error tracking stopped');
        },

        getReport: () => {
            Logger.section('Error Report', () => {
                if (ErrorTracker.errors.length === 0) {
                    Logger.success('No errors captured');
                    return;
                }

                Logger.table('Captured Errors', ErrorTracker.errors);

                // Error analysis
                const errorTypes = ErrorTracker.errors.reduce((acc, error) => {
                    acc[error.type] = (acc[error.type] || 0) + 1;
                    return acc;
                }, {});

                Logger.table('Error Types Summary', errorTypes);

                // Most recent errors
                const recentErrors = ErrorTracker.errors.slice(-5);
                Logger.table('Most Recent Errors', recentErrors);
            });
        },

        clear: () => {
            ErrorTracker.errors = [];
            Logger.success('Error history cleared');
        }
    };

    // Service Worker Debugger
    const ServiceWorkerDebugger = {
        analyzeServiceWorker: () => {
            Logger.section('Service Worker Analysis', () => {
                if (!('serviceWorker' in navigator)) {
                    Logger.error('Service Worker not supported in this browser');
                    return;
                }

                navigator.serviceWorker.getRegistrations().then(registrations => {
                    if (registrations.length === 0) {
                        Logger.warning('No service workers registered');
                        return;
                    }

                    registrations.forEach((registration, index) => {
                        const swInfo = {
                            'Index': index,
                            'Scope': registration.scope,
                            'State': registration.active?.state || 'No active worker',
                            'Script URL': registration.active?.scriptURL || 'Unknown',
                            'Update Found': !!registration.waiting
                        };

                        Logger.table(`Service Worker ${index}`, swInfo);

                        if (registration.waiting) {
                            Logger.warning('Service Worker update available', 'New version waiting to activate');
                        }

                        if (registration.active?.state === 'redundant') {
                            Logger.error('Service Worker is redundant', 'May need re-registration');
                        }
                    });
                });

                // Check if page is controlled by service worker
                if (navigator.serviceWorker.controller) {
                    Logger.success('Page is controlled by service worker');
                } else {
                    Logger.warning('Page is not controlled by service worker', 'Offline functionality may not work');
                }
            });
        },

        testCacheAPI: () => {
            Logger.section('Cache API Testing', () => {
                if (!('caches' in window)) {
                    Logger.error('Cache API not supported');
                    return;
                }

                caches.keys().then(cacheNames => {
                    if (cacheNames.length === 0) {
                        Logger.warning('No caches found');
                        return;
                    }

                    Logger.table('Available Caches', cacheNames.map(name => ({ 'Cache Name': name })));

                    // Analyze each cache
                    cacheNames.forEach(async (cacheName) => {
                        try {
                            const cache = await caches.open(cacheName);
                            const requests = await cache.keys();
                            
                            const cacheInfo = {
                                'Cache Name': cacheName,
                                'Entry Count': requests.length,
                                'Sample URLs': requests.slice(0, 5).map(req => req.url)
                            };

                            Logger.table(`Cache: ${cacheName}`, cacheInfo);
                        } catch (error) {
                            Logger.error(`Failed to analyze cache: ${cacheName}`, error.message);
                        }
                    });
                });
            });
        }
    };

    // Main Debugger Interface
    const MyTunesDebugger = {
        version: '1.0.0',
        
        // Run complete diagnostic
        runFullDiagnostic: () => {
            console.clear();
            Logger.section('🎵 MyTunes Music App - Full Diagnostic Report', () => {
                Logger.info(`Debug Script Version: ${MyTunesDebugger.version}`);
                Logger.info(`Generated at: ${new Date().toISOString()}`);
                Logger.info('Running comprehensive system analysis...\n');

                // Core system checks
                CoreDebugger.analyzeAppState();
                CoreDebugger.validateDOMElements();
                CoreDebugger.checkEventListeners();

                // Audio system checks
                AudioDebugger.analyzeAudioState();
                AudioDebugger.testAudioFormats();

                // UI checks
                UIDebugger.validateUIState();
                UIDebugger.analyzeThemeSystem();
                UIDebugger.scanForDeadLinks();

                // Performance analysis
                PerformanceMonitor.getReport();

                // Network analysis
                NetworkDebugger.analyzeConnectionStatus();

                // Storage analysis
                StorageDebugger.analyzeLocalStorage();
                StorageDebugger.validateStorageData();

                // Service Worker analysis
                ServiceWorkerDebugger.analyzeServiceWorker();
                ServiceWorkerDebugger.testCacheAPI();

                // Error report
                ErrorTracker.getReport();

                Logger.success('Full diagnostic completed');
                Logger.info('Use individual debugger methods for focused analysis');
            });
        },

        // Quick health check
        quickHealthCheck: () => {
            Logger.section('🏥 Quick Health Check', () => {
                const issues = [];
                
                // Critical component checks
                if (!window.appState) issues.push('AppState not initialized');
                if (!window.appState?.audio) issues.push('Audio element missing');
                if (!document.getElementById('play-pause-navbar')) issues.push('Play button not found');
                if (!window.eventHandlers) issues.push('Event handlers not found');
                if (localStorage.length === 0) issues.push('No local storage data');

                if (issues.length === 0) {
                    Logger.success('✅ All critical components healthy');
                } else {
                    Logger.error(`❌ ${issues.length} issues found:`, issues);
                }

                // Quick stats
                const stats = {
                    'App Initialized': !!window.appState,
                    'Audio Ready': !!window.appState?.audio,
                    'Current Song': window.appState?.currentSong?.title || 'None',
                    'Queue Length': window.appState?.queue?.length || 0,
                    'Local Storage Items': localStorage.length,
                    'Service Worker Active': !!navigator.serviceWorker.controller
                };

                Logger.table('System Status', stats);
            });
        },

        // Individual debugger modules
        coreDebugger: CoreDebugger,
        audioDebugger: AudioDebugger,
        uiDebugger: UIDebugger,
        performanceMonitor: PerformanceMonitor,
        networkDebugger: NetworkDebugger,
        storageDebugger: StorageDebugger,
        errorTracker: ErrorTracker,
        serviceWorkerDebugger: ServiceWorkerDebugger,

        // Utility functions
        utils: {
            clearConsole: () => console.clear(),
            
            exportLogs: () => {
                const logs = {
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    appState: window.appState,
                    localStorage: Object.fromEntries(Object.entries(localStorage)),
                    errors: ErrorTracker.errors,
                    performance: PerformanceMonitor.data
                };

                const dataStr = JSON.stringify(logs, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `myTunes-debug-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                Logger.success('Debug logs exported to file');
            },

            startFullMonitoring: () => {
                Logger.info('Starting comprehensive monitoring...');
                PerformanceMonitor.start();
                ErrorTracker.start();
                NetworkDebugger.monitorRequests();
                AudioDebugger.monitorAudioEvents();
                Logger.success('Full monitoring active');
            },

            stopAllMonitoring: () => {
                Logger.info('Stopping all monitoring...');
                PerformanceMonitor.stop();
                ErrorTracker.stop();
                Logger.success('All monitoring stopped');
            }
        },

        // Help system
        help: () => {
            console.log(`
🎵 MyTunes Debug Script v${MyTunesDebugger.version}

MAIN FUNCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• MyTunesDebugger.runFullDiagnostic()     - Complete system analysis
• MyTunesDebugger.quickHealthCheck()      - Quick status check

FOCUSED DEBUGGING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• .coreDebugger.analyzeAppState()         - App state analysis
• .coreDebugger.validateDOMElements()     - DOM element validation
• .coreDebugger.checkEventListeners()     - Event listener analysis

• .audioDebugger.analyzeAudioState()      - Audio system analysis
• .audioDebugger.testAudioFormats()       - Audio format support test
• .audioDebugger.monitorAudioEvents()     - Start audio event monitoring

• .uiDebugger.validateUIState()           - UI state validation
• .uiDebugger.analyzeThemeSystem()        - Theme system analysis
• .uiDebugger.scanForDeadLinks()          - Dead link detection

• .performanceMonitor.start()             - Start performance monitoring
• .performanceMonitor.getReport()         - Get performance report
• .performanceMonitor.stop()              - Stop performance monitoring

• .networkDebugger.monitorRequests()      - Monitor network requests
• .networkDebugger.analyzeConnectionStatus() - Network status analysis
• .networkDebugger.testCORS()             - CORS testing

• .storageDebugger.analyzeLocalStorage()  - Local storage analysis
• .storageDebugger.validateStorageData()  - Storage data validation
• .storageDebugger.clearAppStorage()      - Clear app storage data

• .errorTracker.start()                   - Start error tracking
• .errorTracker.getReport()               - Get error report
• .errorTracker.stop()                    - Stop error tracking

• .serviceWorkerDebugger.analyzeServiceWorker() - Service worker analysis
• .serviceWorkerDebugger.testCacheAPI()   - Cache API testing

UTILITIES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• .utils.clearConsole()                   - Clear console
• .utils.exportLogs()                     - Export debug data to file
• .utils.startFullMonitoring()            - Start all monitoring systems
• .utils.stopAllMonitoring()              - Stop all monitoring systems
• .help()                                 - Show this help

EXAMPLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MyTunesDebugger.runFullDiagnostic();
MyTunesDebugger.audioDebugger.analyzeAudioState();
MyTunesDebugger.utils.startFullMonitoring();
            `);
        }
    };

    // Attach to window for global access
    window.MyTunesDebugger = MyTunesDebugger;

    // Auto-start error tracking if enabled
    if (DEBUG_CONFIG.enableDetailedLogging) {
        ErrorTracker.start();
    }

    // Welcome message
    Logger.success('MyTunes Debug Script Loaded', {
        version: MyTunesDebugger.version,
        usage: 'Type MyTunesDebugger.help() for usage instructions'
    });

})();