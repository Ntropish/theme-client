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

export interface ThemeClientOptions {
  authCoreUrl: string;
  getAccessToken: () => string | Promise<string>;
}
