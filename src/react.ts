import { useSyncExternalStore } from 'react';
import type { ThemeClient } from './client';
import type { Preferences } from './types';

let defaultClient: ThemeClient | null = null;

/**
 * Register the singleton ThemeClient so hooks can find it without prop drilling.
 * Apps typically call this once, alongside the ThemeClient construction.
 */
export function setDefaultThemeClient(client: ThemeClient): void {
  defaultClient = client;
}

function resolveClient(client: ThemeClient | undefined): ThemeClient {
  const c = client ?? defaultClient;
  if (!c) {
    throw new Error(
      '@trivorn/theme-client/react: no ThemeClient available. Call setDefaultThemeClient() or pass a client.'
    );
  }
  return c;
}

/**
 * Subscribe a component to the ThemeClient's Preferences. Re-renders on
 * apply() / setProfile() updates. Returns null until the first fetch resolves.
 */
export function usePreferences(client?: ThemeClient): Preferences | null {
  const c = resolveClient(client);
  return useSyncExternalStore(
    (cb) => c.subscribe(cb),
    () => c.getPreferences(),
    () => null
  );
}

/**
 * Convenience hook for the nav-shell portrait position. Defaults to 'bottom'
 * while preferences are loading or if nav_position is unset.
 */
export function useNavPosition(client?: ThemeClient): 'top' | 'bottom' {
  const prefs = usePreferences(client);
  return prefs?.nav_position === 'top' ? 'top' : 'bottom';
}

/**
 * Returns [currentProfileId, setProfile]. setProfile updates localStorage and
 * triggers a re-fetch via themeClient.apply().
 */
export function useProfileId(
  client?: ThemeClient
): [string | null, (id: string) => Promise<void>] {
  const c = resolveClient(client);
  const prefs = usePreferences(client);
  const current = prefs?.profile_id ?? c.getProfileId();
  return [current, (id: string) => c.setProfile(id)];
}
