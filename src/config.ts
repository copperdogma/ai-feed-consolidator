interface Config {
  readonly serverUrl: string;
  readonly auth: {
    readonly googleAuthPath: string;
    readonly googleCallbackPath: string;
    readonly logoutPath: string;
    readonly feedlyAuthPath: string;
    readonly feedlyCallbackPath: string;
  };
  readonly api: {
    readonly toggleSavedPath: string;
  };
}

export const config: Config = {
  serverUrl: 'http://localhost:3003',
  auth: {
    googleAuthPath: '/api/auth/google',
    googleCallbackPath: '/api/auth/google/callback',
    logoutPath: '/api/auth/logout',
    feedlyAuthPath: '/api/auth/feedly',
    feedlyCallbackPath: '/api/auth/feedly/callback'
  },
  api: {
    toggleSavedPath: '/api/feed/items/:id/toggle-saved'
  }
};

export default config; 