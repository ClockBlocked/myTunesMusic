import {
  IDS,
  CLASSES,
  ROUTES,
  THEMES,
  STORAGE_KEYS,
  ICONS,
  AUDIO_FORMATS,
  REPEAT_MODES,
  NOTIFICATION_TYPES,
  $,
  $byId,
  $bySelector,
  $allBySelector,
  $inContext,
  handleClose
} from "./map.js";

import {
  music
} from "../modules/library.js";

// ===== CORE APPLICATION STATE MANAGEMENT =====
// Contains all player and UI state with organized data management
class AppState {
  constructor() {
    // HTML5 Audio instance for playback
    this.audio = null;

    // Current song metadata - CRITICAL for album cover and song info updates
    this.currentSong = null;
    this.currentArtist = null;
    this.currentAlbum = null;

    // Playback state management - drives play/pause button updates
    this.isPlaying = false;
    this.duration = 0;

    // Music queue and playback history
    this.queue = [];
    this.recentlyPlayed = [];
    this.isDragging = false;

    // Player control modes
    this.shuffleMode = false;
    this.repeatMode = REPEAT_MODES.OFF;

    // UI progress tracking
    this.seekTooltip = null;
    this.currentIndex = 0;

    // User data collections
    this.playlists = [];

    // UI state tracking
    this.isPopupVisible = false;
    this.currentTab = "now-playing";
    this.inactivityTimer = null;

    // Notification system state
    this.notificationContainer = null;
    this.notifications = [];
    this.currentNotificationTimeout = null;

    // Core application instances
    this.siteMapInstance = null;
    this.homePageManagerInstance = null;
  }

  // ===== COMPREHENSIVE FAVORITES MANAGEMENT SYSTEM =====
  favorites = {
    songs: new Set(),
    artists: new Set(),
    albums: new Set(),

    // Add item to favorites with UI feedback
    add: (type, id) => {
      this.favorites[type].add(id);
      this.favorites.save(type);
      this.favorites.updateIcon(type, id, true);
      const itemName = type === "songs" ? "song" : type.slice(0, -1);
      notifications.show(`Added ${itemName} to favorites`, NOTIFICATION_TYPES.SUCCESS);
    },

    // Remove item from favorites with UI feedback
    remove: (type, id) => {
      this.favorites[type].delete(id);
      this.favorites.save(type);
      this.favorites.updateIcon(type, id, false);
      const itemName = type === "songs" ? "song" : type.slice(0, -1);
      notifications.show(`Removed ${itemName} from favorites`, NOTIFICATION_TYPES.INFO);
    },

    // Toggle favorite status - returns new state
    toggle: (type, id) => {
      if (this.favorites[type].has(id)) {
        this.favorites.remove(type, id);
        return false;
      } else {
        this.favorites.add(type, id);
        return true;
      }
    },

    // Check if item is in favorites
    has: (type, id) => this.favorites[type].has(id),

    // Persist favorites to localStorage
    save: (type) => {
      const key = type === "songs" ? STORAGE_KEYS.FAVORITE_SONGS : 
                  type === "artists" ? STORAGE_KEYS.FAVORITE_ARTISTS : 
                  STORAGE_KEYS.FAVORITE_ALBUMS;
      storage.save(key, Array.from(this.favorites[type]));
    },

    // Update all favorite heart icons across the interface
    updateIcon: (type, id, isFavorite) => {
      const icons = document.querySelectorAll(`[data-favorite-${type}="${id}"]`);
      icons.forEach((icon) => {
        icon.classList.toggle(CLASSES.active, isFavorite);
        icon.setAttribute("aria-pressed", isFavorite);

        // Update heart icon visual styling for songs
        if (type === "songs") {
          const heartIcon = icon.querySelector("svg");
          if (heartIcon) {
            heartIcon.style.color = isFavorite ? "#ef4444" : "";
            heartIcon.style.fill = isFavorite ? "currentColor" : "none";
          }
        }
      });

      // Update current song favorite button in popup
      if (type === "songs" && appState.currentSong && appState.currentSong.id === id) {
        ui.updateFavoriteButton();
      }
    }
  };

  // ===== ADVANCED QUEUE MANAGEMENT SYSTEM =====
  queue = {
    items: [],

    // Add song to queue at specific position or end
    add: (song, position = null) => {
      if (position !== null) {
        this.queue.items.splice(position, 0, song);
      } else {
        this.queue.items.push(song);
      }
      storage.save(STORAGE_KEYS.QUEUE, this.queue.items);
      ui.updateCounts();
      notifications.show(`Added "${song.title}" to queue`);
    },

    // Remove song from queue by index
    remove: (index) => {
      if (index >= 0 && index < this.queue.items.length) {
        const removed = this.queue.items.splice(index, 1)[0];
        storage.save(STORAGE_KEYS.QUEUE, this.queue.items);
        ui.updateCounts();
        return removed;
      }
      return null;
    },

    // Clear entire queue
    clear: () => {
      this.queue.items = [];
      storage.save(STORAGE_KEYS.QUEUE, this.queue.items);
      ui.updateCounts();
    },

    // Get next song from queue
    getNext: () => {
      return this.queue.items.length > 0 ? this.queue.remove(0) : null;
    },

    // Get all queue items
    get: () => this.queue.items,

    // Play song at specific queue position
    playAt: (index) => {
      const song = this.queue.remove(index);
      if (song) {
        musicPlayer.play(song);
      }
    }
  };
}

// Global application state instance
const appState = new AppState();

// ===== LOCAL STORAGE MANAGEMENT =====
// Handles data persistence with comprehensive error handling
const storage = {
  // Save data to localStorage with JSON serialization
  save: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Storage save error:", error);
      notifications.show("Failed to save data", NOTIFICATION_TYPES.ERROR);
      return false;
    }
  },

  // Load data from localStorage with JSON parsing
  load: (key, defaultValue = null) => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error("Storage load error:", error);
      return defaultValue;
    }
  },

  // Remove item from localStorage
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Storage remove error:", error);
      return false;
    }
  },

  // Clear all localStorage data
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Storage clear error:", error);
      return false;
    }
  }
};

// ===== MUSIC PLAYER OBJECT =====
// Main music player functionality organized into logical methods
const musicPlayer = {
  // Initialize HTML5 Audio and set up event listeners
  initialize: () => {
    if (!appState.audio) {
      appState.audio = new Audio();
      appState.audio.crossOrigin = "anonymous";
      appState.audio.preload = "metadata";

      // Set up audio event listeners
      appState.audio.addEventListener("loadedmetadata", () => {
        appState.duration = appState.audio.duration;
        ui.updateProgressDisplay();
      });

      appState.audio.addEventListener("timeupdate", () => {
        if (!appState.isDragging) {
          ui.updateProgressDisplay();
        }
      });

      appState.audio.addEventListener("ended", () => {
        musicPlayer.next();
      });

      appState.audio.addEventListener("error", (e) => {
        console.error("Audio error:", e);
        notifications.show("Audio playback error", NOTIFICATION_TYPES.ERROR);
      });
    }

    // Set up system media controls
    mediaSession.setup();
  },

  // Load and attempt playback of audio file with format fallbacks
  loadAudioFile: async (songData) => {
    for (const format of AUDIO_FORMATS) {
      try {
        // Generate normalized filename for audio URL
        const songFileName = songData.title.toLowerCase().replace(/\s+/g, "").replace(/[^\w]/g, "");
        const audioUrl = `https://koders.cloud/global/content/audio/${songFileName}.${format}`;

        appState.audio.src = audioUrl;

        // Wait for audio to be ready for playback
        await new Promise((resolve, reject) => {
          const loadHandler = () => {
            appState.audio.removeEventListener("canplaythrough", loadHandler);
            appState.audio.removeEventListener("error", errorHandler);
            resolve();
          };

          const errorHandler = (e) => {
            appState.audio.removeEventListener("canplaythrough", loadHandler);
            appState.audio.removeEventListener("error", errorHandler);
            reject(e);
          };

          appState.audio.addEventListener("canplaythrough", loadHandler, { once: true });
          appState.audio.addEventListener("error", errorHandler, { once: true });

          if (appState.audio.readyState >= 3) {
            loadHandler();
          }
        });

        // Start playback
        await appState.audio.play();
        return true;
      } catch (error) {
        console.error(`Audio playback failed (${format}):`, error);
      }
    }
    return false;
  },

  // Main function to play a new song - CRITICAL FOR FIXING ALBUM COVER AND SONG INFO UPDATES
  play: async (songData) => {
    if (!songData) return;

    // Initialize audio if not already done
    musicPlayer.initialize();
    ui.setLoadingState(true);

    // Add current song to recently played history
    if (appState.currentSong) {
      musicPlayer.addToRecentlyPlayed(appState.currentSong);
    }

    // Update current song state - CRITICAL for UI updates
    appState.currentSong = songData;
    appState.currentArtist = songData.artist;
    appState.currentAlbum = songData.album;

    // IMMEDIATE UI UPDATES - fixes album cover and song info display issues
    ui.updateNowPlaying(); // Updates popup song info
    ui.updateNavbar(); // Updates navbar song info and album cover
    ui.updateMusicPlayer(); // Updates music player card
    ui.updateCounts(); // Updates counters
    mediaSession.updateMetadata(songData); // Updates system media session

    // Load and play the audio file
    const success = await musicPlayer.loadAudioFile(songData);

    if (success) {
      appState.isPlaying = true;
      ui.updatePlayPauseButtons();
      mediaSession.updatePlaybackState(true);
      
      // Re-bind control events after song change to ensure functionality
      setTimeout(() => {
        eventHandlers.bindControlEvents();
      }, 100);
    } else {
      // Show error but keep UI updated
      notifications.show("Could not load audio file", NOTIFICATION_TYPES.ERROR);
      appState.isPlaying = false;
      ui.updatePlayPauseButtons();
      mediaSession.updatePlaybackState(false);
    }

    ui.setLoadingState(false);
  },

  // Toggle play/pause state - main control for play/pause buttons
  toggle: () => {
    if (appState.isPlaying) {
      musicPlayer.pause();
    } else {
      musicPlayer.resume();
    }
  },

  // Pause playback
  pause: () => {
    if (appState.audio && appState.isPlaying) {
      appState.audio.pause();
      appState.isPlaying = false;
      ui.updatePlayPauseButtons();
      mediaSession.updatePlaybackState(false);
    }
  },

  // Resume playback
  resume: () => {
    if (appState.audio && !appState.isPlaying) {
      appState.audio.play().then(() => {
        appState.isPlaying = true;
        ui.updatePlayPauseButtons();
        mediaSession.updatePlaybackState(true);
      }).catch(error => {
        console.error("Resume playback failed:", error);
        notifications.show("Playback failed", NOTIFICATION_TYPES.ERROR);
      });
    }
  },

  // Play next song from queue or auto-advance
  next: () => {
    let nextSong = null;

    // Get next song from queue first
    if (appState.queue.items.length > 0) {
      nextSong = appState.queue.getNext();
    } else {
      // Auto-advance logic based on current context
      nextSong = musicPlayer.getNextSong();
    }

    if (nextSong) {
      musicPlayer.play(nextSong);
    } else {
      // No next song available
      appState.isPlaying = false;
      ui.updatePlayPauseButtons();
      notifications.show("End of playlist reached");
    }
  },

  // Play previous song
  previous: () => {
    const previousSong = musicPlayer.getPreviousSong();
    if (previousSong) {
      musicPlayer.play(previousSong);
    } else {
      // Restart current song if no previous song
      if (appState.audio) {
        appState.audio.currentTime = 0;
      }
    }
  },

  // Fast forward 10 seconds
  fastForward: () => {
    if (appState.audio) {
      appState.audio.currentTime = Math.min(
        appState.audio.currentTime + 10,
        appState.audio.duration || 0
      );
    }
  },

  // Rewind 10 seconds
  rewind: () => {
    if (appState.audio) {
      appState.audio.currentTime = Math.max(appState.audio.currentTime - 10, 0);
    }
  },

  // Seek to specific time position
  seekTo: (time) => {
    if (appState.audio && time >= 0 && time <= appState.audio.duration) {
      appState.audio.currentTime = time;
    }
  },

  // Add song to recently played history
  addToRecentlyPlayed: (song) => {
    // Remove if already exists to avoid duplicates
    appState.recentlyPlayed = appState.recentlyPlayed.filter(item => item.id !== song.id);
    
    // Add to beginning
    appState.recentlyPlayed.unshift(song);
    
    // Limit to 50 items
    if (appState.recentlyPlayed.length > 50) {
      appState.recentlyPlayed = appState.recentlyPlayed.slice(0, 50);
    }
    
    storage.save(STORAGE_KEYS.RECENTLY_PLAYED, appState.recentlyPlayed);
  },

  // Get next song based on shuffle/repeat modes and current context
  getNextSong: () => {
    // Implementation depends on current view context and shuffle/repeat settings
    // This is a placeholder for more complex logic
    return null;
  },

  // Get previous song from recently played
  getPreviousSong: () => {
    if (appState.recentlyPlayed.length > 1) {
      return appState.recentlyPlayed[1]; // Skip current song at index 0
    }
    return null;
  }
};

// ===== PLAYBACK CONTROLS =====
// Organized control functions for shuffle, repeat, and playback modes
const controls = {
  shuffle: {
    // Toggle shuffle mode
    toggle: () => {
      appState.shuffleMode = !appState.shuffleMode;
      ui.updateShuffleButton();
      storage.save(STORAGE_KEYS.SHUFFLE_MODE, appState.shuffleMode);
      notifications.show(`Shuffle ${appState.shuffleMode ? 'on' : 'off'}`);
    },

    // Play all songs in shuffle mode
    all: () => {
      if (!music || music.length === 0) {
        notifications.show("No music available", NOTIFICATION_TYPES.WARNING);
        return;
      }

      // Collect all songs
      const allSongs = [];
      music.forEach(artist => {
        artist.albums.forEach(album => {
          album.songs.forEach(song => {
            allSongs.push({
              ...song,
              artist: artist.artist,
              album: album.album
            });
          });
        });
      });

      if (allSongs.length === 0) return;

      // Shuffle the array
      for (let i = allSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSongs[i], allSongs[j]] = [allSongs[j], allSongs[i]];
      }

      // Add all but first to queue
      allSongs.slice(1).forEach((song) => appState.queue.add(song));
      musicPlayer.play(allSongs[0]);
      appState.shuffleMode = true;
      ui.updateShuffleButton();
      notifications.show("Playing all songs shuffled");
    }
  },

  repeat: {
    // Cycle through repeat modes: off -> all -> one -> off
    toggle: () => {
      if (appState.repeatMode === REPEAT_MODES.OFF) {
        appState.repeatMode = REPEAT_MODES.ALL;
      } else if (appState.repeatMode === REPEAT_MODES.ALL) {
        appState.repeatMode = REPEAT_MODES.ONE;
      } else {
        appState.repeatMode = REPEAT_MODES.OFF;
      }

      ui.updateRepeatButton();
      storage.save(STORAGE_KEYS.REPEAT_MODE, appState.repeatMode);

      const modeText = appState.repeatMode === REPEAT_MODES.OFF ? "disabled" : 
                      appState.repeatMode === REPEAT_MODES.ALL ? "all songs" : 
                      "current song";
      notifications.show(`Repeat ${modeText}`);
    }
  },

  volume: {
    // Set volume level (0-1)
    set: (level) => {
      if (appState.audio) {
        appState.audio.volume = Math.max(0, Math.min(1, level));
        storage.save(STORAGE_KEYS.VOLUME, appState.audio.volume);
        ui.updateVolumeDisplay();
      }
    },

    // Toggle mute/unmute
    toggleMute: () => {
      if (appState.audio) {
        appState.audio.muted = !appState.audio.muted;
        ui.updateVolumeDisplay();
      }
    }
  }
};

// ===== USER INTERFACE MANAGEMENT =====
// Comprehensive UI update functions for all display elements
const ui = {
  // Update now playing display in popup player
  updateNowPlaying: () => {
    if (!appState.currentSong) return;

    const albumCover = $byId(IDS.playerAlbumCover);
    const songTitle = $byId(IDS.playerSongTitle);
    const artistName = $byId(IDS.playerArtistName);
    const albumName = $byId(IDS.playerAlbumName);

    if (albumCover) {
      const albumUrl = utils.getAlbumImageUrl(appState.currentSong.album);
      utils.loadImageWithFallback(albumCover, albumUrl, utils.getDefaultAlbumImage(), "album");
    }

    if (songTitle) {
      songTitle.textContent = appState.currentSong.title;
      songTitle.classList.toggle(CLASSES.marquee, appState.currentSong.title.length > 25);
    }

    if (artistName) artistName.textContent = appState.currentSong.artist;
    if (albumName) albumName.textContent = appState.currentSong.album;
  },

  // Update navbar display with current song info
  updateNavbar: () => {
    if (!appState.currentSong) return;

    const navSongTitle = $byId(IDS.navbarSongTitle);
    const navArtistName = $byId(IDS.navbarArtistName);
    const navAlbumCover = $byId(IDS.navbarAlbumCover);
    const nowPlayingArea = $byId(IDS.nowPlayingArea);

    if (navSongTitle) {
      navSongTitle.textContent = appState.currentSong.title;
      navSongTitle.classList.toggle(CLASSES.marquee, appState.currentSong.title.length > 20);
    }

    if (navArtistName) navArtistName.textContent = appState.currentSong.artist;

    if (navAlbumCover) {
      const img = navAlbumCover.querySelector("img");
      const svg = navAlbumCover.querySelector("svg");

      if (img) {
        const albumUrl = utils.getAlbumImageUrl(appState.currentSong.album);
        utils.loadImageWithFallback(img, albumUrl, utils.getDefaultAlbumImage(), "album");
        img.classList.remove("opacity-0");
        img.classList.add("opacity-100");
      }

      if (svg) {
        svg.classList.add(CLASSES.hidden);
      }
    }

    if (nowPlayingArea) {
      nowPlayingArea.classList.add(CLASSES.hasSong);
    }
  },

  // Update all play/pause button states - FIXES PLAY/PAUSE BUTTON ISSUES
  updatePlayPauseButtons: () => {
    // Update navbar play/pause icons
    const navbarPlayIcon = $byId(IDS.navbarPlayIcon);
    const navbarPauseIcon = $byId(IDS.navbarPauseIcon);
    
    if (navbarPlayIcon) {
      navbarPlayIcon.style.display = appState.isPlaying ? 'none' : 'block';
    }
    if (navbarPauseIcon) {
      navbarPauseIcon.style.display = appState.isPlaying ? 'block' : 'none';
    }

    // Update music player play/pause button
    const playerPlayBtn = $byId(IDS.playerPlayPauseBtn);
    if (playerPlayBtn) {
      const playIcon = playerPlayBtn.querySelector('.play');
      const pauseIcon = playerPlayBtn.querySelector('.pause');
      
      if (playIcon) playIcon.style.display = appState.isPlaying ? 'none' : 'block';
      if (pauseIcon) pauseIcon.style.display = appState.isPlaying ? 'block' : 'none';
      
      playerPlayBtn.classList.toggle(CLASSES.playing, appState.isPlaying);
    }

    // Update play indicator
    const playIndicator = $byId(IDS.playIndicator);
    if (playIndicator) {
      playIndicator.classList.toggle(CLASSES.active, appState.isPlaying);
    }
  },

  // Update shuffle button state and visual indicator
  updateShuffleButton: () => {
    const shuffleBtn = $byId(IDS.playerShuffleBtn);
    if (shuffleBtn) {
      shuffleBtn.classList.toggle(CLASSES.active, appState.shuffleMode);
    }
  },

  // Update repeat button state and visual indicator
  updateRepeatButton: () => {
    const repeatBtn = $byId(IDS.playerRepeatBtn);
    if (repeatBtn) {
      repeatBtn.classList.toggle(CLASSES.active, appState.repeatMode !== REPEAT_MODES.OFF);
      repeatBtn.classList.toggle(CLASSES.repeatOne, appState.repeatMode === REPEAT_MODES.ONE);
    }
  },

  // Update favorite button state
  updateFavoriteButton: () => {
    if (!appState.currentSong) return;

    const favoriteBtn = $byId(IDS.playerFavoriteBtn);
    if (favoriteBtn) {
      const isFavorite = appState.favorites.has("songs", appState.currentSong.id);
      favoriteBtn.classList.toggle(CLASSES.active, isFavorite);
      favoriteBtn.setAttribute("data-favorite-songs", appState.currentSong.id);

      // Update heart icon color
      const heartIcon = favoriteBtn.querySelector("svg");
      if (heartIcon) {
        heartIcon.style.color = isFavorite ? "#ef4444" : "";
        heartIcon.style.fill = isFavorite ? "currentColor" : "none";
      }
    }
  },

  // Update progress bar display
  updateProgressDisplay: () => {
    if (!appState.audio || !appState.duration) return;

    const currentTime = appState.audio.currentTime;
    const progress = (currentTime / appState.duration) * 100;

    // Update progress bar
    const progressFill = $byId(IDS.playerProgressFill);
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    // Update time displays
    const currentTimeEl = $byId(IDS.playerCurrentTime);
    const totalTimeEl = $byId(IDS.playerTotalTime);
    
    if (currentTimeEl) currentTimeEl.textContent = utils.formatTime(currentTime);
    if (totalTimeEl) totalTimeEl.textContent = utils.formatTime(appState.duration);
  },

  // Update volume display
  updateVolumeDisplay: () => {
    if (!appState.audio) return;

    const volume = appState.audio.muted ? 0 : appState.audio.volume;
    const volumeProgress = $byId(IDS.volumeProgress);
    
    if (volumeProgress) {
      volumeProgress.style.width = `${volume * 100}%`;
    }

    // Update volume button icon based on level
    const volumeBtn = $byId(IDS.playerVolumeBtn);
    if (volumeBtn) {
      // Update icon based on volume level
      volumeBtn.classList.toggle('muted', appState.audio.muted || volume === 0);
    }
  },

  // Update counters in dropdown menu
  updateCounts: () => {
    const favSongsCount = $byId(IDS.favoriteSongsCount);
    const favArtistsCount = $byId(IDS.favoriteArtistsCount);
    const favAlbumsCount = $byId(IDS.favoriteAlbumsCount);
    const queueCount = $byId(IDS.queueCount);
    const recentCount = $byId(IDS.recentCount);

    if (favSongsCount) favSongsCount.textContent = appState.favorites.songs.size;
    if (favArtistsCount) favArtistsCount.textContent = appState.favorites.artists.size;
    if (favAlbumsCount) favAlbumsCount.textContent = appState.favorites.albums.size;
    if (queueCount) queueCount.textContent = appState.queue.items.length;
    if (recentCount) recentCount.textContent = appState.recentlyPlayed.length;
  },

  // Set loading state for various UI elements
  setLoadingState: (isLoading) => {
    const playerContainer = $byId(IDS.musicPlayer);
    if (playerContainer) {
      playerContainer.classList.toggle(CLASSES.loading, isLoading);
    }
  },

  // Update music player modal visibility
  updateMusicPlayer: () => {
    const playerContainer = $byId(IDS.musicPlayer);
    if (playerContainer && appState.currentSong) {
      playerContainer.classList.toggle(CLASSES.show, appState.isPopupVisible);
    }
  }
};

// ===== POPUP/MODAL MANAGEMENT =====
// Handles music player modal and other popups
const popup = {
  // Open music player modal
  open: () => {
    const playerContainer = $byId(IDS.musicPlayer);
    if (playerContainer) {
      appState.isPopupVisible = true;
      playerContainer.classList.add(CLASSES.show);
      playerContainer.classList.remove(CLASSES.hidden);
      ui.updateMusicPlayer();
    }
  },

  // Close music player modal
  close: () => {
    const playerContainer = $byId(IDS.musicPlayer);
    if (playerContainer) {
      appState.isPopupVisible = false;
      playerContainer.classList.remove(CLASSES.show);
      playerContainer.classList.add(CLASSES.hidden);
    }
  },

  // Toggle music player modal
  toggle: () => {
    if (appState.isPopupVisible) {
      popup.close();
    } else {
      popup.open();
    }
  },

  // Switch tabs in music player
  switchTab: (tabName) => {
    const tabs = $allBySelector('.tab');
    const contents = $allBySelector('.content');

    tabs.forEach(tab => {
      tab.classList.toggle(CLASSES.active, tab.dataset.tab === tabName);
    });

    contents.forEach(content => {
      content.classList.toggle(CLASSES.active, content.dataset.tab === tabName);
    });

    appState.currentTab = tabName;
    
    // Update content based on tab
    if (tabName === 'queue') {
      popup.updateQueueTab();
    } else if (tabName === 'recent') {
      popup.updateRecentTab();
    }
  },

  // Update queue tab content
  updateQueueTab: () => {
    const queueList = $byId(IDS.playerQueueList);
    if (!queueList) return;

    if (appState.queue.items.length === 0) {
      queueList.innerHTML = '<li class="empty-message">Queue is empty</li>';
      return;
    }

    queueList.innerHTML = appState.queue.items.map((song, index) => `
      <li class="queue-item" data-queue-index="${index}">
        <div class="song-info">
          <div class="song-title">${song.title}</div>
          <div class="song-artist">${song.artist}</div>
        </div>
        <button class="btn-remove" onclick="appState.queue.remove(${index})">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </li>
    `).join('');
  },

  // Update recent tab content
  updateRecentTab: () => {
    const recentList = $byId(IDS.playerRecentList);
    if (!recentList) return;

    if (appState.recentlyPlayed.length === 0) {
      recentList.innerHTML = '<li class="empty-message">No recent tracks</li>';
      return;
    }

    recentList.innerHTML = appState.recentlyPlayed.map((song, index) => `
      <li class="recent-item" onclick="musicPlayer.play(${JSON.stringify(song).replace(/"/g, '&quot;')})">
        <div class="song-info">
          <div class="song-title">${song.title}</div>
          <div class="song-artist">${song.artist}</div>
        </div>
      </li>
    `).join('');
  }
};

// ===== DROPDOWN MENU MANAGEMENT =====
// Handles main navigation dropdown
const dropdown = {
  // Open dropdown menu
  open: () => {
    const dropdownMenu = $byId(IDS.dropdownMenu);
    if (dropdownMenu) {
      dropdownMenu.classList.add(CLASSES.show);
    }
  },

  // Close dropdown menu
  close: () => {
    const dropdownMenu = $byId(IDS.dropdownMenu);
    if (dropdownMenu) {
      dropdownMenu.classList.remove(CLASSES.show);
    }
  },

  // Toggle dropdown menu
  toggle: () => {
    const dropdownMenu = $byId(IDS.dropdownMenu);
    if (dropdownMenu) {
      if (dropdownMenu.classList.contains(CLASSES.show)) {
        dropdown.close();
      } else {
        dropdown.open();
      }
    }
  }
};

// ===== THEME MANAGEMENT SYSTEM =====
// Handles dark/medium/light theme switching
const theme = {
  // Toggle between dark/medium/light themes
  toggle: () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'dark';
    
    let newTheme;
    if (currentTheme === 'dark') {
      newTheme = 'medium';
    } else if (currentTheme === 'medium') {
      newTheme = 'light';
    } else {
      newTheme = 'dark';
    }
    
    theme.set(newTheme);
  },

  // Set specific theme
  set: (themeName) => {
    const html = document.documentElement;
    html.setAttribute('data-theme', themeName);
    storage.save(STORAGE_KEYS.THEME_PREFERENCE, themeName);
    theme.updateButtons(themeName);
  },

  // Update theme toggle buttons
  updateButtons: (currentTheme) => {
    const themeButtons = $allBySelector('.theme-options button');
    themeButtons.forEach(btn => {
      btn.classList.toggle(CLASSES.active, btn.dataset.theme === currentTheme);
    });
  },

  // Initialize theme from storage or default
  initialize: () => {
    const savedTheme = storage.load(STORAGE_KEYS.THEME_PREFERENCE, 'dark');
    theme.set(savedTheme);
  }
};

// ===== NOTIFICATION SYSTEM =====
// Handles user notifications and messages
const notifications = {
  // Show notification with specified type and duration
  show: (message, type = NOTIFICATION_TYPES.INFO, duration = 3000) => {
    // Clear existing timeout
    if (appState.currentNotificationTimeout) {
      clearTimeout(appState.currentNotificationTimeout);
    }

    // Create or get notification container
    let container = appState.notificationContainer;
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
      appState.notificationContainer = container;
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Add to container
    container.appendChild(notification);

    // Show with animation
    requestAnimationFrame(() => {
      notification.classList.add(CLASSES.show);
    });

    // Auto-hide after duration
    const hideNotification = () => {
      notification.classList.remove(CLASSES.show);
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    };

    // Set timeout for auto-hide
    appState.currentNotificationTimeout = setTimeout(hideNotification, duration);

    // Handle manual close
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (appState.currentNotificationTimeout) {
          clearTimeout(appState.currentNotificationTimeout);
        }
        hideNotification();
      });
    }
  }
};

// ===== MEDIA SESSION API INTEGRATION =====
// Handles system media controls and metadata
const mediaSession = {
  // Set up Media Session API
  setup: () => {
    if ('mediaSession' in navigator) {
      // Set up action handlers
      navigator.mediaSession.setActionHandler('play', () => musicPlayer.resume());
      navigator.mediaSession.setActionHandler('pause', () => musicPlayer.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => musicPlayer.previous());
      navigator.mediaSession.setActionHandler('nexttrack', () => musicPlayer.next());
      navigator.mediaSession.setActionHandler('seekbackward', () => musicPlayer.rewind());
      navigator.mediaSession.setActionHandler('seekforward', () => musicPlayer.fastForward());
    }
  },

  // Update metadata for current song
  updateMetadata: (songData) => {
    if ('mediaSession' in navigator && songData) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songData.title,
        artist: songData.artist,
        album: songData.album,
        artwork: [
          {
            src: utils.getAlbumImageUrl(songData.album),
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      });
    }
  },

  // Update playback state
  updatePlaybackState: (isPlaying) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }
};

// ===== EVENT HANDLERS =====
// Centralized event handler management
const eventHandlers = {
  // Bind all control events
  bindControlEvents: () => {
    // Navigation controls
    const navPrevBtn = $byId(IDS.navbarPreviousBtn);
    const navPlayPauseBtn = $byId(IDS.navbarPlayPauseBtn);
    const navNextBtn = $byId(IDS.navbarNextBtn);
    
    if (navPrevBtn) {
      navPrevBtn.removeEventListener('click', musicPlayer.previous);
      navPrevBtn.addEventListener('click', musicPlayer.previous);
    }
    
    if (navPlayPauseBtn) {
      navPlayPauseBtn.removeEventListener('click', musicPlayer.toggle);
      navPlayPauseBtn.addEventListener('click', musicPlayer.toggle);
    }
    
    if (navNextBtn) {
      navNextBtn.removeEventListener('click', musicPlayer.next);
      navNextBtn.addEventListener('click', musicPlayer.next);
    }

    // Player controls
    const playerPrevBtn = $byId(IDS.playerPreviousBtn);
    const playerPlayPauseBtn = $byId(IDS.playerPlayPauseBtn);
    const playerNextBtn = $byId(IDS.playerNextBtn);
    const playerRewindBtn = $byId(IDS.playerRewindBtn);
    const playerFastForwardBtn = $byId(IDS.playerFastForwardBtn);
    const playerShuffleBtn = $byId(IDS.playerShuffleBtn);
    const playerRepeatBtn = $byId(IDS.playerRepeatBtn);
    const playerFavoriteBtn = $byId(IDS.playerFavoriteBtn);

    if (playerPrevBtn) {
      playerPrevBtn.removeEventListener('click', musicPlayer.previous);
      playerPrevBtn.addEventListener('click', musicPlayer.previous);
    }
    
    if (playerPlayPauseBtn) {
      playerPlayPauseBtn.removeEventListener('click', musicPlayer.toggle);
      playerPlayPauseBtn.addEventListener('click', musicPlayer.toggle);
    }
    
    if (playerNextBtn) {
      playerNextBtn.removeEventListener('click', musicPlayer.next);
      playerNextBtn.addEventListener('click', musicPlayer.next);
    }
    
    if (playerRewindBtn) {
      playerRewindBtn.removeEventListener('click', musicPlayer.rewind);
      playerRewindBtn.addEventListener('click', musicPlayer.rewind);
    }
    
    if (playerFastForwardBtn) {
      playerFastForwardBtn.removeEventListener('click', musicPlayer.fastForward);
      playerFastForwardBtn.addEventListener('click', musicPlayer.fastForward);
    }
    
    if (playerShuffleBtn) {
      playerShuffleBtn.removeEventListener('click', controls.shuffle.toggle);
      playerShuffleBtn.addEventListener('click', controls.shuffle.toggle);
    }
    
    if (playerRepeatBtn) {
      playerRepeatBtn.removeEventListener('click', controls.repeat.toggle);
      playerRepeatBtn.addEventListener('click', controls.repeat.toggle);
    }
    
    if (playerFavoriteBtn) {
      playerFavoriteBtn.removeEventListener('click', eventHandlers.handleFavoriteClick);
      playerFavoriteBtn.addEventListener('click', eventHandlers.handleFavoriteClick);
    }

    // Menu and popup controls
    const menuTrigger = $byId(IDS.menuTrigger);
    const nowPlayingArea = $byId(IDS.nowPlayingArea);
    const themeToggle = $byId(IDS.themeToggle);

    if (menuTrigger) {
      menuTrigger.removeEventListener('click', dropdown.toggle);
      menuTrigger.addEventListener('click', dropdown.toggle);
    }
    
    if (nowPlayingArea) {
      nowPlayingArea.removeEventListener('click', popup.toggle);
      nowPlayingArea.addEventListener('click', popup.toggle);
    }
    
    if (themeToggle) {
      themeToggle.removeEventListener('click', theme.toggle);
      themeToggle.addEventListener('click', theme.toggle);
    }

    // Progress bar interaction
    eventHandlers.bindProgressBarEvents();
    
    // Volume control interaction
    eventHandlers.bindVolumeEvents();
    
    // Tab switching
    eventHandlers.bindTabEvents();
    
    // Dropdown menu items
    eventHandlers.bindDropdownEvents();
  },

  // Handle favorite button click
  handleFavoriteClick: () => {
    if (appState.currentSong) {
      appState.favorites.toggle("songs", appState.currentSong.id);
    }
  },

  // Bind progress bar events
  bindProgressBarEvents: () => {
    const progressBar = $byId(IDS.playerProgressBar);
    if (!progressBar) return;

    const handleProgressClick = (e) => {
      if (!appState.audio || !appState.duration) return;
      
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = percent * appState.duration;
      musicPlayer.seekTo(time);
    };

    progressBar.removeEventListener('click', handleProgressClick);
    progressBar.addEventListener('click', handleProgressClick);
  },

  // Bind volume control events
  bindVolumeEvents: () => {
    const volumeSlider = $byId(IDS.volumeSlider);
    const volumeBtn = $byId(IDS.playerVolumeBtn);
    
    if (volumeSlider) {
      const handleVolumeClick = (e) => {
        const rect = volumeSlider.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        controls.volume.set(percent);
      };

      volumeSlider.removeEventListener('click', handleVolumeClick);
      volumeSlider.addEventListener('click', handleVolumeClick);
    }
    
    if (volumeBtn) {
      volumeBtn.removeEventListener('click', controls.volume.toggleMute);
      volumeBtn.addEventListener('click', controls.volume.toggleMute);
    }
  },

  // Bind tab switching events
  bindTabEvents: () => {
    const tabs = $allBySelector('.tab');
    tabs.forEach(tab => {
      const handleTabClick = () => {
        popup.switchTab(tab.dataset.tab);
      };
      
      tab.removeEventListener('click', handleTabClick);
      tab.addEventListener('click', handleTabClick);
    });
  },

  // Bind dropdown menu item events
  bindDropdownEvents: () => {
    const menuItems = {
      [IDS.favoriteSongs]: () => {
        dropdown.close();
        // Show favorite songs view
        notifications.show("Favorite songs view - TODO: Implement");
      },
      [IDS.favoriteArtists]: () => {
        dropdown.close();
        // Show favorite artists view
        notifications.show("Favorite artists view - TODO: Implement");
      },
      [IDS.favoriteAlbums]: () => {
        dropdown.close();
        // Show favorite albums view
        notifications.show("Favorite albums view - TODO: Implement");
      },
      [IDS.recentlyPlayed]: () => {
        dropdown.close();
        popup.open();
        setTimeout(() => popup.switchTab("recent"), 50);
      },
      [IDS.queueView]: () => {
        dropdown.close();
        popup.open();
        setTimeout(() => popup.switchTab("queue"), 50);
      },
      [IDS.createPlaylist]: () => {
        dropdown.close();
        // Create playlist functionality
        notifications.show("Create playlist - TODO: Implement");
      },
      [IDS.shuffleAll]: () => {
        dropdown.close();
        controls.shuffle.all();
      },
      [IDS.searchMusic]: () => {
        dropdown.close();
        // Search functionality
        notifications.show("Search music - TODO: Implement");
      },
      [IDS.appSettings]: () => {
        dropdown.close();
        // Settings functionality
        notifications.show("Settings - TODO: Implement");
      },
      [IDS.aboutApp]: () => {
        dropdown.close();
        // About functionality
        notifications.show("About MyBeats™ - Advanced Music Player");
      }
    };

    Object.entries(menuItems).forEach(([id, handler]) => {
      const element = $byId(id);
      if (element) {
        element.removeEventListener('click', handler);
        element.addEventListener('click', handler);
      }
    });
  }
};

// ===== UTILITY FUNCTIONS =====
// Helper functions for common operations
const utils = {
  // Format seconds to MM:SS format
  formatTime: (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  // Get album image URL
  getAlbumImageUrl: (albumName) => {
    if (!albumName) return utils.getDefaultAlbumImage();
    return `https://koders.cloud/global/content/images/albumCovers/${albumName.toLowerCase().replace(/\s+/g, '')}.png`;
  },

  // Get artist image URL
  getArtistImageUrl: (artistName) => {
    if (!artistName) return utils.getDefaultArtistImage();
    const normalizedName = artistName.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, '');
    return `https://koders.cloud/global/content/images/artistPortraits/${normalizedName}.png`;
  },

  // Get default album image
  getDefaultAlbumImage: () => {
    return 'https://koders.cloud/global/content/images/albumCovers/default-album.png';
  },

  // Get default artist image
  getDefaultArtistImage: () => {
    return 'https://koders.cloud/global/content/images/artistPortraits/default-artist.png';
  },

  // Load image with fallback
  loadImageWithFallback: (imgElement, primaryUrl, fallbackUrl, type = 'image') => {
    if (!imgElement) return;

    imgElement.classList.add(CLASSES.imageLoading);

    const loadPrimary = () => {
      imgElement.src = primaryUrl;
      imgElement.onload = () => {
        imgElement.classList.remove(CLASSES.imageLoading, CLASSES.imageError);
        imgElement.classList.add(CLASSES.imageLoaded);
      };
      imgElement.onerror = loadFallback;
    };

    const loadFallback = () => {
      imgElement.src = fallbackUrl;
      imgElement.onload = () => {
        imgElement.classList.remove(CLASSES.imageLoading);
        imgElement.classList.add(CLASSES.imageFallback);
      };
      imgElement.onerror = () => {
        imgElement.classList.remove(CLASSES.imageLoading);
        imgElement.classList.add(CLASSES.imageError);
      };
    };

    loadPrimary();
  }
};

// ===== APPLICATION INITIALIZATION =====
// Initialize the application when DOM is ready
const app = {
  // Initialize the entire application
  initialize: () => {
    // Initialize theme
    theme.initialize();
    
    // Load saved data
    app.loadSavedData();
    
    // Bind all events
    eventHandlers.bindControlEvents();
    
    // Set up media session
    mediaSession.setup();
    
    // Update UI
    ui.updateCounts();
    ui.updatePlayPauseButtons();
    
    // Set up global close handler (already attached in map.js)
    
    console.log("MyBeats™ initialized successfully");
  },

  // Load saved data from localStorage
  loadSavedData: () => {
    // Load favorites
    const savedFavSongs = storage.load(STORAGE_KEYS.FAVORITE_SONGS, []);
    const savedFavArtists = storage.load(STORAGE_KEYS.FAVORITE_ARTISTS, []);
    const savedFavAlbums = storage.load(STORAGE_KEYS.FAVORITE_ALBUMS, []);
    
    appState.favorites.songs = new Set(savedFavSongs);
    appState.favorites.artists = new Set(savedFavArtists);
    appState.favorites.albums = new Set(savedFavAlbums);

    // Load queue and recently played
    appState.queue.items = storage.load(STORAGE_KEYS.QUEUE, []);
    appState.recentlyPlayed = storage.load(STORAGE_KEYS.RECENTLY_PLAYED, []);

    // Load player settings
    appState.shuffleMode = storage.load(STORAGE_KEYS.SHUFFLE_MODE, false);
    appState.repeatMode = storage.load(STORAGE_KEYS.REPEAT_MODE, REPEAT_MODES.OFF);

    // Load volume
    if (appState.audio) {
      const savedVolume = storage.load(STORAGE_KEYS.VOLUME, 1);
      appState.audio.volume = savedVolume;
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', app.initialize);
} else {
  app.initialize();
}

// Export for global access
window.appState = appState;
window.musicPlayer = musicPlayer;
window.controls = controls;
window.ui = ui;
window.popup = popup;
window.dropdown = dropdown;
window.theme = theme;
window.notifications = notifications;
window.utils = utils;