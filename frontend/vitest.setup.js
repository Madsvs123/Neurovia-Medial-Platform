import '@testing-library/jest-dom';
import './src/lib/i18n';

// jsdom doesn't implement scrollIntoView / matchMedia
if (typeof window !== 'undefined') {
  if (!window.HTMLElement.prototype.scrollIntoView) window.HTMLElement.prototype.scrollIntoView = () => {};
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    });
  }
}
