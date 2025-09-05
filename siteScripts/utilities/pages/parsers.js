export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getAlbumImageUrl(albumName) {
  if (!albumName) return getDefaultAlbumImage();
  return `https://koders.cloud/global/content/images/albumCovers/${albumName.toLowerCase().replace(/\s+/g, '')}.png`;
}

export function getArtistImageUrl(artistName) {
  if (!artistName) return getDefaultArtistImage();
  let normalizedName = normalizeNameForUrl(artistName);
  return `https://koders.cloud/global/content/images/artistPortraits/${normalizedName}.png`;
}

export function getDefaultArtistImage() {
  return 'https://koders.cloud/global/content/images/artistPortraits/default-artist.png';
}

export function getDefaultAlbumImage() {
  return 'https://koders.cloud/global/content/images/albumCovers/default-album.png';
}

export function normalizeNameForUrl(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeForUrl(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '');
}

export function loadImageWithFallback(imgElement, primaryUrl, fallbackUrl, type = 'image') {
  if (!imgElement) return;

  let testImage = new Image();
  
  testImage.onload = function() {
    imgElement.src = primaryUrl;
    imgElement.classList.remove('image-loading', 'image-error');
    imgElement.classList.add('image-loaded');
  };
  
  testImage.onerror = function() {
    let fallbackImage = new Image();
    
    fallbackImage.onload = function() {
      imgElement.src = fallbackUrl;
      imgElement.classList.remove('image-loading');
      imgElement.classList.add('image-loaded', 'image-fallback');
    };
    
    fallbackImage.onerror = function() {
      imgElement.classList.remove('image-loading');
      imgElement.classList.add('image-error');
      imgElement.src = generatePlaceholderImage(type);
    };
    
    fallbackImage.src = fallbackUrl;
  };
  
  imgElement.classList.add('image-loading');
  imgElement.classList.remove('image-loaded', 'image-error', 'image-fallback');
  testImage.src = primaryUrl;
}

export function generatePlaceholderImage(type) {
  let isArtist = type === 'artist';
  let bgColor = isArtist ? '#4F46E5' : '#059669';
  let icon = isArtist ? 
    '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>' :
    '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>';
  
  let svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="${bgColor}"/>
    <svg x="75" y="75" width="50" height="50" viewBox="0 0 24 24" fill="white">
      ${icon}
    </svg>
  </svg>`;
  
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

export function getTotalSongs(artist) {
  return artist.albums.reduce((total, album) => total + album.songs.length, 0);
}

export function parseDuration(durationStr) {
  if (typeof durationStr !== "string") return 0;
  let parts = durationStr.split(":").map(Number);
  return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts[0] * 60 + parts[1] : 0;
}

export function createElementFromHTML(htmlString) {
  let div = document.createElement("div");
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}
