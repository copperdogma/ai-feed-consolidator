interface Config {
  readonly serverUrl: string;
  readonly auth: {
    readonly googleAuthPath: string;
    readonly googleCallbackPath: string;
    readonly logoutPath: string;
    readonly verifyPath: string;
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
    verifyPath: '/api/auth/verify'
  },
  api: {
    toggleSavedPath: '/api/feed/items/:id/toggle-saved'
  }
};

export default config; 