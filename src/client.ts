import type { Theme, ThemeClientOptions, ThemePalette } from './types';

function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}

function hexAlphaToHsla(value: string): string {
  const [hex, alpha] = value.split(':');
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${alpha})`;
}

const CACHE_KEY = 'trivorn-theme-cache';

export class ThemeClient {
  private options: ThemeClientOptions;
  private theme: Theme | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private listener: ((e: MediaQueryListEvent) => void) | null = null;
  private appliedVars: string[] = [];

  constructor(options: ThemeClientOptions) {
    this.options = options;
  }

  async apply(): Promise<void> {
    // Apply cached theme immediately before network fetch
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { light, dark } = JSON.parse(cached) as { light: ThemePalette; dark: ThemePalette };
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const palette = this.mediaQuery.matches ? dark : light;
        this.applyPalette(palette);
      }
    } catch {
      // Ignore corrupt/missing cache
    }

    try {
      const token = await this.options.getAccessToken();
      const res = await fetch(`${this.options.authCoreUrl}/api/themes/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch theme: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      this.theme = data.theme as Theme;

      // Cache the fetched theme
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ light: this.theme.light, dark: this.theme.dark }));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    } catch {
      // If fetch fails (no token, network error), keep the cached theme already applied above
      return;
    }

    if (!this.mediaQuery) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }
    const palette = this.mediaQuery.matches ? this.theme.dark : this.theme.light;
    this.applyPalette(palette);

    // Clean up previous listener before adding a new one
    if (this.listener) {
      this.mediaQuery.removeEventListener('change', this.listener);
    }
    this.listener = (e: MediaQueryListEvent) => {
      if (!this.theme) return;
      const p = e.matches ? this.theme.dark : this.theme.light;
      this.applyPalette(p);
    };
    this.mediaQuery.addEventListener('change', this.listener);
  }

  destroy(): void {
    if (this.mediaQuery && this.listener) {
      this.mediaQuery.removeEventListener('change', this.listener);
      this.mediaQuery = null;
      this.listener = null;
    }
    for (const varName of this.appliedVars) {
      document.documentElement.style.removeProperty(varName);
    }
    this.appliedVars = [];
    this.theme = null;
  }

  private applyPalette(palette: ThemePalette): void {
    const newVars = new Set<string>();

    for (const [key, value] of Object.entries(palette)) {
      const varName = `--${toKebabCase(key)}`;
      const cssValue = key === 'shadowColor' ? hexAlphaToHsla(value) : value;
      document.documentElement.style.setProperty(varName, cssValue);
      newVars.add(varName);
    }

    // Only remove vars that were in old set but not new set
    for (const varName of this.appliedVars) {
      if (!newVars.has(varName)) {
        document.documentElement.style.removeProperty(varName);
      }
    }

    this.appliedVars = [...newVars];
  }
}
