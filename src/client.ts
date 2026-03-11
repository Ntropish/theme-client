import type { Preferences, Theme, ThemeClientOptions, ThemePalette } from './types';

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
const PROFILE_KEY = 'trivorn_profile_id';

export class ThemeClient {
  private options: ThemeClientOptions;
  private theme: Theme | null = null;
  private preferences: Preferences | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private listener: ((e: MediaQueryListEvent) => void) | null = null;
  private appliedVars: string[] = [];

  constructor(options: ThemeClientOptions) {
    this.options = options;
    // If profileId provided in options, persist it to localStorage
    if (options.profileId) {
      try {
        localStorage.setItem(PROFILE_KEY, options.profileId);
      } catch {
        // Ignore storage errors
      }
    }
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
      const profileId = this.getProfileId();
      const url = profileId
        ? `${this.options.authCoreUrl}/api/preferences?profile_id=${encodeURIComponent(profileId)}`
        : `${this.options.authCoreUrl}/api/preferences`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch preferences: ${res.status} ${res.statusText}`);
      }
      const data = await res.json() as Preferences;
      this.preferences = data;
      this.theme = data.theme;

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

  async setProfile(profileId: string): Promise<void> {
    try {
      localStorage.setItem(PROFILE_KEY, profileId);
    } catch {
      // Ignore storage errors
    }
    await this.apply();
  }

  getProfileId(): string | null {
    try {
      return this.options.profileId ?? localStorage.getItem(PROFILE_KEY);
    } catch {
      return this.options.profileId ?? null;
    }
  }

  getPreferences(): Preferences | null {
    return this.preferences;
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
    this.preferences = null;
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
