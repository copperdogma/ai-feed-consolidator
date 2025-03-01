interface Config {
  readonly serverUrl: string;
  readonly auth: {
    readonly firebaseAuthPath: string;
    readonly firebaseCallbackPath: string;
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
    firebaseAuthPath: '/api/auth/firebase',
    firebaseCallbackPath: '/api/auth/firebase/callback',
    logoutPath: '/api/auth/logout',
    verifyPath: '/api/auth/verify'
  },
  api: {
    toggleSavedPath: '/api/feed/items/:id/toggle-saved'
  }
};

export default config; 