import { useEffect, useState } from 'react';
import './App.css';

interface User {
  id?: string;
  displayName?: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3003/api/user', {
      credentials: 'include'
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(userData => setUser(userData))
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
      <h1>Welcome, {user.displayName}!</h1>
      {user.photos?.[0]?.value && (
        <img src={user.photos[0].value} alt="Profile" className="profile-image" />
      )}
      <p>Email: {user.emails?.[0]?.value}</p>
      <a href="/auth/logout" className="logout-button">
        Logout
      </a>
    </div>
  );
}

export default App;
