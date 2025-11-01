import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

export const requireAuth = ClerkExpressRequireAuth({
  // Optional configuration
  onError: (err, req, res) => {
    console.error('Auth error:', err);
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  },
});

// Add a middleware to extract user information
export const extractUser = (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({
      success: false,
      message: 'No authentication data'
    });
  }

  // Add user info to request
  req.user = { _id: req.auth.userId };
  next();
};
