/** API de public/js/theme.js (copia sin modificar del sistema común de taridepaco). */
type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeApi {
  mode(): ThemeMode;
  isDark(): boolean;
  set(mode: ThemeMode): void;
  cycle(): void;
  onChange(fn: (mode: ThemeMode, isDark: boolean) => void): void;
}

interface Window {
  Theme?: ThemeApi;
}
