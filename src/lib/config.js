var API_BASE = '';

if (typeof window !== 'undefined' && window.location.protocol === 'capacitor:') {
  API_BASE = 'https://sales-dojo-mobile.vercel.app';
} else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  API_BASE = '';
} else {
  API_BASE = '';
}

export function apiUrl(path) {
  return API_BASE + path;
}
