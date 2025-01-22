import { Router } from 'express';

const router = Router();

router.get('/verify', (req, res) => {
  if (req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.status(401).json({
      authenticated: false,
      user: null
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      res.status(500).json({ error: 'Failed to logout' });
    } else {
      res.json({ success: true });
    }
  });
});

export default router; 