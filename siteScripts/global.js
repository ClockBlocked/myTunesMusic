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
      } catch (error) {
      }
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
    } catch (error) {
    }
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
    } catch (error) {
    }
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
      } catch (error) {
      }
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
    const totalTimeElement = $byId(IDS.totalTime);
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

    const progressFill = $byId(IDS.progressFill);
    const progressThumb = $byId(IDS.progressThumb);
    const currentTimeElement = $byId(IDS.currentTime);

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
    appState.audio.play().catch((err) => 
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
      albumCover: $byId(IDS.albumCover),
      songTitle: $byId(IDS.songTitle),
      artistName: $byId(IDS.artistName),
      albumName: $byId(IDS.albumName),
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
      playBtn: $byId(IDS.playBtn),
    };

    if (navbarElements.playIcon && navbarElements.pauseIcon) {
      navbarElements.playIcon.style.display = appState.isPlaying ? "none" : "block";
      navbarElements.pauseIcon.style.display = appState.isPlaying ? "block" : "none";
    }

    if (popupElements.playBtn) {
      const playIcon = popupElements.playBtn.querySelector('.icon.play');
      const pauseIcon = popupElements.playBtn.querySelector('.icon.pause');
      if (playIcon && pauseIcon) {
        playIcon.classList.toggle(CLASSES.hidden, appState.isPlaying);
        pauseIcon.classList.toggle(CLASSES.hidden, !appState.isPlaying);
      }
      popupElements.playBtn.classList.toggle(CLASSES.playing, appState.isPlaying);
    }
    }
  },

  updateShuffleButton: () => {
    const shuffleBtn = $byId(IDS.shuffleBtn);
    if (shuffleBtn) {
      shuffleBtn.classList.toggle(CLASSES.active, appState.shuffleMode);
    }
  },

  updateRepeatButton: () => {
    const repeatBtn = $byId(IDS.repeatBtn);
    if (repeatBtn) {
      repeatBtn.classList.toggle(CLASSES.active, appState.repeatMode !== REPEAT_MODES.OFF);
      repeatBtn.classList.toggle(CLASSES.repeatOne, appState.repeatMode === REPEAT_MODES.ONE);
    }
  },

  updateFavoriteButton: () => {
    if (!appState.currentSong) return;

    const favoriteBtn = $byId(IDS.favoriteBtn);
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

const playlists = {
  add: (name) => {
    if (!name || !name.trim()) {
      notifications.show("Please enter a playlist name", NOTIFICATION_TYPES.WARNING);
      return null;
    }

    const playlist = {
      id: Date.now().toString(),
      name: name.trim(),
      songs: [],
      created: new Date().toISOString(),
      description: "",
      cover: null,
    };

    appState.playlists.push(playlist);
    storage.save(STORAGE_KEYS.PLAYLISTS, appState.playlists);

    notifications.show(`Created playlist "${playlist.name}"`, NOTIFICATION_TYPES.SUCCESS);
    return playlist;
  },

  addSong: (playlistId, song) => {
    const playlist = appState.playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      notifications.show("Playlist not found", NOTIFICATION_TYPES.ERROR);
      return false;
    }

    const exists = playlist.songs.some((s) => s.id === song.id);
    if (exists) {
      notifications.show("Song already in playlist", NOTIFICATION_TYPES.WARNING);
      return false;
    }

    playlist.songs.push(song);
    storage.save(STORAGE_KEYS.PLAYLISTS, appState.playlists);

    notifications.show(`Added "${song.title}" to "${playlist.name}"`, NOTIFICATION_TYPES.SUCCESS);
    return true;
  },

  removeSong: (playlistId, songId) => {
    const playlist = appState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;

    const initialLength = playlist.songs.length;
    playlist.songs = playlist.songs.filter((s) => s.id !== songId);

    if (playlist.songs.length < initialLength) {
      storage.save(STORAGE_KEYS.PLAYLISTS, appState.playlists);
      notifications.show("Song removed from playlist", NOTIFICATION_TYPES.INFO);
      return true;
    }

    return false;
  },


  play: (playlistId) => {
    const playlist = appState.playlists.find((p) => p.id === playlistId);
    if (!playlist || playlist.songs.length === 0) {
      notifications.show("Playlist is empty", NOTIFICATION_TYPES.WARNING);
      return;
    }

    appState.queue.clear();
    playlist.songs.slice(1).forEach((song) => appState.queue.add(song));
    player.playSong(playlist.songs[0]);

    notifications.show(`Playing playlist "${playlist.name}"`, NOTIFICATION_TYPES.SUCCESS);
  },

  remove: async (playlistId) => {
    const playlist = appState.playlists.find((p) => p.id === playlistId);
    if (!playlist) return false;
    const confirmed = await uiDialog.confirm(`Delete the playlist "${playlist.name}"? This cannot be undone.`, {
      okText: 'Delete',
      danger: true
    });
    if (!confirmed) return false;
    const playlistName = playlist.name;
    appState.playlists = appState.playlists.filter((p) => p.id !== playlistId);
    storage.save(STORAGE_KEYS.PLAYLISTS, appState.playlists);
    notifications.show(`Deleted playlist "${playlistName}"`, NOTIFICATION_TYPES.INFO);
    return true;
  },

  create: async () => {
    const name = await uiDialog.prompt('Enter playlist name:', {
      okText: 'Create',
      placeholder: 'My playlist'
    });
    if (name) return playlists.add(name);
    return null;
  },


  showAll: () => {
    if (appState.playlists.length === 0) {
      modals.open(
        "playlists-modal",
        views.renderEmptyState("No Playlists", "You haven't created any playlists yet.", "Create your first playlist to organize your music.")
      );
      return;
    }

    const content = `
        <div class="playlists-page animate__animated animate__fadeIn">
          <div class="page-header mb-8 flex justify-between items-center">
            <div>
              <h1 class="text-3xl font-bold mb-2">Your Playlists</h1>
              <p class="text-gray-400">${appState.playlists.length} playlist${appState.playlists.length !== 1 ? "s" : ""}</p>
            </div>
            <button class="create-playlist-btn bg-accent-primary text-white px-6 py-3 rounded-full hover:bg-accent-secondary transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Create Playlist
            </button>
          </div>

          <div class="playlists-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            ${appState.playlists
              .map(
                (playlist, index) => `
              <div class="playlist-card bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer" style="animation-delay: ${index * 100}ms;" data-playlist-id="${playlist.id}">
                <div class="playlist-cover aspect-square bg-gradient-to-br from-purple-500 to-blue-600 relative">
                  <div class="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-16 h-16">
                      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v2H3v-2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                    </svg>
                  </div>
                  <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="play-playlist-btn w-10 h-10 bg-accent-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform" data-playlist-id="${playlist.id}">
                      ${ICONS.play}
                    </button>
                  </div>
                </div>
                <div class="p-4">
                  <h3 class="font-bold text-lg mb-1 truncate">${playlist.name}</h3>
                  <p class="text-gray-400 text-sm mb-3">${playlist.songs.length} song${playlist.songs.length !== 1 ? "s" : ""}</p>
                  <div class="flex gap-2">
                    <button class="view-playlist-btn flex-1 bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-500 transition-colors text-sm" data-playlist-id="${playlist.id}">
                      View
                    </button>
                    <button class="delete-playlist-btn px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors" data-playlist-id="${playlist.id}">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                        <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;

    modals.open("playlists-modal", content);
    const modalEl = document.getElementById("playlists-modal");
    playlists.bindEvents(modalEl);
  },

  show: (playlistId) => {
    const playlist = appState.playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      notifications.show("Playlist not found", NOTIFICATION_TYPES.ERROR);
      return;
    }

    views.showLoading();

    setTimeout(() => {
      const dynamicContent = $byId(IDS.dynamicContent);
      if (!dynamicContent) return;

      dynamicContent.innerHTML = `
        <div class="playlist-page animate__animated animate__fadeIn">
          <div class="playlist-header mb-8 flex items-start gap-6">
            <div class="playlist-cover w-48 h-48 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" class="w-24 h-24">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v2H3v-2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
            </div>
            <div class="playlist-info flex-1">
              <p class="text-sm text-gray-400 mb-2">PLAYLIST</p>
              <h1 class="text-4xl font-bold mb-4">${playlist.name}</h1>
              <p class="text-gray-400 mb-6">${playlist.songs.length} song${playlist.songs.length !== 1 ? "s" : ""} • Created ${new Date(playlist.created).toLocaleDateString()}</p>
              <div class="flex gap-4">
                <button class="play-playlist-btn bg-accent-primary text-white px-8 py-3 rounded-full hover:bg-accent-secondary transition-colors flex items-center gap-2" data-playlist-id="${playlist.id}" ${
        playlist.songs.length === 0 ? "disabled" : ""
      }>
                  ${ICONS.play}
                  Play
                </button>
                <button class="edit-playlist-btn bg-gray-600 text-white px-6 py-3 rounded-full hover:bg-gray-500 transition-colors" data-playlist-id="${playlist.id}">
                  Edit
                </button>
                <button class="delete-playlist-btn bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition-colors" data-playlist-id="${playlist.id}">
                  Delete
                </button>
              </div>
            </div>
          </div>
          
          ${
            playlist.songs.length === 0
              ? `
            <div class="empty-playlist text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-16 h-16 mx-auto mb-4 text-gray-600">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v2H3v-2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
              <h3 class="text-xl font-bold mb-2">This playlist is empty</h3>
              <p class="text-gray-400 mb-4">Add songs to start building your playlist</p>
              <button class="browse-music-btn bg-accent-primary text-white px-6 py-2 rounded-full hover:bg-accent-secondary transition-colors">
                Browse Music
              </button>
            </div>
          `
              : `
            <div class="songs-list">
              <div class="songs-header grid grid-cols-12 gap-4 px-4 py-2 text-sm text-gray-400 border-b border-gray-700 mb-2">
                <div class="col-span-1">#</div>
                <div class="col-span-5">Title</div>
                <div class="col-span-3 hidden md:block">Album</div>
                <div class="col-span-2 hidden md:block">Date Added</div>
                <div class="col-span-1">Duration</div>
              </div>
              ${playlist.songs
                .map(
                  (song, index) => `
                <div class="song-row grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group" data-song='${JSON.stringify(song).replace(/"/g, "&quot;")}' data-playlist-id="${
                    playlist.id
                  }" data-song-index="${index}">
                  <div class="col-span-1 text-gray-400 group-hover:hidden">${index + 1}</div>
                  <div class="col-span-1 hidden group-hover:block">
                    <button class="play-song-btn w-8 h-8 bg-accent-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                      ${ICONS.play}
                    </button>
                  </div>
                  <div class="col-span-5 flex items-center gap-3">
                    <img src="${utils.getAlbumImageUrl(song.album)}" alt="${song.title}" class="w-10 h-10 rounded object-cover">
                    <div>
                      <div class="font-medium">${song.title}</div>
                      <div class="text-sm text-gray-400 cursor-pointer hover:text-white transition-colors" data-artist="${song.artist}">${song.artist}</div>
                    </div>
                  </div>
                  <div class="col-span-3 hidden md:block text-gray-400 text-sm">${song.album}</div>
                  <div class="col-span-2 hidden md:block text-gray-400 text-sm">${new Date().toLocaleDateString()}</div>
                  <div class="col-span-1 flex items-center justify-between">
                    <span class="text-gray-400 text-sm">${song.duration || "0:00"}</span>
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button class="action-btn p-1 hover:bg-white/10 rounded transition-colors" data-action="favorite" data-song-id="${song.id}" title="Add to favorites">
                        <svg class="w-4 h-4 ${appState.favorites.has("songs", song.id) ? "text-red-500" : ""}" fill="${appState.favorites.has("songs", song.id) ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                        </svg>
                      </button>
                      <button class="action-btn p-1 hover:bg-white/10 rounded transition-colors" data-action="add-queue" title="Add to queue">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                        </svg>
                      </button>
                      <button class="action-btn p-1 hover:bg-white/10 rounded transition-colors" data-action="remove-from-playlist" title="Remove from playlist">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          `
          }
        </div>
      `;

      playlists.bindViewEvents(playlist);
    }, 300);
  },

  bindEvents: (root = $byId(IDS.dynamicContent)) => {
    const dynamicContent = root;
    if (!dynamicContent) return;

    const createBtn = dynamicContent.querySelector(".create-playlist-btn");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        const newPlaylist = playlists.create();
        if (newPlaylist) {
          setTimeout(() => playlists.showAll(), 100);
        }
      });
    }

    dynamicContent.querySelectorAll(".view-playlist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const playlistId = btn.dataset.playlistId;
        playlists.show(playlistId);
      });
    });

    dynamicContent.querySelectorAll(".play-playlist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const playlistId = btn.dataset.playlistId;
        playlists.play(playlistId);
      });
    });

    dynamicContent.querySelectorAll(".delete-playlist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const playlistId = btn.dataset.playlistId;
        if (playlists.remove(playlistId)) {
          setTimeout(() => playlists.showAll(), 100);
        }
      });
    });

    dynamicContent.querySelectorAll(".playlist-card").forEach((card) => {
      card.addEventListener("click", () => {
        const playlistId = card.dataset.playlistId;
        playlists.show(playlistId);
      });
    });
  },

  bindViewEvents: (playlist) => {
    const dynamicContent = $byId(IDS.dynamicContent);
    if (!dynamicContent) return;

    const playBtn = dynamicContent.querySelector(".play-playlist-btn");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        playlists.play(playlist.id);
      });
    }

    const editBtn = dynamicContent.querySelector(".edit-playlist-btn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const newName = prompt("Enter new playlist name:", playlist.name);
        if (newName && newName.trim() && newName.trim() !== playlist.name) {
          playlist.name = newName.trim();
          storage.save(STORAGE_KEYS.PLAYLISTS, appState.playlists);
          playlists.show(playlist.id);
          notifications.show("Playlist renamed successfully", NOTIFICATION_TYPES.SUCCESS);
        }
      });
    }

    const deleteBtn = dynamicContent.querySelector(".delete-playlist-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (playlists.remove(playlist.id)) {
          if (appState.siteMapInstance) {
            appState.siteMapInstance.navigateTo(ROUTES.HOME);
          }
        }
      });
    }

    const browseBtn = dynamicContent.querySelector(".browse-music-btn");
    if (browseBtn) {
      browseBtn.addEventListener("click", () => {
        if (appState.siteMapInstance) {
          appState.siteMapInstance.navigateTo(ROUTES.HOME);
        }
      });
    }

    dynamicContent.querySelectorAll(".song-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".action-btn") || e.target.closest(".play-song-btn")) return;

        try {
          const songData = JSON.parse(row.dataset.song);
          player.playSong(songData);
        } catch (error) {
          
        }
      });
    });

    dynamicContent.querySelectorAll(".play-song-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songRow = btn.closest(".song-row");
        try {
          const songData = JSON.parse(songRow.dataset.song);
          player.playSong(songData);
        } catch (error) {
          
        }
      });
    });

    dynamicContent.querySelectorAll("[data-artist]").forEach((artistEl) => {
      artistEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistName = artistEl.dataset.artist;
        if (appState.siteMapInstance) {
          appState.siteMapInstance.navigateTo(ROUTES.ARTIST, {
            artist: artistName
          });
        }
      });
    });

    dynamicContent.querySelectorAll(".action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const songRow = btn.closest(".song-row");
        const songData = JSON.parse(songRow.dataset.song);

        switch (action) {
          case "favorite":
            appState.favorites.toggle("songs", songData.id);
            const heartIcon = btn.querySelector("svg");
            const isFavorite = appState.favorites.has("songs", songData.id);
            heartIcon.style.color = isFavorite ? "#ef4444" : "";
            heartIcon.style.fill = isFavorite ? "currentColor" : "none";
            break;
          case "add-queue":
            appState.queue.add(songData);
            break;
          case "remove-from-playlist":
            const playlistId = songRow.dataset.playlistId;
            const songIndex = parseInt(songRow.dataset.songIndex);
            if (playlists.removeSong(playlistId, songData.id)) {
              playlists.show(playlistId);
            }
            break;
        }
      });
    });
  },
};



const theme = {
  toggle: () => {
    const html = document.documentElement;

    if (html.classList.contains(CLASSES.light)) {
      html.classList.remove(CLASSES.light, CLASSES.medium);
      theme.updateIcon(THEMES.DARK);
      storage.save(STORAGE_KEYS.THEME_PREFERENCE, THEMES.DARK);
    } else if (html.classList.contains(CLASSES.medium)) {
      html.classList.remove(CLASSES.medium);
      html.classList.add(CLASSES.light);
      theme.updateIcon(THEMES.LIGHT);
      storage.save(STORAGE_KEYS.THEME_PREFERENCE, THEMES.LIGHT);
    } else {
      html.classList.add(CLASSES.medium);
      theme.updateIcon(THEMES.MEDIUM);
      storage.save(STORAGE_KEYS.THEME_PREFERENCE, THEMES.MEDIUM);
    }
  },

  updateIcon: (currentTheme) => {
    const themeToggle = $byId(IDS.themeToggle);
    if (themeToggle) {
      themeToggle.innerHTML = ICONS[currentTheme];
    }
  },

  initialize: () => {
    const savedTheme = storage.load(STORAGE_KEYS.THEME_PREFERENCE);
    if (savedTheme) {
      const html = document.documentElement;
      html.classList.remove(CLASSES.light, CLASSES.medium);

      if (savedTheme === THEMES.LIGHT) {
        html.classList.add(CLASSES.light);
      } else if (savedTheme === THEMES.MEDIUM) {
        html.classList.add(CLASSES.medium);
      }

      theme.updateIcon(savedTheme);
    }
  },
};

const notifications = {
  container: null,
  items: [],
  currentTimeout: null,

  initialize: () => {
    if (notifications.container) return;

    notifications.container = document.createElement("div");
    notifications.container.className = "fixed z-50 right-4 bottom-4 space-y-2 max-w-sm";
    document.body.appendChild(notifications.container);
  },

  show: (message, type = NOTIFICATION_TYPES.INFO, undoCallback = null) => {
    notifications.initialize();

    const typeStyles = {
      [NOTIFICATION_TYPES.INFO]: "bg-blue-600 border-blue-500 text-white",
      [NOTIFICATION_TYPES.SUCCESS]: "bg-green-600 border-green-500 text-white",
      [NOTIFICATION_TYPES.WARNING]: "bg-yellow-600 border-yellow-500 text-white",
      [NOTIFICATION_TYPES.ERROR]: "bg-red-600 border-red-500 text-white",
    };

    const notification = document.createElement("div");
    notification.className = `relative border px-4 py-3 rounded-md shadow-lg flex items-center justify-between gap-3 ${typeStyles[type] || typeStyles[NOTIFICATION_TYPES.INFO]}`;

    const messageSpan = document.createElement("span");
    messageSpan.className = "flex-1 text-sm";
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);

    const actions = document.createElement("div");
    actions.className = "flex items-center space-x-1";

    if (undoCallback) {
      const undoBtn = document.createElement("button");
      undoBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>';
      undoBtn.className = "p-1 hover:bg-white/20 rounded";
      undoBtn.addEventListener("click", () => {
        undoCallback();
        notifications.remove(notification);
      });
      actions.appendChild(undoBtn);
    }

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = ICONS.close;
    closeBtn.className = "p-1 hover:bg-white/20 rounded w-4 h-4";
    closeBtn.addEventListener("click", () => notifications.remove(notification));
    actions.appendChild(closeBtn);

    notification.appendChild(actions);
    notifications.container.appendChild(notification);

    if (notifications.currentTimeout) clearTimeout(notifications.currentTimeout);
    notifications.currentTimeout = setTimeout(() => {
      notifications.remove(notification);
    }, 5000);

    return notification;
  },

  remove: (element) => {
    element.style.transition = "all 0.3s ease";
    element.style.opacity = "0";
    element.style.transform = "translateY(-10px)";

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 300);
  },
};

const utils = {
  formatTime: (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  },

  normalizeForUrl: (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "");
  },

  getAlbumImageUrl: (albumName) => {
    if (!albumName) return utils.getDefaultAlbumImage();
    const normalized = utils.normalizeForUrl(albumName);
    return `https://koders.cloud/global/content/images/albumCovers/${normalized}.png`;
  },

  getArtistImageUrl: (artistName) => {
    if (!artistName) return utils.getDefaultArtistImage();
    const normalized = utils.normalizeForUrl(artistName);
    return `https://koders.cloud/global/content/images/artistPortraits/${normalized}.png`;
  },

  getDefaultAlbumImage: () => {
    return "https://koders.cloud/global/content/images/albumCovers/default-album.png";
  },

  getDefaultArtistImage: () => {
    return "https://koders.cloud/global/content/images/artistPortraits/default-artist.png";
  },

  getTotalSongs: (artist) => {
    return artist.albums.reduce((total, album) => total + album.songs.length, 0);
  },

  loadImageWithFallback: (imgElement, primaryUrl, fallbackUrl, type = "image") => {
    if (!imgElement) return;

    imgElement.classList.add(CLASSES.imageLoading);

    const testImage = new Image();

    testImage.onload = () => {
      imgElement.src = primaryUrl;
      imgElement.classList.remove(CLASSES.imageLoading, CLASSES.imageError);
      imgElement.classList.add(CLASSES.imageLoaded);
    };

    testImage.onerror = () => {
      const fallbackImage = new Image();

      fallbackImage.onload = () => {
        imgElement.src = fallbackUrl;
        imgElement.classList.remove(CLASSES.imageLoading);
        imgElement.classList.add(CLASSES.imageLoaded);
      };

      fallbackImage.onerror = () => {
        imgElement.src = utils.generatePlaceholder(type);
        imgElement.classList.remove(CLASSES.imageLoading);
        imgElement.classList.add(CLASSES.imageFallback);
      };

      fallbackImage.src = fallbackUrl;
    };

    testImage.src = primaryUrl;
  },

  generatePlaceholder: (type) => {
    const isArtist = type === "artist";
    const bgColor = isArtist ? "#4F46E5" : "#059669";
    const icon = isArtist ?
      '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>' :
      '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>';

    const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${bgColor}"/>
      <svg x="75" y="75" width="50" height="50" viewBox="0 0 24 24" fill="white">
        ${icon}
      </svg>
    </svg>`;

    return "data:image/svg+xml;base64," + btoa(svg);
  },
};

const eventHandlers = {
  init: () => {
    
    eventHandlers.bindMenus();
    eventHandlers.bindControls();
    eventHandlers.bindPopups();
    eventHandlers.bindProgress();
    eventHandlers.bindKeyboard();
    eventHandlers.bindDocument();
    
  },

  bindControls: () => {
    

    const controlElements = {
      [IDS.playPauseNavbar]: player.toggle, // Play/pause button in navbar
      [IDS.prevBtnNavbar]: player.previous, // Previous track button in navbar
      [IDS.nextBtnNavbar]: player.next, // Next track button in navbar
      [IDS.nowPlayingArea]: popup.toggle, // Now playing area click to open popup
    };

    Object.entries(controlElements).forEach(([id, handler]) => {
      const element = $byId(id);
      

      if (element) {
        element.removeEventListener("click", handler);
        element.addEventListener("click", (e) => {
          
          e.stopPropagation();

          try {
            handler();
          } catch (error) {
            
          }
        });

        
      } else {
        
      }
    });

    const navbarAlbumCover = $byId(IDS.navbarAlbumCover);
    if (navbarAlbumCover) {
      navbarAlbumCover.removeEventListener("click", popup.toggle);
      navbarAlbumCover.addEventListener("click", (e) => {
        
        e.stopPropagation();
        popup.toggle();
      });
      
    }
  },

  bindMenus: () => {
    const menuElements = {
      [IDS.menuTrigger]: dropdown.toggle, // Main menu trigger (hamburger icon)
      [IDS.dropdownClose]: dropdown.close, // Close menu button
      [IDS.willHideMenu]: dropdown.close, // Alternative close trigger
    };

    Object.entries(menuElements).forEach(([id, handler]) => {
      const element = $byId(id);
      if (element) {
        element.removeEventListener("click", handler);
        element.addEventListener("click", handler);
      }
    });

    const menuActions = {
      [IDS.favoriteSongs]: () => { // Favorite songs menu item
        dropdown.close();
        views.showFavoriteSongs();
      },
      [IDS.favoriteArtists]: () => { // Favorite artists menu item
        dropdown.close();
        views.showFavoriteArtists();
      },
      [IDS.recentlyPlayed]: () => { // Recently played menu item
        dropdown.close();
        popup.open();
        setTimeout(() => popup.switchTab("recent"), 50);
      },
      [IDS.queueView]: () => { // Queue view menu item
        dropdown.close();
        popup.open();
        setTimeout(() => popup.switchTab("queue"), 50);
      },
      [IDS.createPlaylist]: () => { // Create playlist menu item
        dropdown.close();
        playlists.create();
      },
      [IDS.shuffleAll]: controls.shuffle.all, // Shuffle all songs menu item
      [IDS.themeToggle]: theme.toggle, // Theme toggle menu item
    };

    if (IDS.favoriteAlbums) {
      menuActions[IDS.favoriteAlbums] = () => {
        dropdown.close();
        views.showFavoriteAlbums();
      };
    }

    Object.entries(menuActions).forEach(([id, handler]) => {
      const element = $byId(id);
      if (element) {
        element.removeEventListener("click", handler);
        element.addEventListener("click", handler);
      }
    });
  },

  bindPopups: () => {
    const popupControls = {
      [IDS.closeBtn]: popup.close, // Close popup button
      [IDS.playBtn]: player.toggle, // Play/pause in popup - CRITICAL
      [IDS.prevBtn]: player.previous, // Previous track in popup
      [IDS.nextBtn]: player.next, // Next track in popup
      [IDS.shuffleBtn]: controls.shuffle.toggle, // Shuffle button in popup
      [IDS.repeatBtn]: controls.repeat.toggle, // Repeat button in popup
      [IDS.favoriteBtn]: () => { // Favorite heart button in popup
        if (appState.currentSong) {
          const isFavorite = appState.favorites.toggle("songs", appState.currentSong.id);
          ui.updateFavoriteButton();
        }
      },
    };

    Object.entries(popupControls).forEach(([id, handler]) => {
      const element = $byId(id);
      if (element) {
        element.removeEventListener("click", handler);
        element.addEventListener("click", handler);
      }
    });

    document.querySelectorAll(".popup-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        popup.switchTab(tab.dataset.tab);
        popup.startInactivityTimer();
      });
    });
  },

  bindProgress: () => {
    const progressBar = $byId(IDS.progressBar);
    if (!progressBar) return;

    progressBar.addEventListener("click", (e) => {
      if (!appState.currentSong || !appState.audio) return;

      const rect = progressBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = percent * appState.duration;

      controls.seekTo(newTime);
    });

    let isDragging = false;

    const startDrag = (e) => {
      if (!appState.currentSong) return;
      isDragging = true;
      document.body.style.userSelect = "none";
      e.preventDefault();
    };

    const onDrag = (e) => {
      if (!isDragging || !appState.currentSong || !appState.audio) return;

      const rect = progressBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = percent * appState.duration;

      controls.seekTo(newTime);
    };

    const endDrag = () => {
      isDragging = false;
      document.body.style.userSelect = "";
    };

    progressBar.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", endDrag);
  },

  bindKeyboard: () => {
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const shortcuts = {
        " ": (e) => { // Spacebar for play/pause
          e.preventDefault();
          player.toggle();
        },
        ArrowLeft: (e) => { // Ctrl/Cmd + Left for previous
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            controls.previous();
          }
        },
        ArrowRight: (e) => { // Ctrl/Cmd + Right for next
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            controls.next();
          }
        },
        KeyN: (e) => { // Ctrl/Cmd + N for now playing
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            popup.open();
          }
        },
        KeyM: (e) => { // Ctrl/Cmd + M for menu
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dropdown.toggle();
          }
        },
        KeyS: (e) => { // Ctrl/Cmd + S for shuffle
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            controls.shuffle.toggle();
          }
        },
        KeyR: (e) => { // Ctrl/Cmd + R for repeat
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            controls.repeat.toggle();
          }
        },
        Escape: () => { // Escape to close overlays
          popup.close();
          dropdown.close();
        },
      };

      const handler = shortcuts[e.code] || shortcuts[e.key];
      if (handler) {
        handler(e);
      }
    });
  },

  bindDocument: () => {
    document.addEventListener("click", (e) => {
      const dropdownMenu = $byId(IDS.dropdownMenu);
      const menuTrigger = $byId(IDS.menuTrigger);
      if (dropdownMenu && !dropdownMenu.contains(e.target) && !menuTrigger?.contains(e.target)) {
        dropdown.close();
      }

      const musicPlayer = $byId(IDS.musicPlayer);
      const nowPlayingArea = $byId(IDS.nowPlayingArea);
      if (appState.isPopupVisible && musicPlayer && !musicPlayer.contains(e.target) && !nowPlayingArea?.contains(e.target)) {
        popup.close();
      }

      const navItem = e.target.closest("[data-nav]");
      if (navItem) {
        e.preventDefault();
        const navType = navItem.dataset.nav;
        dropdown.close();

        if (appState.siteMapInstance) {
          const navHandlers = {
            [ROUTES.HOME]: () => appState.siteMapInstance.navigateTo(ROUTES.HOME),
            [ROUTES.ALL_ARTISTS]: () => appState.siteMapInstance.navigateTo(ROUTES.ALL_ARTISTS),
            [ROUTES.ARTIST]: () => {
              const artistName = navItem.dataset.artist;
              if (artistName) appState.siteMapInstance.navigateTo(ROUTES.ARTIST, {
                artist: artistName
              });
            },
            [ROUTES.ALBUM]: () => {
              const artist = navItem.dataset.artist;
              const album = navItem.dataset.album;
              if (artist && album) appState.siteMapInstance.navigateTo(ROUTES.ALBUM, {
                artist,
                album
              });
            },
          };

          if (navHandlers[navType]) navHandlers[navType]();
        }
      }

      if (e.target.closest("#" + IDS.globalSearchTrigger)) {
        e.preventDefault();
        dropdown.close();
        if (appState.siteMapInstance) appState.siteMapInstance.openSearchDialog();
      }
    });
  },
};

const views = {
  showFavoriteSongs: () => {
    const favoriteSongIds = Array.from(appState.favorites.songs);
    if (favoriteSongIds.length === 0) {
      modals.open(
        "favorite-songs-modal",
        views.renderEmptyState("No Favorite Songs", "You haven't added any songs to your favorites yet.", "Browse your music and click the heart icon to add favorites.")
      );
      return;
    }
    const favoriteSongs = views.getSongsByIds(favoriteSongIds);
    const content = `
        <div class="favorites-page animate__animated animate__fadeIn">
          <div class="page-header mb-8">
            <h1 class="text-3xl font-bold mb-2">Favorite Songs</h1>
            <p class="text-gray-400">${favoriteSongs.length} song${favoriteSongs.length !== 1 ? "s" : ""}</p>
            <div class="flex gap-4 mt-4">
              <button class="play-all-btn bg-accent-primary text-white px-6 py-2 rounded-full hover:bg-accent-secondary transition-colors flex items-center gap-2">
                ${ICONS.play}
                Play All
              </button>
              <button class="shuffle-all-btn bg-gray-600 text-white px-6 py-2 rounded-full hover:bg-gray-500 transition-colors flex items-center gap-2">
                ${ICONS.shuffle}
                Shuffle
              </button>
            </div>
          </div>
          <div class="songs-list">
            ${favoriteSongs
              .map(
                (song, index) => `
              <div class="song-row flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" data-song='${JSON.stringify(song).replace(/"/g, "&quot;")}'>
                <div class="track-number text-gray-400 w-8 text-center">${index + 1}</div>
                <img src="${utils.getAlbumImageUrl(song.album)}" alt="${song.title}" class="w-12 h-12 rounded object-cover">
                <div class="song-info flex-1">
                  <div class="song-title font-medium">${song.title}</div>
                  <div class="song-artist text-gray-400 text-sm cursor-pointer hover:text-white transition-colors" data-artist="${song.artist}">${song.artist}</div>
                </div>
                <div class="album-name text-gray-400 text-sm hidden md:block">${song.album}</div>
                <div class="song-duration text-gray-400 text-sm">${song.duration || "0:00"}</div>
                <div class="song-actions flex items-center gap-2">
                  <button class="action-btn p-2 hover:bg-white/10 rounded transition-colors" data-action="favorite" data-song-id="${song.id}" title="Remove from favorites">
                    <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                  </button>
                  <button class="action-btn p-2 hover:bg-white/10 rounded transition-colors" data-action="add-queue" title="Add to queue">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                  </button>
                  <button class="action-btn p-2 hover:bg-white/10 rounded transition-colors" data-action="add-playlist" title="Add to playlist">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  </button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    modals.open("favorite-songs-modal", content);
    const modalEl = document.getElementById("favorite-songs-modal");
    views.bindFavoriteSongsEvents(modalEl);
  },

  showFavoriteArtists: () => {
    const favoriteArtistNames = Array.from(appState.favorites.artists);
    if (favoriteArtistNames.length === 0) {
      modals.open(
        "favorite-artists-modal",
        views.renderEmptyState("No Favorite Artists", "You haven't added any artists to your favorites yet.", "Browse artists and click the heart icon to add favorites.")
      );
      return;
    }
    const favoriteArtists = favoriteArtistNames
      .map((artistName) => window.music?.find((a) => a.artist === artistName))
      .filter(Boolean);

    const content = `
        <div class="favorites-page animate__animated animate__fadeIn">
          <div class="page-header mb-8">
            <h1 class="text-3xl font-bold mb-2">Favorite Artists</h1>
            <p class="text-gray-400">${favoriteArtists.length} artist${favoriteArtists.length !== 1 ? "s" : ""}</p>
          </div>

          <div class="artists-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            ${favoriteArtists
              .map(
                (artist, index) => `
              <div class="artist-card animate__animated animate__fadeIn cursor-pointer" style="animation-delay: ${index * 100}ms;" data-artist="${artist.artist}">
                <div class="relative group">
                  <img src="${utils.getArtistImageUrl(artist.artist)}" alt="${artist.artist}" class="w-full aspect-square rounded-full object-cover mb-4">
                  <div class="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button class="play-artist-btn w-12 h-12 bg-accent-primary rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform" data-artist="${artist.artist}">
                      ${ICONS.play}
                    </button>
                  </div>
                </div>
                <h3 class="font-medium text-center mb-1">${artist.artist}</h3>
                <p class="text-gray-400 text-sm text-center">${artist.albums.length} album${artist.albums.length !== 1 ? "s" : ""}</p>
                <div class="flex justify-center mt-2">
                  <button class="unfavorite-artist-btn text-red-500 hover:text-red-400 text-sm transition-colors" data-artist="${artist.artist}">Remove from Favorites</button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    modals.open("favorite-artists-modal", content);
    const modalEl = document.getElementById("favorite-artists-modal");
    views.bindFavoriteArtistsEvents(modalEl);
  },

  showFavoriteAlbums: () => {
    const favoriteAlbumIds = Array.from(appState.favorites.albums);
    if (favoriteAlbumIds.length === 0) {
      modals.open(
        "favorite-albums-modal",
        views.renderEmptyState("No Favorite Albums", "You haven't added any albums to your favorites yet.", "Browse albums and click the heart icon to add favorites.")
      );
      return;
    }
    const favoriteAlbums = views.getAlbumsByIds(favoriteAlbumIds);
    const content = `
        <div class="favorites-page animate__animated animate__fadeIn">
          <div class="page-header mb-8">
            <h1 class="text-3xl font-bold mb-2">Favorite Albums</h1>
            <p class="text-gray-400">${favoriteAlbums.length} album${favoriteAlbums.length !== 1 ? "s" : ""}</p>
          </div>
          <div class="albums-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            ${favoriteAlbums
              .map(
                (album, index) => `
              <div class="album-card cursor-pointer" style="animation-delay: ${index * 100}ms;" data-album-id="${album.id}">
                <img src="${utils.getAlbumImageUrl(album.album)}" alt="${album.album}" class="w-full aspect-square object-cover rounded mb-4">
                <h3 class="font-medium text-center mb-1">${album.album}</h3>
                <p class="text-gray-400 text-sm text-center">${album.artist}</p>
                <div class="flex justify-center mt-2">
                  <button class="unfavorite-album-btn text-red-500 hover:text-red-400 text-sm transition-colors" data-album-id="${album.id}">Remove from Favorites</button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    modals.open("favorite-albums-modal", content);
    const modalEl = document.getElementById("favorite-albums-modal");
    views.bindFavoriteAlbumsEvents(modalEl);
  },

  bindFavoriteSongsEvents: (root = $byId(IDS.dynamicContent)) => {
    const dynamicContent = root;
    if (!dynamicContent) return;

    const playAllBtn = dynamicContent.querySelector(".play-all-btn");
    if (playAllBtn) {
      playAllBtn.addEventListener("click", () => {
        const favoriteSongs = views.getSongsByIds(Array.from(appState.favorites.songs));
        if (favoriteSongs.length > 0) {
          appState.queue.clear();
          favoriteSongs.slice(1).forEach((song) => appState.queue.add(song));
          player.playSong(favoriteSongs[0]);
        }
      });
    }

    const shuffleAllBtn = dynamicContent.querySelector(".shuffle-all-btn");
    if (shuffleAllBtn) {
      shuffleAllBtn.addEventListener("click", () => {
        const favoriteSongs = views.getSongsByIds(Array.from(appState.favorites.songs));
        if (favoriteSongs.length > 0) {
          for (let i = favoriteSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [favoriteSongs[i], favoriteSongs[j]] = [favoriteSongs[j], favoriteSongs[i]];
          }

          appState.queue.clear();
          favoriteSongs.slice(1).forEach((song) => appState.queue.add(song));
          player.playSong(favoriteSongs[0]);
          appState.shuffleMode = true;
          ui.updateShuffleButton();
        }
      });
    }

    dynamicContent.querySelectorAll(".song-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".song-actions") || e.target.closest(".song-artist")) return;

        try {
          const songData = JSON.parse(row.dataset.song);
          player.playSong(songData);
        } catch (error) {
          
        }
      });
    });

    dynamicContent.querySelectorAll(".song-artist").forEach((artistEl) => {
      artistEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistName = artistEl.dataset.artist;
        if (appState.siteMapInstance) {
          appState.siteMapInstance.navigateTo(ROUTES.ARTIST, {
            artist: artistName
          });
        }
      });
    });

    dynamicContent.querySelectorAll(".action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const songRow = btn.closest(".song-row");
        const songData = JSON.parse(songRow.dataset.song);

        if (action === "favorite") {
          appState.favorites.remove("songs", songData.id);
          songRow.style.transition = "all 0.3s ease";
          songRow.style.opacity = "0";
          songRow.style.transform = "translateX(-20px)";
          setTimeout(() => {
            songRow.remove();
            const remainingSongs = dynamicContent.querySelectorAll(".song-row");
            if (remainingSongs.length === 0) {
              modals.close("favorite-songs-modal");
            }
          }, 300);
        } else if (action === "add-queue") {
          appState.queue.add(songData);
        } else if (action === "add-playlist") {
          siteMap.showPlaylistSelector(songData);
        }
      });
    });
  },

  bindFavoriteArtistsEvents: (root = $byId(IDS.dynamicContent)) => {
    const dynamicContent = root;
    if (!dynamicContent) return;

    dynamicContent.querySelectorAll(".artist-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".play-artist-btn") || e.target.closest(".unfavorite-artist-btn")) return;

        const artistName = card.dataset.artist;
        if (appState.siteMapInstance) {
          appState.siteMapInstance.navigateTo(ROUTES.ARTIST, {
            artist: artistName
          });
        }
      });
    });

    dynamicContent.querySelectorAll(".play-artist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistName = btn.dataset.artist;
        const artistData = window.music?.find((a) => a.artist === artistName);

        if (artistData) {
          const allSongs = [];
          artistData.albums.forEach((album) => {
            album.songs.forEach((song) => {
              allSongs.push({
                ...song,
                artist: artistData.artist,
                album: album.album,
                cover: utils.getAlbumImageUrl(album.album),
              });
            });
          });

          if (allSongs.length > 0) {
            appState.queue.clear();
            allSongs.slice(1).forEach((song) => appState.queue.add(song));
            player.playSong(allSongs[0]);
          }
        }
      });
    });

    dynamicContent.querySelectorAll(".unfavorite-artist-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistName = btn.dataset.artist;

        appState.favorites.remove("artists", artistName);

        const artistCard = btn.closest(".artist-card");
        artistCard.style.transition = "all 0.3s ease";
        artistCard.style.opacity = "0";
        artistCard.style.transform = "scale(0.8)";
        setTimeout(() => {
          artistCard.remove();
          const remainingArtists = dynamicContent.querySelectorAll(".artist-card");
          if (remainingArtists.length === 0) {
            modals.close("favorite-artists-modal");
          }
        }, 300);
      });
    });
  },

  bindFavoriteAlbumsEvents: (root = $byId(IDS.dynamicContent)) => {
    const container = root;
    if (!container) return;

    container.querySelectorAll(".unfavorite-album-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const albumId = btn.dataset.albumId;
        appState.favorites.remove("albums", albumId);
        const card = btn.closest(".album-card");
        card?.remove();
        if (!container.querySelector(".album-card")) {
          modals.close("favorite-albums-modal");
        }
      });
    });

    container.querySelectorAll(".album-card").forEach((card) => {
      card.addEventListener("click", () => {
        const albumId = card.dataset.albumId;
        const album = views.getAlbumsByIds([albumId])[0];
        if (album) {
          appState.queue.clear();
          album.songs.slice(1).forEach((song) =>
            appState.queue.add({
              ...song,
              artist: album.artist,
              album: album.album,
              cover: utils.getAlbumImageUrl(album.album)
            })
          );
          player.playSong({
            ...album.songs[0],
            artist: album.artist,
            album: album.album,
            cover: utils.getAlbumImageUrl(album.album)
          });
        }
      });
    });
  },

  getSongsByIds: (ids) => {
    if (!window.music || !ids.length) return [];

    const songs = [];

    window.music.forEach((artist) => {
      artist.albums.forEach((album) => {
        album.songs.forEach((song) => {
          if (ids.includes(song.id)) {
            songs.push({
              ...song,
              artist: artist.artist,
              album: album.album,
              cover: utils.getAlbumImageUrl(album.album),
            });
          }
        });
      });
    });

    return songs;
  },

  getAlbumsByIds: (ids) => {
    if (!window.music || !ids.length) return [];
    const albums = [];
    window.music.forEach((artist) => {
      artist.albums.forEach((album) => {
        const albumId = album.id || album.album;
        if (ids.includes(albumId)) {
          albums.push({
            ...album,
            id: albumId,
            artist: artist.artist,
            cover: utils.getAlbumImageUrl(album.album),
          });
        }
      });
    });
    return albums;
  },

  showLoading: () => {
    const dynamicContent = $byId(IDS.dynamicContent);
    if (!dynamicContent) return;

    dynamicContent.innerHTML = `
      <div class="loading-container flex items-center justify-center py-20">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p class="text-gray-400">Loading...</p>
        </div>
      </div>
    `;
  },

  renderEmptyState: (title, subtitle, description) => {
    return `
      <div class="empty-state-container flex items-center justify-center py-20">
        <div class="text-center max-w-md">
          <div class="mb-6">
            <svg class="w-20 h-20 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold mb-2">${title}</h2>
          <p class="text-gray-400 mb-4">${subtitle}</p>
          <p class="text-gray-500 text-sm">${description}</p>
          <button class="mt-6 bg-accent-primary text-white px-6 py-2 rounded-full hover:bg-accent-secondary transition-colors" onclick="app.goHome()">
            Browse Music
          </button>
        </div>
      </div>
    `;
  },
};

const siteMap = {
  initialize: () => {
    appState.siteMapInstance = {
      routes: {
        [ROUTES.HOME]: {
          pattern: /^\/$/,
          handler: siteMap.loadHomePage,
        },
        [ROUTES.ARTIST]: {
          pattern: /^\/artist\/(.+)$/,
          handler: (params) => {
            const artistName = params.artist || siteMap.getParameterByName("artist", window.location.href);
            const artistData = window.music?.find((a) => a.artist === artistName);
            if (artistData) {
              siteMap.loadArtistPage(artistData);
            } else {
              appState.siteMapInstance.navigateTo(ROUTES.HOME);
            }
          },
        },
        [ROUTES.ALL_ARTISTS]: {
          pattern: /^\/artists$/,
          handler: siteMap.loadAllArtistsPage,
        },
      },

      handleInitialRoute: function() {
        const path = window.location.pathname + window.location.search;
        this.handleRoute(path);
      },

      handleRoute: function(path) {
        let matchedRoute = false;

        for (const key in this.routes) {
          const route = this.routes[key];
          const match = path.match(route.pattern);

          if (match) {
            const params = {};

            if (key === ROUTES.ARTIST) {
              params.artist = decodeURIComponent(match[1]);
            }

            route.handler(params);
            matchedRoute = true;
            break;
          }
        }

        if (!matchedRoute) {
          siteMap.loadHomePage();
        }
      },

      navigateTo: function(routeName, params = {}) {
        let url;

        switch (routeName) {
          case ROUTES.HOME:
            url = "/";
            break;
          case ROUTES.ARTIST:
            url = `/artist/${encodeURIComponent(params.artist)}`;
            break;
          case ROUTES.ALL_ARTISTS:
            url = "/artists";
            break;
          default:
            url = "/";
        }

        window.history.pushState({}, "", url);

        if (this.routes[routeName]) {
          this.routes[routeName].handler(params);
        }

        siteMap.showLoading();
      },

      openSearchDialog: siteMap.openSearchDialog,
      closeSearchDialog: siteMap.closeSearchDialog,
      updateBreadcrumb: siteMap.updateBreadcrumb,
    };

    window.addEventListener("popstate", () => {
      appState.siteMapInstance.handleRoute(window.location.pathname + window.location.search);
    });

    appState.siteMapInstance.handleInitialRoute();
  },

  showLoading: () => {
    const contentLoading = $byId(IDS.contentLoading);
    if (contentLoading) {
      contentLoading.classList.remove(CLASSES.hidden);
      setTimeout(() => {
        contentLoading.classList.add(CLASSES.hidden);
      }, 800);
    }
  },

  loadHomePage: () => {
    if (appState.homePageManagerInstance) {
      const dynamicContent = $byId(IDS.dynamicContent);
      if (dynamicContent) {
        dynamicContent.innerHTML = "";
      }

      siteMap.showLoading();

      setTimeout(() => {
        appState.homePageManagerInstance.renderHomePage();
        appState.siteMapInstance.updateBreadcrumb([{
          text: "Home",
          type: "home",
          url: "/",
          active: true
        }]);
      }, 200);
    }
  },

  loadArtistPage: (artistData) => {
    const dynamicContent = $byId(IDS.dynamicContent);
    if (!dynamicContent) return;

    siteMap.showLoading();
    dynamicContent.innerHTML = "";

    setTimeout(() => {
      siteMap.renderArtistPage(artistData);
    }, 300);
  },

  loadAllArtistsPage: () => {
    const dynamicContent = $byId(IDS.dynamicContent);
    if (!dynamicContent || !window.music) return;

    siteMap.showLoading();
    dynamicContent.innerHTML = "";

    setTimeout(() => {
      siteMap.renderAllArtistsPage();
    }, 300);
  },

  renderArtistAlbums: (artistData) => {
    const albumsContainer = $byId(IDS.albumsContainer);
    if (!albumsContainer) return;

    albumsContainer.innerHTML = `<h2 class="section-title text-2xl font-bold mb-6">Albums</h2>`;

    const albumsGrid = document.createElement("div");
    albumsGrid.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";

    artistData.albums.forEach((album) => {
      const albumCard = document.createElement("div");
      albumCard.className = "album-card animate__animated animate__fadeIn";
      albumCard.style.animationDelay = "0.2s";
      albumCard.dataset.album = album.album;

      albumCard.innerHTML = render.album("card", {
        albumId: `${artistData.artist}-${album.album}`.replace(/\s+/g, "").toLowerCase(),
        album: album.album,
        cover: utils.getAlbumImageUrl(album.album),
        year: album.year || "Unknown",
        songCount: album.songs.length,
      });

      albumsGrid.appendChild(albumCard);
      siteMap.renderAlbumSongs(albumCard, album, artistData.artist);
    });

    albumsContainer.appendChild(albumsGrid);
  },

  handleSongAction: (action, songData) => {
    switch (action) {
      case "favorite":
        appState.favorites.toggle("songs", songData.id);
        break;
      case "play-next":
        appState.queue.add(songData, 0);
        notifications.show("Added to play next");
        break;
      case "add-queue":
        appState.queue.add(songData);
        break;
      case "add-playlist":
        siteMap.showPlaylistSelector(songData);
        break;
      case "share":
        notifications.show("Share functionality coming soon");
        break;
    }
  },

  showPlaylistSelector: (songData) => {
    if (appState.playlists.length === 0) {
      const createNew = confirm("No playlists found. Create a new playlist?");
      if (createNew) {
        const playlist = playlists.promptCreate();
        if (playlist) {
          playlists.addSong(playlist.id, songData);
        }
      }
      return;
    }

    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center";
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold mb-4">Add to Playlist</h3>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          ${appState.playlists
            .map(
              (playlist) => `
            <button class="playlist-option w-full text-left p-3 rounded hover:bg-gray-700 transition-colors" data-playlist-id="${playlist.id}">
              <div class="font-medium">${playlist.name}</div>
              <div class="text-sm text-gray-400">${playlist.songs.length} songs</div>
            </button>
          `
            )
            .join("")}
        </div>
        <div class="flex gap-3 mt-6">
          <button class="create-new-playlist flex-1 bg-accent-primary text-white py-2 px-4 rounded hover:bg-accent-secondary transition-colors">
            Create New Playlist
          </button>
          <button class="cancel-playlist-modal bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-500 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll(".playlist-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const playlistId = btn.dataset.playlistId;
        playlists.addSong(playlistId, songData);
        document.body.removeChild(modal);
      });
    });

    modal.querySelector(".create-new-playlist").addEventListener("click", () => {
      const playlist = playlists.promptCreate();
      if (playlist) {
        playlists.addSong(playlist.id, songData);
      }
      document.body.removeChild(modal);
    });

    modal.querySelector(".cancel-playlist-modal").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  },

  playArtistSongs: (artistData) => {
    const allSongs = [];
    artistData.albums.forEach((album) => {
      album.songs.forEach((song) => {
        allSongs.push({
          ...song,
          artist: artistData.artist,
          album: album.album,
          cover: utils.getAlbumImageUrl(album.album),
        });
      });
    });

    if (allSongs.length > 0) {
      appState.queue.clear();
      allSongs.slice(1).forEach((song) => appState.queue.add(song));
      player.playSong(allSongs[0]);
    }
  },

  playAlbumSongs: (album, artistName) => {
    if (album.songs.length === 0) return;

    appState.queue.clear();
    album.songs.slice(1).forEach((song) => {
      appState.queue.add({
        ...song,
        artist: artistName,
        album: album.album,
        cover: utils.getAlbumImageUrl(album.album),
      });
    });

    player.playSong({
      ...album.songs[0],
      artist: artistName,
      album: album.album,
      cover: utils.getAlbumImageUrl(album.album),
    });
  },

  renderAllArtistsPage: () => {
    const dynamicContent = $byId(IDS.dynamicContent);
    if (!dynamicContent) return;

    dynamicContent.innerHTML = render.page("allArtists");

    const artistsGrid = $byId(IDS.artistsGrid);
    if (artistsGrid && window.music) {
      window.music.forEach((artist, index) => {
        const artistCard = document.createElement("div");
        artistCard.className = "animate__animated animate__fadeIn";
        artistCard.style.animationDelay = `${0.05 * index}s`;

        artistCard.innerHTML = render.artist("card", {
          id: artist.artist.replace(/\s+/g, "").toLowerCase(),
          artist: artist.artist,
          cover: utils.getArtistImageUrl(artist.artist),
          genre: artist.genre || "Various",
          albumCount: artist.albums.length,
        });

        artistsGrid.appendChild(artistCard);

        artistCard.querySelector(".artist-card").addEventListener("click", () => {
          appState.siteMapInstance.navigateTo(ROUTES.ARTIST, {
            artist: artist.artist
          });
        });
      });
    }

    appState.siteMapInstance.updateBreadcrumb([{
        text: "Home",
        type: "home",
        url: "/"
      },
      {
        text: "All Artists",
        type: "allArtists",
        url: "/artists",
        active: true
      },
    ]);

    siteMap.bindAllArtistsEvents();
  },

  bindAllArtistsEvents: () => {
    const artistSearch = $byId(IDS.artistSearch);
    if (artistSearch) {
      artistSearch.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();

        document.querySelectorAll(".artist-card").forEach((card) => {
          const artistName = card.querySelector("h3").textContent.toLowerCase();
          const genreTag = card.querySelector(".genre-tag")?.textContent.toLowerCase() || "";

          const matches = artistName.includes(query) || genreTag.includes(query);
          card.parentElement.style.display = matches ? "block" : "none";
        });
      });
    }

    const genreFilters = $byId(IDS.genreFilters);
    if (genreFilters && window.music) {
      const genres = new Set();
      window.music.forEach((artist) => {
        if (artist.genre) genres.add(artist.genre);
      });

      genreFilters.innerHTML = "";
      Array.from(genres)
        .sort()
        .forEach((genre) => {
          const genreBtn = document.createElement("button");
          genreBtn.className = "px-3 py-1 text-xs font-medium rounded-full bg-bg-subtle hover:bg-bg-muted transition-colors";
          genreBtn.textContent = genre;

          genreBtn.addEventListener("click", () => {
            genreBtn.classList.toggle(CLASSES.active);
            genreBtn.classList.toggle("bg-accent-primary");
            genreBtn.classList.toggle("text-white");

            const activeFilters = Array.from(genreFilters.querySelectorAll("." + CLASSES.active)).map((btn) => btn.textContent.toLowerCase());

            document.querySelectorAll(".artist-card").forEach((card) => {
              const cardGenre = card.querySelector(".genre-tag")?.textContent.toLowerCase() || "";

              if (activeFilters.length === 0 || activeFilters.includes(cardGenre)) {
                card.parentElement.style.display = "block";
              } else {
                card.parentElement.style.display = "none";
              }
            });
          });

          genreFilters.appendChild(genreBtn);
        });
    }
  },

  getParameterByName: (name, url) => {
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  },

  openSearchDialog: () => {
    notifications.show("Search functionality coming soon");
  },

  closeSearchDialog: () => {},

  updateBreadcrumb: (items) => {
    const breadcrumbList = document.querySelector(".breadcrumb-list");
    if (!breadcrumbList) return;

    breadcrumbList.innerHTML = "";

    items.forEach((item, index) => {
      if (index > 0) {
        const separator = document.createElement("li");
        separator.innerHTML = '<span class="text-gray-500">/</span>';
        breadcrumbList.appendChild(separator);
      }

      const breadcrumbItem = document.createElement("li");
      breadcrumbItem.innerHTML = item.active ? `<span class="text-accent-primary font-medium">${item.text}</span>` : `<a href="${item.url}" class="text-gray-400 hover:text-gray-200 transition-colors">${item.text}</a>`;
      breadcrumbList.appendChild(breadcrumbItem);
    });
  },

  renderArtistPage: (artistData) => {
    const dynamicContent = $byId(IDS.dynamicContent);
    if (!dynamicContent) return;

    dynamicContent.innerHTML = render.artist("enhancedArtist", {
      artist: artistData.artist,
      cover: utils.getArtistImageUrl(artistData.artist),
      genre: artistData.genre || "Various",
      albumCount: artistData.albums.length,
      songCount: utils.getTotalSongs(artistData),
    });

    siteMap.setupAlbumsSection(artistData);

    appState.siteMapInstance.updateBreadcrumb([{
        text: "Home",
        type: "home",
        url: "/"
      },
      {
        text: artistData.artist,
        type: "artist",
        url: `/artist/${encodeURIComponent(artistData.artist)}`,
        active: true
      },
    ]);

    siteMap.bindArtistPageEvents(artistData);
  },

  setupAlbumsSection: (artistData) => {
    const albumsContainer = $byId(IDS.albumsContainer);
    if (!albumsContainer || !artistData.albums.length) return;

    albumsContainer.innerHTML = `
      <div class="albums-section">
        <div class="albums-header mb-6">
          <h2 class="section-title text-2xl font-bold mb-4">Albums</h2>
          
          <div class="album-selector flex flex-wrap gap-2 mb-4">
            ${artistData.albums
              .map(
                (album, index) => `
              <button class="album-tab px-4 py-2 rounded-lg transition-all duration-300 ${index === 0 ? "active bg-accent-primary text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}" 
                      data-album-index="${index}" 
                      data-album-name="${album.album}">
                <div class="flex items-center gap-2">
                  <span class="album-tab-title">${album.album}</span>
                  <span class="album-tab-year text-xs opacity-75">${album.year || ""}</span>
                </div>
              </button>
            `
              )
              .join("")}
          </div>
        </div>
        
        <div class="current-album-container">
          <div id="current-album-display" class="transition-all duration-500 ease-in-out"></div>
        </div>
      </div>
    `;

    siteMap.displaySingleAlbum(artistData, 0);
    siteMap.bindAlbumSwitcher(artistData);
  },

  displaySingleAlbum: (artistData, albumIndex) => {
    const currentAlbumDisplay = $byId("current-album-display");
    if (!currentAlbumDisplay || !artistData.albums[albumIndex]) return;

    const album = artistData.albums[albumIndex];
    const albumId = `${artistData.artist}-${album.album}`.replace(/\s+/g, "").toLowerCase();

    currentAlbumDisplay.style.opacity = "0";
    currentAlbumDisplay.style.transform = "translateY(10px)";

    setTimeout(() => {
      currentAlbumDisplay.innerHTML = render.album("singleAlbumCard", {
        albumId: albumId,
        album: album.album,
        cover: utils.getAlbumImageUrl(album.album),
        year: album.year || "Unknown",
        songCount: album.songs.length,
      });

      siteMap.renderAlbumSongs(currentAlbumDisplay, album, artistData.artist);

      currentAlbumDisplay.style.opacity = "1";
      currentAlbumDisplay.style.transform = "translateY(0)";

      
    }, 250);
  },

  bindAlbumSwitcher: (artistData) => {
    const albumTabs = document.querySelectorAll(".album-tab");

    albumTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();

        const albumIndex = parseInt(tab.dataset.albumIndex);
        const albumName = tab.dataset.albumName;

        albumTabs.forEach((t) => {
          t.classList.remove("active", "bg-accent-primary", "text-white");
          t.classList.add("bg-gray-700", "text-gray-300");
        });

        tab.classList.add("active", "bg-accent-primary", "text-white");
        tab.classList.remove("bg-gray-700", "text-gray-300");

        siteMap.displaySingleAlbum(artistData, albumIndex);
        
      });
    });
  },

  renderAlbumSongs: (albumContainer, album, artistName) => {
    const songsContainer = albumContainer.querySelector(".songs-container");
    if (!songsContainer) {
      
      return;
    }

    songsContainer.innerHTML = "";

    if (!album.songs || album.songs.length === 0) {
      songsContainer.innerHTML = '<p class="text-gray-400 text-center py-4">No songs found in this album</p>';
      return;
    }

    album.songs.forEach((song, index) => {
      const songData = {
        ...song,
        artist: artistName,
        album: album.album,
        cover: utils.getAlbumImageUrl(album.album),
      };

      const songElement = create(
        render.track("row", {
          trackNumber: index + 1,
          title: song.title,
          duration: song.duration || "0:00",
          songData: songData,
        })
      );

      songsContainer.appendChild(songElement);
    });

    songsContainer.querySelectorAll(".song-item").forEach((songItem) => {
      songItem.addEventListener("click", (e) => {
        if (e.target.closest(".song-toolbar")) return;

        try {
          const songData = JSON.parse(songItem.dataset.song);
          player.playSong(songData);
          
        } catch (error) {
          
        }
      });

      songItem.querySelectorAll("[data-action]").forEach((actionBtn) => {
        actionBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const action = actionBtn.dataset.action;
          const songData = JSON.parse(songItem.dataset.song);

          siteMap.handleSongAction(action, songData);
        });
      });
    });

    
  },

  bindArtistPageEvents: (artistData) => {
    const playButton = document.querySelector(".artist-header .play");
    if (playButton) {
      playButton.addEventListener("click", () => {
        siteMap.playArtistSongs(artistData);
      });
    }

    const followButton = document.querySelector(".artist-header .follow");
    if (followButton) {
      const isFavorite = appState.favorites.has("artists", artistData.artist);
      followButton.textContent = isFavorite ? "Unfavorite" : "Favorite";
      followButton.classList.toggle(CLASSES.active, isFavorite);

      followButton.addEventListener("click", () => {
        const wasFavorite = appState.favorites.toggle("artists", artistData.artist);
        followButton.textContent = wasFavorite ? "Unfavorite" : "Favorite";
        followButton.classList.toggle(CLASSES.active, wasFavorite);
      });
    }

    document.addEventListener("click", (e) => {
      const playAlbumBtn = e.target.closest(".play-album");
      if (playAlbumBtn) {
        e.stopPropagation();

        const activeTab = document.querySelector(".album-tab.active");
        if (activeTab) {
          const albumIndex = parseInt(activeTab.dataset.albumIndex);
          const album = artistData.albums[albumIndex];
          if (album) {
            siteMap.playAlbumSongs(album, artistData.artist);
          }
        }
      }
    });
  },
};

const homePage = {
  initialize: () => {
    appState.homePageManagerInstance = {
      renderHomePage: homePage.render,
    };
  },

  render: () => {
    const dynamicContent = $byId(IDS.dynamicContent);
    if (!dynamicContent) return;

    dynamicContent.innerHTML = "";

    dynamicContent.innerHTML = `
      <div class="home-page-header text-center py-8 md:py-12">
        <h1 class="text-4xl md:text-5xl font-bold mb-6 gradient-text">Your Music Universe</h1>
        <p class="text-lg md:text-xl text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto">Discover your personal collection with an immersive listening experience</p>
      </div>
      
      <div class="bento-grid px-4 md:px-6 gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div class="bento-card col-span-full md:col-span-1">
          <div class="card-header">
            <h2 class="text-xl font-bold">Recently Played</h2>
            <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="recent">View All</a>
          </div>
          <div id="${IDS.recentlyPlayedSection}" class="card-content">
            <div class="skeleton-loader"></div>
          </div>
        </div>
        
        <div class="bento-card col-span-full md:col-span-2">
          <div class="card-header">
            <h2 class="text-xl font-bold">Discover Albums</h2>
            <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="albums">Explore More</a>
          </div>
          <div id="${IDS.randomAlbumsSection}" class="card-content">
            <div class="skeleton-loader"></div>
          </div>
        </div>
        
        <div class="bento-card col-span-full md:col-span-1">
          <div class="card-header">
            <h2 class="text-xl font-bold">Favorite Artists</h2>
            <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="favorite-artists">View All</a>
          </div>
          <div id="${IDS.favoriteArtistsSection}" class="card-content">
            <div class="skeleton-loader"></div>
          </div>
        </div>
        
        <div class="bento-card col-span-full md:col-span-1">
          <div class="card-header">
            <h2 class="text-xl font-bold">Your Playlists</h2>
            <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="playlists">View All</a>
          </div>
          <div id="${IDS.playlistsSection}" class="card-content">
            <div class="skeleton-loader"></div>
          </div>
        </div>
        
        <div class="bento-card col-span-full md:col-span-1">
          <div class="card-header">
            <h2 class="text-xl font-bold">Favorite Songs</h2>
            <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="favorite-songs">View All</a>
          </div>
          <div id="${IDS.favoriteSongsSection}" class="card-content">
            <div class="skeleton-loader"></div>
          </div>
        </div>
      </div>
    `;

    homePage.addStyles();

    setTimeout(() => homePage.renderRecentlyPlayed(), 100);
    setTimeout(() => homePage.renderRandomAlbums(), 300);
    setTimeout(() => homePage.renderFavoriteArtists(), 500);
    setTimeout(() => homePage.renderPlaylists(), 700);
    setTimeout(() => homePage.renderFavoriteSongs(), 900);

    homePage.bindEvents();
  },

  addStyles: () => {
    if ($byId("bento-grid-styles")) return;

    const styleEl = document.createElement("style");
    styleEl.id = "bento-grid-styles";
    styleEl.textContent = `
      .bento-grid {
        display: grid;
        gap: 1.5rem;
      }
      
      .bento-card {
        background: rgba(30, 41, 59, 0.5);
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .bento-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .card-content {
        min-height: 200px;
      }
      
      .skeleton-loader {
        height: 200px;
        background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 0.5rem;
      }
      
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      .recent-tracks, .album-grid, .artist-grid, .playlists-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      
      .recent-track, .playlist-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem;
        border-radius: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }
      
      .recent-track:hover, .playlist-card:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }
      
      .track-art, .artist-avatar {
        width: 40px;
        height: 40px;
        border-radius: 0.25rem;
        object-fit: cover;
        flex-shrink: 0;
      }
      
      .artist-avatar {
        border-radius: 50%;
      }
      
      .track-info, .playlist-info {
        flex: 1;
        min-width: 0;
      }
      
      .track-title, .playlist-name {
        font-weight: 500;
        margin-bottom: 0.125rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .track-artist, .playlist-tracks {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .track-artist:hover {
        color: rgba(255, 255, 255, 0.9);
        text-decoration: underline;
      }
      
      .album-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
      }
      
      .album-card {
        text-align: center;
        cursor: pointer;
        transition: transform 0.2s ease;
        position: relative;
      }
      
      .album-card:hover {
        transform: scale(1.05);
      }
      
      .album-cover {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 0.5rem;
        object-fit: cover;
        margin-bottom: 0.5rem;
        position: relative;
      }
      
      .album-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
      }
      
      .album-card:hover .album-overlay {
        opacity: 1;
      }
      
      .album-play-btn {
        width: 3rem;
        height: 3rem;
        background: rgba(59, 130, 246, 0.9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .album-play-btn:hover {
        transform: scale(1.1);
        background: rgba(59, 130, 246, 1);
      }
      
      .album-play-btn svg {
        width: 1.2rem;
        height: 1.2rem;
      }
      
      .album-info {
        font-size: 0.875rem;
      }
      
      .album-title {
        font-weight: 500;
        margin-bottom: 0.125rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .album-artist {
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .album-artist:hover {
        color: rgba(255, 255, 255, 0.9);
        text-decoration: underline;
      }
      
      .artist-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 1rem;
      }
      
      .artist-card {
        text-align: center;
        cursor: pointer;
        transition: transform 0.2s ease;
      }
      
      .artist-card:hover {
        transform: scale(1.05);
      }
      
      .artist-name {
        font-size: 0.875rem;
        font-weight: 500;
        margin-top: 0.5rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .create-playlist-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        background: rgba(59, 130, 246, 0.1);
        border: 1px dashed rgba(59, 130, 246, 0.3);
        color: rgb(59, 130, 246);
        cursor: pointer;
        transition: all 0.2s ease;
        width: 100%;
        margin-top: 0.5rem;
        text-align: center;
        justify-content: center;
      }
      
      .create-playlist-btn:hover {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.5);
        transform: translateY(-1px);
      }
      
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.875rem;
        text-align: center;
        padding: 2rem 1rem;
      }
      
      .empty-state svg {
        margin-bottom: 1rem;
        opacity: 0.6;
      }
      
      .play-button-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0;
        transition: opacity 0.2s ease;
        background: rgba(59, 130, 246, 0.9);
        border-radius: 50%;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      
      .recent-track:hover .play-button-overlay,
      .artist-card:hover .play-button-overlay {
        opacity: 1;
      }
      
      .animate-fade-in {
        animation: fadeIn 0.3s ease-in;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styleEl);
  },

  renderRecentlyPlayed: () => {
    const container = $byId(IDS.recentlyPlayedSection);
    if (!container) return;

    if (!appState.recentlyPlayed || appState.recentlyPlayed.length === 0) {
      container.innerHTML = homePage.renderEmptyState("No recently played tracks", "music-note");
      return;
    }

    const recentTracks = appState.recentlyPlayed.slice(0, 5);

    let html = `<div class="recent-tracks animate-fade-in">`;

    recentTracks.forEach((track, index) => {
      html += `
        <div class="recent-track" data-song='${JSON.stringify(track).replace(/"/g, "&quot;")}' style="animation-delay: ${index * 100}ms;">
          <img src="${utils.getAlbumImageUrl(track.album)}" alt="${track.title}" class="track-art">
          <div class="track-info">
            <div class="track-title">${track.title}</div>
            <div class="track-artist" data-artist="${track.artist}">${track.artist}</div>
          </div>
          <div class="play-button-overlay">
            ${ICONS.play}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll(".recent-track").forEach((track) => {
      track.addEventListener("click", (e) => {
        if (e.target.closest(".track-artist")) return;

        try {
          const songData = JSON.parse(track.dataset.song);
          player.playSong(songData);
        } catch (error) {
          
        }
      });
    });

    container.querySelectorAll(".track-artist").forEach((artistEl) => {
      artistEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistName = artistEl.dataset.artist;
        if (appState.siteMapInstance) {
          appState.siteMapInstance.navigateTo(ROUTES.ARTIST, {
            artist: artistName
          });
        }
      });
    });
  },

  renderRandomAlbums: () => {
    const container = $byId(IDS.randomAlbumsSection);
    if (!container) return;

    const albums = homePage.getRandomAlbums(6);

    if (!albums || albums.length === 0) {
      container.innerHTML = homePage.renderEmptyState("No albums found", "album");
      return;
    }

    let html = `<div class="album-grid animate-fade-in">`;

    albums.forEach((album, index) => {
      html += `
        <div class="album-card" style="animation-delay: ${index * 100}ms;" data-artist="${album.artist}" data-album="${album.album}">
          <div style="position: relative;">
            <img src="${utils.getAlbumImageUrl(album.album)}" alt="${album.album}" class="album-cover">
            <div class="album-overlay">
              <button class="album-play-btn" data-artist="${album.artist}" data-album="${album.album}">
                ${ICONS.play}
              </button>
            </div>
          </div>
          <div class="album-info">
            <div class="album-title">${album.album}</div>
            <div class="album-artist" data-artist="${album.artist}">${album.artist}</div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll(".album-play-btn").forEach((playBtn) => {
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistName = playBtn.dataset.artist;
        const albumName = playBtn.dataset.album;
        homePage.playAlbum(artistName, albumName);
      });
    });

    container.querySelectorAll(".album-card").forEach((albumCard) => {
      albumCard.addEventListener("click", (e) => {
        if (e.target.closest(".album-play-btn") || e.target.closest(".album-artist")) return;

        const artistName = albumCard.dataset.artist;
        const albumName = albumCard.dataset.album;
        homePage.playAlbum(artistName, albumName);
      });
    });

    container.querySelectorAll(".album-artist").forEach((artistEl) => {
      artistEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistName = artistEl.dataset.artist;
        if (appState.siteMapInstance) {
          appState.siteMapInstance.navigateTo(ROUTES.ARTIST, {
            artist: artistName
          });
        }
      });
    });
  },

  renderFavoriteArtists: () => {
    const container = $byId(IDS.favoriteArtistsSection);
    if (!container) return;

    if (!appState.favorites.artists || appState.favorites.artists.size === 0) {
      container.innerHTML = homePage.renderEmptyState("No favorite artists", "artist");
      return;
    }

    const artists = Array.from(appState.favorites.artists).slice(0, 6);

    let html = `<div class="artist-grid animate-fade-in">`;

    artists.forEach((artistName, index) => {
      const artistData = window.music?.find((a) => a.artist === artistName);
      if (!artistData) return;

      html += `
        <div class="artist-card" data-artist="${artistName}" style="animation-delay: ${index * 100}ms;">
          <div style="position: relative;">
            <img src="${utils.getArtistImageUrl(artistName)}" alt="${artistName}" class="artist-avatar">
            <div class="play-button-overlay">
              ${ICONS.play}
            </div>
          </div>
          <div class="artist-name">${artistName}</div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll(".artist-card").forEach((artistEl) => {
      artistEl.addEventListener("click", () => {
        const artistName = artistEl.dataset.artist;
        if (appState.siteMapInstance) {
          appState.siteMapInstance.navigateTo(ROUTES.ARTIST, {
            artist: artistName
          });
        }
      });
    });
  },

  renderPlaylists: () => {
    const container = $byId(IDS.playlistsSection);
    if (!container) return;

    let html = "";

    if (!appState.playlists || appState.playlists.length === 0) {
      html = homePage.renderEmptyState("No playlists yet", "playlist");
    } else {
      html = `<div class="playlists-list animate-fade-in">`;

      const displayPlaylists = appState.playlists.slice(0, 3);

      displayPlaylists.forEach((playlist, index) => {
        html += `
          <div class="playlist-card" data-playlist-id="${playlist.id}" style="animation-delay: ${index * 100}ms;">
            <div class="playlist-icon" style="width: 40px; height: 40px; background: linear-gradient(45deg, #6366f1, #8b5cf6); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v2H3v-2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
            </div>
            <div class="playlist-info">
              <div class="playlist-name">${playlist.name}</div>
              <div class="playlist-tracks">${playlist.songs?.length || 0} track${playlist.songs?.length !== 1 ? "s" : ""}</div>
            </div>
            <div class="play-button-overlay">
              ${ICONS.play}
            </div>
          </div>
        `;
      });

      html += `</div>`;
    }

    html += `
      <button class="create-playlist-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        Create Playlist
      </button>
    `;

    container.innerHTML = html;

    container.querySelectorAll(".playlist-card").forEach((playlistEl) => {
      playlistEl.addEventListener("click", () => {
        const playlistId = playlistEl.dataset.playlistId;
        playlists.show(playlistId);
      });
    });

    const createBtn = container.querySelector(".create-playlist-btn");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        const newPlaylist = playlists.create();
        if (newPlaylist) {
          setTimeout(() => homePage.renderPlaylists(), 100);
        }
      });
    }
  },

  renderFavoriteSongs: () => {
    const container = $byId(IDS.favoriteSongsSection);
    if (!container) return;

    if (!appState.favorites.songs || appState.favorites.songs.size === 0) {
      container.innerHTML = homePage.renderEmptyState("No favorite songs", "heart");
      return;
    }

    const songs = homePage.getSongsByIds(Array.from(appState.favorites.songs).slice(0, 5));

    let html = `<div class="recent-tracks animate-fade-in">`;

    songs.forEach((song, index) => {
      html += `
        <div class="recent-track" data-song='${JSON.stringify(song).replace(/"/g, "&quot;")}' style="animation-delay: ${index * 100}ms;">
          <img src="${utils.getAlbumImageUrl(song.album)}" alt="${song.title}" class="track-art">
          <div class="track-info">
            <div class="track-title">${song.title}</div>
            <div class="track-artist" data-artist="${song.artist}">${song.artist}</div>
          </div>
          <div class="play-button-overlay">
            ${ICONS.play}
          </div>
          <button class="favorite-heart" data-song-id="${song.id}" style="position: absolute; top: 0.5rem; right: 0.5rem; color: #ef4444; opacity: 0.8; background: none; border: none; cursor: pointer;">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll(".recent-track").forEach((track) => {
      track.addEventListener("click", (e) => {
        if (e.target.closest(".track-artist") || e.target.closest(".favorite-heart")) return;

        try {
          const songData = JSON.parse(track.dataset.song);
          player.playSong(songData);
        } catch (error) {
          
        }
      });
    });

    container.querySelectorAll(".track-artist").forEach((artistEl) => {
      artistEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const artistName = artistEl.dataset.artist;
        if (appState.siteMapInstance) {
          appState.siteMapInstance.navigateTo(ROUTES.ARTIST, {
            artist: artistName
          });
        }
      });
    });

    container.querySelectorAll(".favorite-heart").forEach((heartBtn) => {
      heartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const songId = heartBtn.dataset.songId;
        appState.favorites.remove("songs", songId);

        const track = heartBtn.closest(".recent-track");
        track.style.transition = "all 0.3s ease";
        track.style.opacity = "0";
        track.style.transform = "translateX(-20px)";

        setTimeout(() => {
          track.remove();
          const remaining = container.querySelectorAll(".recent-track");
          if (remaining.length === 0) {
            homePage.renderFavoriteSongs();
          }
        }, 300);
      });
    });
  },

  bindEvents: () => {
    document.querySelectorAll("[data-view]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = link.dataset.view;

        switch (view) {
          case "recent":
            popup.open();
            setTimeout(() => popup.switchTab("recent"), 50);
            break;
          case "albums":
            notifications.show("Albums view coming soon");
            break;
          case "favorite-artists":
            views.showFavoriteArtists();
            break;
          case "playlists":
            playlists.showAll();
            break;
          case "favorite-songs":
            views.showFavoriteSongs();
            break;
          default:
            notifications.show("View coming soon");
        }
      });
    });
  },

  getRandomAlbums: (count = 6) => {
    if (!window.music) return [];

    const allAlbums = [];
    window.music.forEach((artist) => {
      artist.albums.forEach((album) => {
        allAlbums.push({
          artist: artist.artist,
          album: album.album,
          cover: utils.getAlbumImageUrl(album.album),
          songs: album.songs,
        });
      });
    });

    const shuffled = [...allAlbums].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  getSongsByIds: (ids) => {
    if (!window.music || !ids.length) return [];

    const songs = [];

    window.music.forEach((artist) => {
      artist.albums.forEach((album) => {
        album.songs.forEach((song) => {
          if (ids.includes(song.id)) {
            songs.push({
              ...song,
              artist: artist.artist,
              album: album.album,
              cover: utils.getAlbumImageUrl(album.album),
            });
          }
        });
      });
    });

    return songs;
  },

  playAlbum: (artistName, albumName) => {
    if (!window.music) return;

    const artist = window.music.find((a) => a.artist === artistName);
    if (!artist) return;

    const album = artist.albums.find((a) => a.album === albumName);
    if (!album || album.songs.length === 0) return;

    appState.queue.clear();

    album.songs.slice(1).forEach((song) => {
      appState.queue.add({
        ...song,
        artist: artistName,
        album: albumName,
        cover: utils.getAlbumImageUrl(albumName),
      });
    });

    player.playSong({
      ...album.songs[0],
      artist: artistName,
      album: albumName,
      cover: utils.getAlbumImageUrl(albumName),
    });

    notifications.show(`Playing album "${albumName}"`, NOTIFICATION_TYPES.SUCCESS);
  },

  renderEmptyState: (message, iconType) => {
    const icons = {
      "music-note": '<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>',
      album: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>',
      artist: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
      playlist: '<path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>',
      heart: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
    };

    return `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 mb-3 opacity-50">
          ${icons[iconType] || icons["music-note"]}
        </svg>
        <p>${message}</p>
      </div>
    `;
  },
};

const app = {
  initialize: () => {
    

    window.music = music;

    storage.initialize(); // Load saved data first
    theme.initialize(); // Apply saved theme
    notifications.initialize(); // Set up notification system
    player.initialize(); // Initialize audio player

    siteMap.initialize(); // Set up navigation system
    homePage.initialize(); // Set up home page manager

    eventHandlers.init();

    app.resetUI();
    app.syncGlobalState();

    
  },

  resetUI: () => {
    const nowPlayingArea = $byId(IDS.nowPlayingArea);
    if (nowPlayingArea) {
      nowPlayingArea.classList.remove(CLASSES.hasSong);
    }
    ui.updateCounts();
  },

  syncGlobalState: () => {
    window.appState = appState;
    window.playerController = {
      playSong: player.playSong,
      toggle: player.toggle,
      next: controls.next,
      previous: controls.previous,
      seekTo: controls.seekTo,
      skip: controls.skip(),
    };
    window.musicAppAPI = {
      player,
      controls,
      ui,
      popup,
      dropdown,
      theme,
      notifications,
      playlists,
      utils,
      favorites: appState.favorites,
      queue: appState.queue,
      views,
      siteMap,
      homePage,
    };
  },

  goHome: () => {
    if (appState.siteMapInstance) {
      appState.siteMapInstance.navigateTo(ROUTES.HOME);
    }
  },
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
  
  if (musicPlayer) {
    
    
  }

  const nowPlayingArea = $byId(IDS.nowPlayingArea);
  
  if (nowPlayingArea) {
    
  }

  const navbarAlbumCover = $byId(IDS.navbarAlbumCover);
  
  if (navbarAlbumCover) {
    
  }

  
  
};
