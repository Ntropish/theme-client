export interface ThemePalette {
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  surfaceHovered: string;
  onSurface: string;
  onSurfaceMuted: string;
  onPrimary: string;
  primary: string;
  primaryHover: string;
  danger: string;
  dangerHover: string;
  border: string;
  borderFocus: string;
  inputBg: string;
  shadowColor: string; // hex:alpha format
}

export interface Theme {
  id: string;
  name: string;
  light: ThemePalette;
  dark: ThemePalette;
}

export interface Preferences {
  profile_id: string;
  name: string;
  theme_id: string;
  nav_position: string;
  theme: Theme;
}

export interface ThemeClientOptions {
  authCoreUrl: string;
  getAccessToken: () => string | Promise<string>;
  profileId?: string;
  /**
   * Request credentials mode for the preferences fetch. Defaults to the
   * browser's fetch default ("same-origin"). Set to "include" for
   * cross-origin cookie auth; leave undefined when using Bearer tokens.
   */
  credentials?: RequestCredentials;
}
