// File: backend/middleware/isAdminMiddleware.js

module.exports = (req, res, next) => {
  const admin =
    req.user && (req.user.isAdmin === true || req.user.isAdmin === 1);
  if (admin) {
    next(); // ✅ L'utilisateur est admin, on continue
  } else {
    console.warn(`[ADMIN] Accès refusé pour userId=${req.user?.userId || 'inconnu'} depuis ${req.ip}`);
    return res.status(403).json({ error: 'Accès interdit : administrateur requis' });
  }
};
