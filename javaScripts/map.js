// Enhanced Constants and Mappings for Music Player Application
// Unified and organized element IDs, classes, and selectors

// ===== ELEMENT IDS =====
export const IDS = Object.freeze({
  // Navigation & Layout
  nowPlayingArea: 'nowPlayingArea',
  themeToggle: 'themeToggle',
  globalSearchTrigger: 'globalSearchTrigger',
  searchDialog: 'searchDialog',
  globalSearchForm: 'globalSearchForm',
  globalSearchInput: 'globalSearchInput',
  recentSearchesList: 'recentSearchesList',
  popoverPortal: 'popoverPortal',
  willHideMenu: 'willHideMenu',
  menuTrigger: 'menuTrigger',
  dropdownMenu: 'dropdownMenu',
  playIndicator: 'playIndicator',
  
  // Navigation Controls (Updated naming convention)
  navbarPreviousBtn: 'navbarPreviousBtn',
  navbarNextBtn: 'navbarNextBtn',
  navbarPlayPauseBtn: 'navbarPlayPauseBtn',
  navbarPlayIcon: 'navbarPlayIcon',
  navbarPauseIcon: 'navbarPauseIcon',
  navbarSongTitle: 'navbarSongTitle',
  navbarArtistName: 'navbarArtistName',
  navbarAlbumCover: 'navbarAlbumCover',
  
  // Dropdown Menu Items
  favoriteSongs: 'favoriteSongs',
  favoriteArtists: 'favoriteArtists',
  favoriteAlbums: 'favoriteAlbums',
  createPlaylist: 'createPlaylist',
  recentlyPlayed: 'recentlyPlayed',
  queueView: 'queueView',
  searchMusic: 'searchMusic',
  shuffleAll: 'shuffleAll',
  appSettings: 'appSettings',
  aboutApp: 'aboutApp',
  
  // Counters
  favoriteSongsCount: 'favoriteSongsCount',
  favoriteArtistsCount: 'favoriteArtistsCount',
  recentCount: 'recentCount',
  queueCount: 'queueCount',
  
  // Music Player Container
  musicPlayer: 'musicPlayer',
  playerHandle: 'playerHandle',
  playerCloseBtn: 'playerCloseBtn',
  
  // Music Player - Now Playing Content
  playerAlbumCover: 'playerAlbumCover',
  playerSongTitle: 'playerSongTitle',
  playerArtistName: 'playerArtistName',
  playerAlbumName: 'playerAlbumName',
  playerCurrentTime: 'playerCurrentTime',
  playerTotalTime: 'playerTotalTime',
  playerProgressBar: 'playerProgressBar',
  playerProgressFill: 'playerProgressFill',
  playerProgressThumb: 'playerProgressThumb',
  
  // Music Player Controls
  playerPreviousBtn: 'playerPreviousBtn',
  playerRewindBtn: 'playerRewindBtn', 
  playerPlayPauseBtn: 'playerPlayPauseBtn',
  playerFastForwardBtn: 'playerFastForwardBtn',
  playerNextBtn: 'playerNextBtn',
  playerShuffleBtn: 'playerShuffleBtn',
  playerRepeatBtn: 'playerRepeatBtn',
  playerVolumeBtn: 'playerVolumeBtn',
  playerFavoriteBtn: 'playerFavoriteBtn',
  playerMoreBtn: 'playerMoreBtn',
  
  // Music Player - Tabs & Content
  playerTabsContainer: 'playerTabsContainer',
  playerTabNowPlaying: 'playerTabNowPlaying',
  playerTabQueue: 'playerTabQueue', 
  playerTabRecent: 'playerTabRecent',
  playerTabLyrics: 'playerTabLyrics',
  playerQueueList: 'playerQueueList',
  playerRecentList: 'playerRecentList',
  
  // Volume Controls
  volumeSlider: 'volumeSlider',
  volumeProgress: 'volumeProgress',
  volumeThumb: 'volumeThumb',
  
  // Seek Controls
  seekTooltip: 'seekTooltip',
  
  // PWA & DevTools
  erudaToggle: 'erudaToggle',
  pwaInstallBanner: 'pwaInstallBanner',
  pwaDownloadLink: 'pwaDownloadLink',
  pwaDismissBtn: 'pwaDismissBtn'
});

// ===== CSS CLASSES =====
export const CLASSES = Object.freeze({
  // Utility Classes
  hidden: 'hidden',
  show: 'show',
  active: 'active',
  disabled: 'disabled',
  loading: 'loading',
  playing: 'playing',
  paused: 'paused',
  
  // Theme Classes  
  light: 'light',
  medium: 'medium',
  dark: 'dark',
  
  // Animation Classes
  marquee: 'marquee',
  repeatOne: 'repeatOne',
  animateRotate: 'animate__animated animate__rotateIn',
  animateFadeIn: 'animate__animated animate__fadeIn',
  animateZoomIn: 'animate__animated animate__zoomIn',
  animatePulse: 'animate__animated animate__pulse',
  
  // State Classes
  hasSong: 'hasSong',
  searchDialogOpening: 'searchDialogOpening',
  searchDialogClosing: 'searchDialogClosing',
  
  // Image Classes
  imageFallback: 'imageFallback',
  imageLoaded: 'imageLoaded', 
  imageError: 'imageError',
  imageLoading: 'imageLoading'
});

// ===== SELECTORS =====
// Enhanced selector system using .closest() method for better modal handling
export const SELECTORS = Object.freeze({
  // Close button selectors using .closest() approach
  closeBtn: '.close',
  modalContainer: '.modal',
  dialogContainer: '.dialog', 
  popupContainer: '.popup',
  dropdownContainer: '.dropdown',
  
  // Music Player specific selectors
  musicPlayerContainer: '#musicPlayer',
  musicPlayerClose: '#musicPlayer .close',
  
  // Navigation selectors
  navbarContainer: '.navbar',
  navbarControls: '.nav-controls',
  
  // Content areas
  contentArea: '.content-area',
  mainContent: '.main-content'
});

// ===== ROUTES =====
export const ROUTES = Object.freeze({
  HOME: '/',
  SEARCH: '/search',
  ARTIST: '/artist',
  ALBUM: '/album',
  PLAYLIST: '/playlist',
  FAVORITES: '/favorites',
  QUEUE: '/queue',
  RECENT: '/recent',
  SETTINGS: '/settings'
});

// ===== THEMES =====
export const THEMES = Object.freeze({
  DARK: 'dark',
  MEDIUM: 'medium', 
  LIGHT: 'light'
});

// ===== STORAGE KEYS =====
export const STORAGE_KEYS = Object.freeze({
  THEME_PREFERENCE: 'theme-preference',
  PLAYLISTS: 'user-playlists',
  FAVORITES: 'user-favorites',
  RECENT_SEARCHES: 'recent-searches',
  QUEUE: 'music-queue',
  RECENTLY_PLAYED: 'recently-played',
  VOLUME: 'player-volume',
  REPEAT_MODE: 'repeat-mode',
  SHUFFLE_MODE: 'shuffle-mode'
});

// ===== ICONS =====
export const ICONS = Object.freeze({
  play: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>',
  pause: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64zm192 0c-26.5 0-48 21.5-48 48l0 288c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48l-32 0z"/></svg>',
  previous: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M267.5 440.6c9.5 7.9 22.8 9.7 34.1 4.4s18.4-16.6 18.4-29V96c0-12.4-7.2-23.7-18.4-29s-24.5-3.6-34.1 4.4L75.5 231l0 49 192 160z"/></svg>',
  next: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M52.5 440.6c-9.5 7.9-22.8 9.7-34.1 4.4S0 428.4 0 416V96c0-12.4 7.2-23.7 18.4-29s24.5-3.6 34.1 4.4L244.5 231l0 49L52.5 440.6z"/></svg>',
  shuffle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M403.8 34.4c12-5 25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160H352c-10.1 0-19.6 4.7-25.6 12.8L284 229.3 244 176l31.2-41.6C293.3 110.2 321.8 96 352 96h32V64c0-12.9 7.8-24.6 19.8-29.6zM164 282.7L204 336l-31.2 41.6C154.7 401.8 126.2 416 96 416H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H96c10.1 0 19.6-4.7 25.6-12.8L164 282.7zm274.6 188c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V416H352c-30.2 0-58.7-14.2-76.8-38.4L121.6 172.8c-6-8.1-15.5-12.8-25.6-12.8H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H96c30.2 0 58.7 14.2 76.8 38.4L326.4 339.2c6 8.1 15.5 12.8 25.6 12.8h32V320c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l64 64c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-64 64z"/></svg>',
  repeat: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 224c0 17.7 14.3 32 32 32s32-14.3 32-32c0-53 43-96 96-96H320v32c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l64-64c12.5-12.5 12.5-32.8 0-45.3l-64-64c-9.2-9.2-22.9-11.9-34.9-6.9S320 19.1 320 32V64H160C71.6 64 0 135.6 0 224zm512 64c0-17.7-14.3-32-32-32s-32 14.3-32 32c0 53-43 96-96 96H192V352c0-12.9-7.8-24.6-19.8-29.6s-25.7-2.2-34.9 6.9l-64 64c-12.5 12.5-12.5 32.8 0 45.3l64 64c9.2 9.2 22.9 11.9 34.9 6.9s19.8-16.6 19.8-29.6V448H352c88.4 0 160-71.6 160-160z"/></svg>',
  heart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/></svg>',
  volume: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M533.6 32.5C598.5 85.2 640 165.8 640 256s-41.5 170.7-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.2c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-33.7-6.1L163.8 352H96c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L267.4 40.9c8.7-9.2 22.2-11.3 33.7-6.1z"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>',
  search: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>',
  more: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 512"><path d="M64 360a56 56 0 1 0 0 112 56 56 0 1 0 0-112zm0-160a56 56 0 1 0 0 112 56 56 0 1 0 0-112zM120 96A56 56 0 1 0 8 96a56 56 0 1 0 112 0z"/></svg>'
});

// ===== AUDIO FORMATS =====
export const AUDIO_FORMATS = Object.freeze(['mp3', 'ogg', 'webm', 'm4a', 'wav']);

// ===== REPEAT MODES =====
export const REPEAT_MODES = Object.freeze({
  OFF: 'off',
  ALL: 'all',
  ONE: 'one'
});

// ===== NOTIFICATION TYPES =====
export const NOTIFICATION_TYPES = Object.freeze({
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
});

// ===== UTILITY FUNCTIONS =====
// Enhanced helper functions with better error handling
export const getElement = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with ID '${id}' not found`);
  }
  return element;
};

export const getElements = (selector) => {
  return document.querySelectorAll(selector);
};

export const getElementInContext = (contextSelector, elementSelector) => {
  const context = document.querySelector(contextSelector);
  return context ? context.querySelector(elementSelector) : null;
};

// Enhanced $ proxy for cleaner element access
export const $ = new Proxy({}, {
  get(_, key) {
    const id = IDS[key];
    return () => (id ? document.getElementById(id) : null);
  }
});

// Direct element access functions
export function $byId(id) {
  return document.getElementById(id);
}

export function $bySelector(selector) {
  return document.querySelector(selector);
}

export function $allBySelector(selector) {
  return document.querySelectorAll(selector);
}

// Enhanced context helper using .closest() approach for better modal handling
export function $inContext(contextId, elementClass) {
  const context = document.getElementById(contextId);
  return context ? context.querySelector(`.${elementClass}`) : null;
}

// Universal close button handler using .closest() method
export function handleClose(event) {
  const closeBtn = event.target.closest(SELECTORS.closeBtn);
  if (!closeBtn) return;
  
  // Find the closest modal, dialog, popup, or dropdown container
  const container = closeBtn.closest(`
    ${SELECTORS.modalContainer}, 
    ${SELECTORS.dialogContainer}, 
    ${SELECTORS.popupContainer}, 
    ${SELECTORS.dropdownContainer}
  `);
  
  if (container) {
    container.classList.remove(CLASSES.show, CLASSES.active);
    container.classList.add(CLASSES.hidden);
    
    // Dispatch custom close event
    container.dispatchEvent(new CustomEvent('modalClosed', {
      bubbles: true,
      detail: { container, closeBtn }
    }));
  }
}

// Global event listener for universal close handling
document.addEventListener('click', handleClose);

// Attach to window for global access
window.IDS = IDS;
window.CLASSES = CLASSES;
window.SELECTORS = SELECTORS;
window.ROUTES = ROUTES;
window.THEMES = THEMES;
window.STORAGE_KEYS = STORAGE_KEYS;
window.ICONS = ICONS;
window.AUDIO_FORMATS = AUDIO_FORMATS;
window.REPEAT_MODES = REPEAT_MODES;
window.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
window.$ = $;
window.$byId = $byId;
window.$bySelector = $bySelector;
window.$allBySelector = $allBySelector;
window.$inContext = $inContext;
window.getElement = getElement;
window.getElements = getElements;
window.getElementInContext = getElementInContext;
window.handleClose = handleClose;