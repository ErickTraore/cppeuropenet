// File: user-backend/apiRouter.js

const express = require('express');
const cors = require('cors');
const usersCtrl = require('./routes/usersCtrl');
const authMiddleware = require('./middleware/authMiddleware');
const sessionCtrl = require('./routes/sessionCtrl');
const profileCtrl = require('./routes/infoProfileCtrl');
const refreshAuthMiddleware = require('./middleware/refreshAuthMiddleware');
const isAdminMiddleware = require('./middleware/isAdminMiddleware');
const infoProfileCtrl = require('./routes/infoProfileCtrl');

exports.router = (function () {
    const apiRouter = express.Router();

    // ✅ Gérer la requête préflight OPTIONS pour /users/login/ et /users/login
    apiRouter.options('/users/login/', cors());
    apiRouter.options('/users/login', cors());

    // Accepter /users/register et /users/register/
    apiRouter.route(['/users/register', '/users/register/']).post(usersCtrl.register);
    apiRouter.route(['/users/login', '/users/login/']).post(usersCtrl.login);
    // Jamais en production (NODE_ENV peut être absent en local → on autorise sauf prod explicite).
    if (process.env.NODE_ENV !== 'production') {
        apiRouter.delete('/users/e2e-dev-seed/:email', usersCtrl.deleteE2eDevUser);
    }
    apiRouter.route('/users/all/').get(authMiddleware, isAdminMiddleware, usersCtrl.getUserAll);
    apiRouter.route('/users/me/').get(authMiddleware, usersCtrl.getUserProfile);
    apiRouter.route('/users/me/').put(authMiddleware, usersCtrl.updateUserProfile);
    apiRouter.route('/users/refresh-token/').post(usersCtrl.refreshToken);
    apiRouter.route('/users/extend-session').post(refreshAuthMiddleware, usersCtrl.extendSession);
    apiRouter.route('/users/:id').delete(authMiddleware, isAdminMiddleware, usersCtrl.deleteUser);
    apiRouter.route('/users/:id').put(authMiddleware, isAdminMiddleware, usersCtrl.updateUserById);
    
    apiRouter.route('/users/infoProfile/user').get(authMiddleware, infoProfileCtrl.getInfoProfile);
    apiRouter.route('/users/infoProfile/:id').put(authMiddleware, infoProfileCtrl.updateInfoProfile);
    apiRouter.route('/users/infoProfile/').post(authMiddleware, infoProfileCtrl.createInfoProfile);
    apiRouter.route('/users/infoProfile/:id').delete(authMiddleware, isAdminMiddleware, infoProfileCtrl.deleteInfoProfile);

    return apiRouter;
})();
