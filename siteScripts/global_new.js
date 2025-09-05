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
  $byId
} from "./map.js";
import {
  music
} from "../global/content/audio/script/index.js";
import {
  render,
  create
} from "./utilities/pages/templates.js";

class AppState {
  constructor() {
    this.audio = null;
    this.currentSong = null;
    this.currentArtist = null;
    this.currentAlbum = null;
    this.isPlaying = false;
    this.duration = 0;
    this.queue = [];
    this.recentlyPlayed = [];
    this.isDragging = false;
    this.shuffleMode = false;
    this.repeatMode = REPEAT_MODES.OFF;
    this.seekTooltip = null;
    this.currentIndex = 0;
    this.playlists = [];
    this.isPopupVisible = false;
    this.currentTab = "now-playing";
    this.inactivityTimer = null;
    this.notificationContainer = null;
    this.notifications = [];
    this.currentNotificationTimeout = null;
    this.siteMapInstance = null;
    this.homePageManagerInstance = null;
  }

  favorites = {
    songs: new Set(),
    artists: new Set(),
    albums: new Set(),

    add: (type, id) => {
      this.favorites[type].add(id);
      this.favorites.save(type);
      this.favorites.updateIcon(type, id, true);
      const itemName = type === "songs" ? "song" : type.slice(0, -1);
      notifications.show(`Added ${itemName} to favorites`, NOTIFICATION_TYPES.SUCCESS);
    },

    remove: (type, id) => {
      this.favorites[type].delete(id);
      this.favorites.save(type);
      this.favorites.updateIcon(type, id, false);
      const itemName = type === "songs" ? "song" : type.slice(0, -1);
      notifications.show(`Removed ${itemName} from favorites`, NOTIFICATION_TYPES.INFO);
    },

    toggle: (type, id) => {
      if (this.favorites[type].has(id)) {
        this.favorites.remove(type, id);
        return false;
      } else {
        this.favorites.add(type, id);
        return true;
      }
    },

    has: (type, id) => this.favorites[type].has(id),

    save: (type) => {
      const key = type === "songs" ? STORAGE_KEYS.FAVORITE_SONGS : type === "artists" ? STORAGE_KEYS.FAVORITE_ARTISTS : STORAGE_KEYS.FAVORITE_ALBUMS;
      storage.save(key, Array.from(this.favorites[type]));
    },

    updateIcon: (type, id, isFavorite) => {
      const icons = document.querySelectorAll(`[data-favorite-${type}="${id}"]`);
      icons.forEach((icon) => {
        icon.classList.toggle(CLASSES.active, isFavorite);
        icon.setAttribute("aria-pressed", isFavorite);

        if (type === "songs") {
          const heartIcon = icon.querySelector("svg");
          if (heartIcon) {
            heartIcon.style.color = isFavorite ? "#ef4444" : "";
            heartIcon.style.fill = isFavorite ? "currentColor" : "none";
          }
        }
      });

      if (type === "songs" && appState.currentSong && appState.currentSong.id === id) {
        ui.updateFavoriteButton();
      }
    },
  };

  queue = {
    items: [],

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

    remove: (index) => {
      if (index >= 0 && index < this.queue.items.length) {
        const removed = this.queue.items.splice(index, 1)[0];
        storage.save(STORAGE_KEYS.QUEUE, this.queue.items);
        ui.updateCounts();
        return removed;
      }
      return null;
    },

    clear: () => {
      this.queue.items = [];
      storage.save(STORAGE_KEYS.QUEUE, this.queue.items);
      ui.updateCounts();
    },

    getNext: () => {
      return this.queue.items.length > 0 ? this.queue.remove(0) : null;
    },

    get: () => this.queue.items,

    playAt: (index) => {
      const song = this.queue.remove(index);
      if (song) {
        player.playSong(song);
      }
    },
  };
}

const appState = new AppState();

const storage = {
  save: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  },

  load: (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  },

  initialize: () => {
    const favoriteTypes = [{
        type: "songs",
        key: STORAGE_KEYS.FAVORITE_SONGS
      },
      {
        type: "artists",
        key: STORAGE_KEYS.FAVORITE_ARTISTS
      },
      {
        type: "albums",
        key: STORAGE_KEYS.FAVORITE_ALBUMS
      },
    ];

    favoriteTypes.forEach(({
      type,
      key
    }) => {
      const data = storage.load(key);
      if (data) {
        appState.favorites[type] = new Set(data);
      }
    });

    const dataLoaders = {
      [STORAGE_KEYS.RECENTLY_PLAYED]: (data) => (appState.recentlyPlayed = data || []),
      [STORAGE_KEYS.PLAYLISTS]: (data) => (appState.playlists = data || []),
      [STORAGE_KEYS.QUEUE]: (data) => (appState.queue.items = data || []),
    };

    Object.entries(dataLoaders).forEach(([key, loader]) => {
      const data = storage.load(key);
      if (data) loader(data);
    });
  },
};

const mediaSession = {
  setup: () => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = null;

    const actions = {
      play: () => controls.play(),
      pause: () => controls.pause(),
      previoustrack: () => controls.previous(),
      nexttrack: () => controls.next(),
      seekto: (details) => controls.seekTo(details.seekTime),
      seekbackward: (details) => controls.skip(-(details.seekOffset || 10)),
      seekforward: (details) => controls.skip(details.seekOffset || 10),
    };

    Object.entries(actions).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {}
    });
  },

  updateMetadata: (songData) => {
    if (!("mediaSession" in navigator) || !songData) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songData.title || "Unknown Song",
        artist: songData.artist || "Unknown Artist",
        album: songData.album || "Unknown Album",
        artwork: [{
          src: songData.artwork || utils.getAlbumImageUrl(songData.album),
          sizes: "512x512",
          type: "image/jpeg",
        }, ],
      });
    } catch (error) {}
  },

  updatePlaybackState: (playing) => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.playbackState = playing ? "playing" : "paused";

    try {
      if (appState.audio && appState.duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: appState.duration,
          playbackRate: 1.0,
          position: appState.audio.currentTime || 0,
        });
      }
    } catch (error) {}
  },
};

const player = {
  initialize: () => {
    if (appState.audio) return;

    appState.audio = new Audio();

    const events = {
      timeupdate: player.updateProgress,
      ended: player.onEnded,
      loadedmetadata: player.onMetadataLoaded,
      play: player.onPlay,
      pause: player.onPause,
      error: player.onError,
    };

    Object.entries(events).forEach(([event, handler]) => {
      appState.audio.addEventListener(event, handler);
    });

    mediaSession.setup();
  },

  loadAudioFile: async (songData) => {
    for (const format of AUDIO_FORMATS) {
      try {
        const songFileName = songData.title.toLowerCase().replace(/\s+/g, "").replace(/[^\w]/g, "");
        const audioUrl = `https://koders.cloud/global/content/audio/${songFileName}.${format}`;

        appState.audio.src = audioUrl;

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

          appState.audio.addEventListener("canplaythrough", loadHandler, {
            once: true
          });
          appState.audio.addEventListener("error", errorHandler, {
            once: true
          });

          if (appState.audio.readyState >= 3) {
            loadHandler();
          }
        });

        await appState.audio.play();
        return true;
      } catch (error) {}
    }
    return false;
  },

  playSong: async (songData) => {
    if (!songData) return;

    player.initialize();
    ui.setLoadingState(true);

    if (appState.currentSong) {
      player.addToRecentlyPlayed(appState.currentSong);
    }

    appState.currentSong = songData;
    appState.currentArtist = songData.artist;
    appState.currentAlbum = songData.album;

    ui.updateNowPlaying();
    ui.updateNavbar();
    ui.updateMusicPlayer();
    ui.updateCounts();
    mediaSession.updateMetadata(songData);

    const success = await player.loadAudioFile(songData);

    if (success) {
      setTimeout(() => {
        eventHandlers.bindControlEvents();
      }, 100);
    } else {
      notifications.show("Could not load audio file", NOTIFICATION_TYPES.ERROR);
      appState.isPlaying = false;
      ui.updatePlayPauseButtons();
      mediaSession.updatePlaybackState(false);
    }

    ui.setLoadingState(false);
  },

  toggle: () => {
    if (appState.isPlaying) {
      controls.pause();
    } else {
      controls.play();
    }
  },

  onPlay: () => {
    appState.isPlaying = true;
    ui.updatePlayPauseButtons();
    mediaSession.updatePlaybackState(true);
  },

  onPause: () => {
    appState.isPlaying = false;
    ui.updatePlayPauseButtons();
    mediaSession.updatePlaybackState(false);
  },

  onMetadataLoaded: () => {
    appState.duration = appState.audio.duration;
    const totalTimeElement = $byId(IDS.popupTotalTime);
    if (totalTimeElement) {
      totalTimeElement.textContent = utils.formatTime(appState.duration);
    }
  },

  onError: (error) => {
    notifications.show("Audio playback error", NOTIFICATION_TYPES.ERROR);
  },

  onEnded: () => {
    if (appState.repeatMode === REPEAT_MODES.ONE) {
      appState.audio.currentTime = 0;
      appState.audio.play();
      return;
    }
    controls.next();
  },

  updateProgress: () => {
    if (!appState.audio) return;

    const currentTime = appState.audio.currentTime;
    const percent = appState.duration > 0 ? (currentTime / appState.duration) * 100 : 0;

    const progressFill = $byId(IDS.popupProgressFill);
    const progressThumb = $byId(IDS.popupProgressThumb);
    const currentTimeElement = $byId(IDS.popupCurrentTime);

    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressThumb) progressThumb.style.left = `${percent}%`;
    if (currentTimeElement) currentTimeElement.textContent = utils.formatTime(currentTime);

    mediaSession.updatePlaybackState(appState.isPlaying);
  },

  addToRecentlyPlayed: (song) => {
    appState.recentlyPlayed.unshift(song);
    if (appState.recentlyPlayed.length > 50) {
      appState.recentlyPlayed = appState.recentlyPlayed.slice(0, 50);
    }
    storage.save(STORAGE_KEYS.RECENTLY_PLAYED, appState.recentlyPlayed.slice(0, 20));
  },

  getNextInAlbum: () => {
    if (!appState.currentSong || !window.music) return null;

    const artist = window.music.find((a) => a.artist === appState.currentArtist);
    const album = artist?.albums.find((al) => al.album === appState.currentAlbum);

    if (!album) return null;

    const currentIndex = album.songs.findIndex((s) => s.title === appState.currentSong.title);
    const nextIndex = appState.shuffleMode ? Math.floor(Math.random() * album.songs.length) : (currentIndex + 1) % album.songs.length;

    if (nextIndex !== currentIndex || appState.repeatMode === REPEAT_MODES.ALL) {
      return {
        ...album.songs[nextIndex],
        artist: artist.artist,
        album: album.album,
        cover: utils.getAlbumImageUrl(album.album),
      };
    }

    return null;
  },

  getPreviousInAlbum: () => {
    if (!appState.currentSong || !window.music) return null;

    const artist = window.music.find((a) => a.artist === appState.currentArtist);
    const album = artist?.albums.find((al) => al.album === appState.currentAlbum);

    if (!album) return null;

    const currentIndex = album.songs.findIndex((s) => s.title === appState.currentSong.title);
    const prevIndex = (currentIndex - 1 + album.songs.length) % album.songs.length;

    return {
      ...album.songs[prevIndex],
      artist: artist.artist,
      album: album.album,
      cover: utils.getAlbumImageUrl(album.album),
    };
  },
};

const controls = {
  play: () => {
    if (!appState.currentSong || !appState.audio) return;
    appState.audio.play().catch(() => {});
  },
  
  pause: () => {
    if (!appState.audio) return;
    appState.audio.pause();
  },
  
  next: () => {
    const nextSong = appState.queue.getNext();
    if (nextSong) {
      player.playSong(nextSong);
      return;
    }

    const nextInAlbum = player.getNextInAlbum();
    if (nextInAlbum) {
      player.playSong(nextInAlbum);
    }
  },
  
  previous: () => {
    if (appState.audio && appState.audio.currentTime > 3) {
      appState.audio.currentTime = 0;
      return;
    }

    if (appState.recentlyPlayed.length > 0) {
      const prevSong = appState.recentlyPlayed.shift();
      player.playSong(prevSong);
      return;
    }

    const prevInAlbum = player.getPreviousInAlbum();
    if (prevInAlbum) {
      player.playSong(prevInAlbum);
    }
  },
  
  seekTo: (time) => {
    if (!appState.audio) return;
    appState.audio.currentTime = Math.max(0, Math.min(appState.duration, time));
    player.updateProgress();
  },
  
  skip: (seconds) => {
    if (!appState.audio) return;
    const newTime = appState.audio.currentTime + seconds;
    controls.seekTo(newTime);
  },

  shuffle: {
    toggle: () => {
      appState.shuffleMode = !appState.shuffleMode;
      ui.updateShuffleButton();
      notifications.show(`Shuffle ${appState.shuffleMode ? "enabled" : "disabled"}`);
    },

    all: () => {
      if (!window.music || window.music.length === 0) {
        notifications.show("No music library found", NOTIFICATION_TYPES.WARNING);
        return;
      }

      const allSongs = [];
      window.music.forEach((artist) => {
        artist.albums.forEach((album) => {
          album.songs.forEach((song) => {
            allSongs.push({
              ...song,
              artist: artist.artist,
              album: album.album,
              cover: utils.getAlbumImageUrl(album.album),
            });
          });
        });
      });

      if (allSongs.length === 0) {
        notifications.show("No songs found", NOTIFICATION_TYPES.WARNING);
        return;
      }

      for (let i = allSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSongs[i], allSongs[j]] = [allSongs[j], allSongs[i]];
      }

      appState.queue.clear();
      allSongs.slice(1).forEach((song) => appState.queue.add(song));
      player.playSong(allSongs[0]);
      appState.shuffleMode = true;
      ui.updateShuffleButton();
      notifications.show("Playing all songs shuffled");
    },
  },

  repeat: {
    toggle: () => {
      if (appState.repeatMode === REPEAT_MODES.OFF) {
        appState.repeatMode = REPEAT_MODES.ALL;
      } else if (appState.repeatMode === REPEAT_MODES.ALL) {
        appState.repeatMode = REPEAT_MODES.ONE;
      } else {
        appState.repeatMode = REPEAT_MODES.OFF;
      }

      ui.updateRepeatButton();

      const modeText = appState.repeatMode === REPEAT_MODES.OFF ? "disabled" : appState.repeatMode === REPEAT_MODES.ALL ? "all songs" : "current song";
      notifications.show(`Repeat ${modeText}`);
    },
  },
};

const ui = {
  setLoadingState: (loading) => {
    const nowPlayingArea = $byId(IDS.nowPlayingArea);
    const songTitle = $byId(IDS.navbarSongTitle);

    if (nowPlayingArea) nowPlayingArea.style.opacity = loading ? "0.5" : "1";
    if (songTitle) songTitle.textContent = loading ? "Loading..." : appState.currentSong?.title || "";
  },

  updateNowPlaying: () => {
    if (!appState.currentSong) return;

    const elements = {
      albumCover: $byId(IDS.popupAlbumCover),
      songTitle: $byId(IDS.popupSongTitle),
      artistName: $byId(IDS.popupArtistName),
      albumName: $byId(IDS.popupAlbumName),
    };

    if (elements.albumCover) {
      utils.loadImageWithFallback(elements.albumCover, utils.getAlbumImageUrl(appState.currentSong.album), utils.getDefaultAlbumImage(), "album");
    }

    if (elements.songTitle) elements.songTitle.textContent = appState.currentSong.title;
    if (elements.artistName) elements.artistName.textContent = appState.currentSong.artist;
    if (elements.albumName) elements.albumName.textContent = appState.currentSong.album;

    ui.updatePlayPauseButtons();
    ui.updateFavoriteButton();
  },

  updateNavbar: () => {
    if (!appState.currentSong) return;

    const container = $byId(IDS.navbarAlbumCover);
    const artist = $byId(IDS.navbarArtist);
    const songTitle = $byId(IDS.navbarSongTitle);
    const playIndicator = $byId(IDS.playIndicator);
    const nowPlayingArea = $byId(IDS.nowPlayingArea);

    if (container) {
      const svg = container.querySelector("svg");
      const img = container.querySelector("img");

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

    if (artist) artist.textContent = appState.currentSong.artist;

    if (songTitle) {
      const title = appState.currentSong.title;
      songTitle.classList.toggle(CLASSES.marquee, title.length > 25);
      songTitle.textContent = title;
    }

    if (playIndicator) {
      playIndicator.classList.toggle(CLASSES.active, appState.isPlaying);
    }

    if (nowPlayingArea) {
      nowPlayingArea.classList.add(CLASSES.hasSong);
    }
  },

  updatePlayPauseButtons: () => {
    const navbarElements = {
      playIcon: $byId(IDS.playIconNavbar),
      pauseIcon: $byId(IDS.pauseIconNavbar),
    };

    const popupElements = {
      playIcon: $byId(IDS.popupPlayIcon),
      pauseIcon: $byId(IDS.popupPauseIcon),
    };

    if (navbarElements.playIcon && navbarElements.pauseIcon) {
      navbarElements.playIcon.style.display = appState.isPlaying ? "none" : "block";
      navbarElements.pauseIcon.style.display = appState.isPlaying ? "block" : "none";
    }

    if (popupElements.playIcon && popupElements.pauseIcon) {
      popupElements.playIcon.classList.toggle(CLASSES.hidden, appState.isPlaying);
      popupElements.pauseIcon.classList.toggle(CLASSES.hidden, !appState.isPlaying);
    }
  },

  updateShuffleButton: () => {
    const shuffleBtn = $byId(IDS.popupShuffleBtn);
    if (shuffleBtn) {
      shuffleBtn.classList.toggle(CLASSES.active, appState.shuffleMode);
    }
  },

  updateRepeatButton: () => {
    const repeatBtn = $byId(IDS.popupRepeatBtn);
    if (repeatBtn) {
      repeatBtn.classList.toggle(CLASSES.active, appState.repeatMode !== REPEAT_MODES.OFF);
      repeatBtn.classList.toggle(CLASSES.repeatOne, appState.repeatMode === REPEAT_MODES.ONE);
    }
  },

  updateFavoriteButton: () => {
    if (!appState.currentSong) return;

    const favoriteBtn = $byId(IDS.popupFavoriteBtn);
    if (favoriteBtn) {
      const isFavorite = appState.favorites.has("songs", appState.currentSong.id);
      favoriteBtn.classList.toggle(CLASSES.active, isFavorite);
      favoriteBtn.setAttribute("data-favorite-songs", appState.currentSong.id);

      const heartIcon = favoriteBtn.querySelector("svg");
      if (heartIcon) {
        heartIcon.style.color = isFavorite ? "#ef4444" : "";
        heartIcon.style.fill = isFavorite ? "currentColor" : "none";
      }
    }
  },

  updateCounts: () => {
    const counts = {
      [IDS.favoriteSongsCount]: appState.favorites.songs.size,
      [IDS.favoriteArtistsCount]: appState.favorites.artists.size,
      [IDS.recentCount]: appState.recentlyPlayed.length,
      [IDS.queueCount]: appState.queue.items.length,
    };

    Object.entries(counts).forEach(([id, value]) => {
      const element = $byId(id);
      if (element) element.textContent = value;
    });
  },

  updateMusicPlayer: () => {
    ui.updateNowPlaying();
    ui.updateShuffleButton();
    ui.updateRepeatButton();
  },
};

const popup = {
  open: () => {
    const musicPlayer = $byId(IDS.musicPlayer);
    if (!musicPlayer) return;
    musicPlayer.classList.add(CLASSES.show);
    appState.isPopupVisible = true;
    popup.startInactivityTimer();
  },

  close: () => {
    const musicPlayer = $byId(IDS.musicPlayer);
    if (!musicPlayer) return;
    musicPlayer.classList.remove(CLASSES.show);
    appState.isPopupVisible = false;
    popup.clearInactivityTimer();
  },

  toggle: () => {
    const musicPlayer = $byId(IDS.musicPlayer);
    if (!musicPlayer) return;
    if (musicPlayer.classList.contains(CLASSES.show)) {
      popup.close();
    } else {
      popup.open();
    }
  },

  switchTab: (tabName) => {
    appState.currentTab = tabName;
  },

  updateQueueTab: () => {
    const queueList = $byId(IDS.queueList);
    if (!queueList) return;
  },

  updateRecentTab: () => {
    const recentList = $byId(IDS.recentList);
    if (!recentList) return;
  },

  startInactivityTimer: () => {
    popup.clearInactivityTimer();
    if (appState.currentTab !== "now-playing") {
      appState.inactivityTimer = setTimeout(() => {
        popup.switchTab("now-playing");
      }, 10000);
    }
  },

  clearInactivityTimer: () => {
    if (appState.inactivityTimer) {
      clearTimeout(appState.inactivityTimer);
      appState.inactivityTimer = null;
    }
  },
};

const dropdown = {
  toggle: (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const menu = $byId(IDS.dropdownMenu);
    const trigger = $byId(IDS.menuTrigger);

    if (!menu || !trigger) return;

    const isVisible = menu.classList.contains(CLASSES.show);

    if (isVisible) {
      dropdown.close();
    } else {
      dropdown.open();
    }
  },

  open: (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const menu = $byId(IDS.dropdownMenu);
    const trigger = $byId(IDS.menuTrigger);

    if (!menu || !trigger) return;

    ui.updateCounts();
    menu.classList.add(CLASSES.show);
    trigger.classList.add(CLASSES.active);
    popup.close();
  },

  close: (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const menu = $byId(IDS.dropdownMenu);
    const trigger = $byId(IDS.menuTrigger);

    if (!menu || !trigger) return;

    menu.classList.remove(CLASSES.show);
    trigger.classList.remove(CLASSES.active);
  },
};

const modals = {
  open: (id, content) => {
    let dialog = document.getElementById(id);
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = id;
      dialog.className = "modal";
      document.body.appendChild(dialog);
    }

    dialog.innerHTML = `<button class="modal-close" data-close>&times;</button><div class="modal-content">${content}</div>`;
    dialog.querySelector("[data-close]").addEventListener(
      "click",
      () => modals.close(id), {
        once: true
      }
    );
    dialog.showModal();
  },

  close: (id) => {
    const dialog = document.getElementById(id);
    if (dialog) {
      dialog.close();
    }
  },
};

const uiDialog = {
  confirm(message, {
    okText = 'OK',
    cancelText = 'Cancel',
    danger = false
  } = {}) {
    return new Promise((resolve) => {
      const id = 'confirm-dialog';
      modals.open(id, `
        <div class="modal-popover">
          <div class="modal-popover-body">${message}</div>
          <div class="modal-popover-actions">
            <button class="btn btn-muted" data-cancel>${cancelText}</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${okText}</button>
          </div>
        </div>
      `);
      const dlg = document.getElementById(id);
      dlg.classList.add('modal--popover', 'modal--sm');
      dlg.querySelector('[data-cancel]').addEventListener('click', () => {
        dlg.close();
        resolve(false);
      }, {
        once: true
      });
      dlg.querySelector('[data-ok]').addEventListener('click', () => {
        dlg.close();
        resolve(true);
      }, {
        once: true
      });
    });
  },
  
  prompt(message, {
    okText = 'Create',
    cancelText = 'Cancel',
    placeholder = '',
    value = ''
  } = {}) {
    return new Promise((resolve) => {
      const id = 'prompt-dialog';
      modals.open(id, `
        <div class="modal-popover">
          <div class="modal-popover-header">${message}</div>
          <input class="modal-input" type="text" placeholder="${placeholder}" value="${value}">
          <div class="modal-popover-actions">
            <button class="btn btn-muted" data-cancel>${cancelText}</button>
            <button class="btn btn-primary" data-ok>${okText}</button>
          </div>
        </div>
      `);
      const dlg = document.getElementById(id);
      dlg.classList.add('modal--popover', 'modal--sm');
      const input = dlg.querySelector('.modal-input');
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          dlg.close();
          resolve(input.value.trim() || null);
        }
        if (e.key === 'Escape') {
          dlg.close();
          resolve(null);
        }
      }, {
        once: true
      });
      dlg.querySelector('[data-cancel]').addEventListener('click', () => {
        dlg.close();
        resolve(null);
      }, {
        once: true
      });
      dlg.querySelector('[data-ok]').addEventListener('click', () => {
        dlg.close();
        resolve(input.value.trim() || null);
      }, {
        once: true
      });
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  app.initialize();
});

window.addEventListener("load", () => {
  if (!window.appState) {
    app.initialize();
  }
});

window.MyTunesApp = {
  initialize: app.initialize,
  state: () => appState,
  api: () => window.musicAppAPI,
  goHome: app.goHome,
};

if (window.music) {
  app.initialize();
}

window.debugMusicPlayer = () => {
  const musicPlayer = $byId(IDS.musicPlayer);
  const nowPlayingArea = $byId(IDS.nowPlayingArea);
  const navbarAlbumCover = $byId(IDS.navbarAlbumCover);
};