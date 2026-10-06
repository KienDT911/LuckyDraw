// Bundled locally so the app and its exports work offline. Only the Latin + Vietnamese
// subsets are loaded: fewer @font-face rules keeps PNG/PDF export fast.
import '@fontsource/be-vietnam-pro/latin-300.css';
import '@fontsource/be-vietnam-pro/vietnamese-300.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/latin-800.css';
import '@fontsource/be-vietnam-pro/vietnamese-800.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/vietnamese-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/vietnamese-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/vietnamese-700.css';
import '@fontsource/montserrat/latin-800.css';
import '@fontsource/montserrat/vietnamese-800.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/vietnamese-500.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/playfair-display/vietnamese-700.css';
import '@fontsource/playfair-display/latin-500-italic.css';
import '@fontsource/playfair-display/vietnamese-500-italic.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/vietnamese-500.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/vietnamese-700.css';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/vietnamese-600.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-2/vietnamese-800.css';
import '@fontsource/dancing-script/latin-700.css';
import '@fontsource/dancing-script/vietnamese-700.css';

export const FONTS = [
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: "'Cormorant Garamond', serif", label: 'Cormorant Garamond' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Be Vietnam Pro', sans-serif", label: 'Be Vietnam Pro' },
  { value: "'Baloo 2', sans-serif", label: 'Baloo 2' },
  { value: "'Dancing Script', cursive", label: 'Dancing Script' },
] as const;

export const SERIF_FONT = FONTS[0].value;
export const CLASSIC_SERIF_FONT = FONTS[1].value;
export const SANS_FONT = FONTS[2].value;
export const UI_FONT = FONTS[3].value;
export const ROUNDED_FONT = FONTS[4].value;
export const SCRIPT_FONT = FONTS[5].value;
