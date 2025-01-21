/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import './App.css';

interface User {
  id: number;
  google_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthResponse {
  authenticated: boolean;
  user: User;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3003/api/auth/verify', {
      credentials: 'include'
    })
      .then(res => {
        if (res.ok) return res.json() as Promise<AuthResponse>;
        throw new Error('Not authenticated');
      })
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="container">
        <h1>Welcome to AI Feed Consolidator</h1>
        <p>Please log in to continue</p>
        <a href="/auth/google" className="login-button">
          Sign in with Google
        </a>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Welcome, {user.display_name || 'User'}!</h1>
      {user.avatar_url && (
        <img src={user.avatar_url} alt="Profile" className="profile-image" />
      )}
      <p>Email: {user.email}</p>
      <a href="/auth/logout" className="logout-button">
        Logout
      </a>
    </div>
  );
}

export default App;
