// File: user-backend/utils/jwt.utils.js

const jwt = require('jsonwebtoken');
const JWT_SIGN_SECRET = process.env.JWT_SIGN_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const EXPIRE_SESSION = process.env.EXPIRE_SESSION;
const EXPIRE_EXTEND_SESSION = process.env.EXPIRE_EXTEND_SESSION;

module.exports = {
  generateTokenForUser: function (userData) {
    return jwt.sign({
        userId: userData.id,
        // MariaDB/Sequelize peut exposer TINYINT comme 0/1 ; le middleware attend un booléen JWT.
        isAdmin: Boolean(userData.isAdmin),
      },
      JWT_SIGN_SECRET, {
        expiresIn: EXPIRE_SESSION
      })
  },
  generateExtendSessionToken: function (userData) {
    return jwt.sign({
        userId: userData.id,
        isAdmin: Boolean(userData.isAdmin),
      },
      JWT_SIGN_SECRET, {
        expiresIn: EXPIRE_EXTEND_SESSION
      }
    );
  },

  parseAuthorization: function (authorization) {
    return (authorization != null) ? authorization.replace('Bearer ', '') : null;
  },
  getUserId: function (authorization) {
    let userId = -1;
    const token = module.exports.parseAuthorization(authorization);
    if (token != null) {
      try {
        const jwtToken = jwt.verify(token, JWT_SIGN_SECRET);
        if (jwtToken != null)
          userId = jwtToken.userId;
      } catch (err) {}
    }
    return userId;
  },
  generateRefreshTokenForUser: function (userData) {
    return jwt.sign({
      userId: userData.id
    }, JWT_REFRESH_SECRET, {
      expiresIn: '7d'
    });
  },

  verifyRefreshToken: function (token) {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (err) {
      return null;
    }
  },
  verifyAccessToken: function (token) {
    try {
      return jwt.verify(token, JWT_SIGN_SECRET);
    } catch (err) {
      return null;
    }
  },
  decodeToken: function (token) {
    // const token = module.exports.parseAuthorization(authorization);
    if (token != null) {
      try {
        return jwt.verify(token, JWT_SIGN_SECRET); // renvoie { userId, isAdmin }
      } catch (err) {
        return null;
      }
    }
    return null;
  }
};