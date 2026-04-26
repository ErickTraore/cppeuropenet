// File = lespremices/user-backend/routes/usersCtrl.js
// Définition des fonctions pour les routes relatives aux utilisateurs 

require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwtUtils = require('../utils/jwt.utils');
const models = require('../models');
const asyncLib = require('async');
const MEDIA_API = process.env.REACT_APP_MEDIA_API;
const MEDIA_API_CONTABO = process.env.MEDIA_API_CONTABO || process.env.REACT_APP_MEDIA_API;
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const PASSWORD_REGEX = /^(?=.*\d).{4,20}$/;
const {
    User
} = require('../models'); // ou ton ORM


module.exports = {
    register: function (req, res) {
        console.log("📩 [BACKEND] Requête reçue sur /users/register :", req.body);

        const email = req.body.email;
        const password = req.body.password;
        const bio = req.body.bio;
        let isAdmin = false;
        if (typeof req.body.isAdmin === 'boolean') {
            isAdmin = req.body.isAdmin;
        } else if (req.body.role === 'admin') {
            isAdmin = true;
        } else if (req.body.role === 'user') {
            isAdmin = false;
        }

        if (email === '' || password === '') {
            console.warn("⚠️ [BACKEND] Paramètres manquants :", { email, password });
            return res.status(400).json({ error: 'Paramètres manquants' });
        }
        if (!EMAIL_REGEX.test(email)) {
            console.warn("⚠️ [BACKEND] Email invalide :", email);
            return res.status(400).json({ error: 'Adresse e-mail invalide' });
        }
        if (!PASSWORD_REGEX.test(password)) {
            console.warn("⚠️ [BACKEND] Mot de passe invalide (regex non respectée)");
            return res.status(400).json({ error: 'Mot de passe invalide' });
        }
        asyncLib.waterfall([
            function (done) {
                models.User.findOne({ attributes: ['email'], where: { email } })
                    .then(userFound => {
                        console.log("🔎 [BACKEND] Vérification utilisateur existant :", userFound ? userFound.email : "aucun");
                        done(null, userFound);
                    })
                    .catch(err => {
                        console.error("❌ [BACKEND] Erreur vérification utilisateur :", err.message);
                        res.status(500).json({ error: "Impossible de vérifier l'utilisateur" });
                    });
            },
            function (userFound, done) {
                if (!userFound) {
                    bcrypt.hash(password, 5, (err, bcryptedPassword) => {
                        console.log("🔐 [BACKEND] Mot de passe haché généré");
                        done(null, userFound, bcryptedPassword);
                    });
                } else {
                    console.warn("⚠️ [BACKEND] Utilisateur déjà existant :", email);
                    return res.status(409).json({ error: "L'utilisateur existe déjà" });
                }
            },
            function (userFound, bcryptedPassword, done) {
                models.User.create({
                    email,
                    password: bcryptedPassword,
                    bio,
                    isAdmin
                }).then(newUser => {
                    console.log("✅ [BACKEND] Nouvel utilisateur créé :", newUser.id, newUser.email);
                    done(null, newUser);
                }).catch(err => {
                    console.error("❌ [BACKEND] Erreur création utilisateur :", err.message);
                    res.status(500).json({ error: "Impossible d'ajouter l'utilisateur" });
                });
            },
            function (newUser, done) {
                models.Profile.create({
                    userId: newUser.id,
                    email: newUser.email,
                    lastName: null,
                    firstName: null,
                    phone1: null,
                    phone2: null,
                    phone3: null,
                    address: null
                }).then(profile => {
                    console.log("✅ [BACKEND] Profil créé pour utilisateur :", newUser.id);
                    done(null, newUser, profile);
                }).catch(err => {
                    console.error("❌ [BACKEND] Erreur création profil :", err.message);
                    return res.status(500).json({ error: "01-Profil créé mais échec création des médias" });
                });
            },
            function (newUser, profile, done) {
                console.log("📤 [BACKEND] Initialisation des médias par défaut pour profil :", profile.id, "→ Contabo", MEDIA_API_CONTABO);
                const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

                const defaultPaths = [
                    '/mediaprofile/default/slot-0.png',
                    '/mediaprofile/default/slot-1.png',
                    '/mediaprofile/default/slot-2.png',
                    '/mediaprofile/default/slot-3.png'
                ];

                const baseUrl = MEDIA_API_CONTABO || MEDIA_API;
                const createOne = (slot) =>
                    fetch(`${baseUrl}/mediaProfile/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            profileId: profile.id,
                            filename: '',
                            path: defaultPaths[slot],
                            type: '',
                            slot
                        })
                    }).then((r) => r.json().then((body) => ({ status: r.status, ok: r.ok, body })));

                Promise.all([createOne(0), createOne(1), createOne(2), createOne(3)])
                    .then((results) => {
                        const failed = results.filter((r) => !r.ok);
                        if (failed.length) {
                            console.warn("⚠️ [BACKEND] Création médias Contabo partiellement en échec (inscription maintenue) :", failed);
                            return done(null, newUser);
                        }
                        console.log("✅ [BACKEND] Médias par défaut créés pour profil :", profile.id);
                        done(null, newUser);
                    })
                    .catch(err => {
                        console.warn("⚠️ [BACKEND] Erreur création médias (inscription maintenue) :", err.message);
                        return done(null, newUser);
                    });
            }
        ], function (err, newUser) {
            if (err) {
                console.error("❌ [BACKEND] Échec final de l'inscription :", err.message || err);
                return res.status(500).json({ error: "Échec final de l'inscription" });
            }
            if (newUser) {
                console.log("🎉 [BACKEND] Inscription réussie pour utilisateur :", newUser.id);
                return res.status(201).json({
                    userId: newUser.id,
                    message: "Inscription réussie, redirection vers la page de connexion...",
                    redirectUrl: "/#login"
                });
            } else {
                console.error("❌ [BACKEND] Échec final de l'inscription");
                return res.status(500).json({ error: "Échec final de l'inscription" });
            }
        });
    },
    login: function (req, res) {
        const email = req.body.email;
        const password = req.body.password;
        // Vérification des paramètres manquants 
        if (email === '' || password === '') {
            return res.status(400).json({
                'error': 'Paramètres manquants'
            });
        }
        models.User.findOne({
            where: {
                email: email
            }
        })
            .then(function (userFound) {
                if (userFound) {
                    // Comparaison du mot de passe haché avec le mot de passe fourni 
                    bcrypt.compare(password, userFound.password,
                        function (errBycrypt, resBycrypt) {
                            if (resBycrypt) {
                                // 🔐 Génération des tokens
                                const accessToken = jwtUtils.generateTokenForUser(userFound);
                                const refreshToken = jwtUtils.generateRefreshTokenForUser(userFound);
                                // 🍪 Stockage dans le cookie
                                res.cookie('refreshToken', refreshToken, {
                                    httpOnly: true,
                                    secure: true,
                                    Site: 'Strict',
                                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
                                });
                                // 📦 Envoi dans la réponse JSON
                                const responsePayload = {
                                    userId: userFound.id,
                                    accessToken: accessToken,
                                    refreshToken: refreshToken,
                                    redirectUrl: '/#home'
                                };

                                // Evite les logs volumineux/sensibles sur chaque login pendant les runs E2E.
                                console.log('🟢 login OK userId=', userFound.id);

                                return res.status(200).json(responsePayload);
                            } else {
                                return res.status(403).json({
                                    'error': 'Mot de passe invalide'
                                });
                            }
                        });
                } else {
                    return res.status(404).json({
                        'error': 'Utilisateur non trouvé'
                    });
                }
            }).catch(function (err) {
                return res.status(500).json({
                    'error': 'Impossible de vérifier l\'utilisateur'
                });
            })
    },
    getUserProfile: function (req, res) {
        // Récupération de l'en-tête d'autorisation 
        const headerAuth = req.headers['authorization'];
        const userId = jwtUtils.getUserId(headerAuth);
        if (userId < 0) return res.status(400).json({
            'error': 'Token invalide'
        });
        models.User.findOne({
            attributes: ['id', 'email', 'bio'],
            where: {
                id: userId
            }
        }).then(function (user) {
            if (user) {
                res.status(201).json(user);
            } else {
                res.status(404).json({
                    'error': 'Utilisateur non trouvé'
                });
            }
        }).catch(function (err) {
            res.status(500).json({
                'error': 'Impossible de récupérer l\'utilisateur'
            });
        });
    },
    updateUserProfile: function (req, res) {
        // Récupération de l'en-tête d'autorisation 
        const headerAuth = req.headers['authorization'];
        const userId = jwtUtils.getUserId(headerAuth);
        // Paramètres 
        const bio = req.body.bio;
        asyncLib.waterfall([function (done) {
            models.User.findOne({
                attributes: ['id', 'bio'],
                where: {
                    id: userId
                }
            }).then(function (userFound) {
                done(null, userFound);
            }).catch(function (err) {
                return res.status(500).json({
                    'error': 'Impossible de vérifier l\'utilisateur'
                });
            });
        }, function (userFound, done) {
            if (userFound) {
                userFound.update({
                    bio: (bio ? bio : userFound.bio)
                }).then(function () {
                    done(userFound);
                }).catch(function (err) {
                    res.status(500).json({
                        'error': 'Impossible de mettre à jour l\'utilisateur'
                    });
                });
            } else {
                res.status(404).json({
                    'error': 'Utilisateur non trouvé'
                });
            }
        },], function (userFound) {
            if (userFound) {
                return res.status(201).json(userFound);
            } else {
                return res.status(500).json({
                    'error': 'Impossible de mettre à jour l\'utilisateur'
                });
            }
        });
    },
    deleteUser: function (req, res) {
        const headerAuth = req.headers['authorization'];
        const userId = jwtUtils.getUserId(headerAuth);
        const targetId = parseInt(req.params.id, 10); // ← récupère l'ID depuis l'URL

        if (userId < 0) {
            return res.status(400).json({
                error: 'Token invalide'
            });
        }

        models.User.destroy({
            where: {
                id: targetId
            }
        })
            .then(function (deleted) {
                if (deleted) {
                    return res.status(200).json({
                        message: 'Utilisateur supprimé avec succès'
                    });
                } else {
                    return res.status(404).json({
                        error: 'Utilisateur non trouvé'
                    });
                }
            })
            .catch(function (err) {
                return res.status(500).json({
                    error: 'Erreur suppression de l\'utilisateur'
                });
            });
    },

    updateUser: function (req, res) {
        const headerAuth = req.headers['authorization'];
        const userId = jwtUtils.getUserId(headerAuth);

        const newBio = req.body.bio;
        const newEmail = req.body.email;

        if (userId < 0) {
            return res.status(400).json({
                error: 'Token invalide'
            });
        }

        models.User.findOne({
            where: {
                id: userId
            }
        })
            .then(function (user) {
                if (user) {
                    user.update({
                        bio: newBio || user.bio,
                        email: newEmail || user.email
                    })
                        .then(function () {
                            return res.status(200).json({
                                message: 'Profil mis à jour avec succès'
                            });
                        })
                        .catch(function (err) {
                            return res.status(500).json({
                                error: 'Erreur lors de la mise à jour du profil'
                            });
                        });
                } else {
                    return res.status(404).json({
                        error: 'Utilisateur non trouvé'
                    });
                }
            })
            .catch(function (err) {
                return res.status(500).json({
                    error: 'Impossible de récupérer l\'utilisateur'
                });
            });
    },
    updateUserById: async function (req, res) {
        const userId = parseInt(req.params.id, 10);
        const {
            email,
            password,
            isAdmin
        } = req.body;

        try {
            const user = await models.User.findByPk(userId);
            if (!user) {
                return res.status(404).json({
                    error: 'Utilisateur non trouvé'
                });
            }

            if (email) user.email = email;
            if (password) user.password = await bcrypt.hash(password, 10);
            if (typeof isAdmin !== 'undefined') user.isAdmin = isAdmin;

            await user.save();
            return res.status(200).json({
                message: 'Utilisateur mis à jour',
                user
            });
        } catch (err) {
            return res.status(500).json({
                error: 'Erreur serveur',
                details: err.message
            });
        }
    },
    getUserAll: async function (req, res) {
        try {
            const users = await User.findAll();
            console.log('Utilisateurs trouvés (count):', users.length);
            res.status(200).json(users);
        } catch (error) {
            console.error('Erreur getUserAll:', error);
            res.status(500).json({
                message: 'Erreur serveur'
            });
        }
    },
    refreshToken: function (req, res) {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({
                error: 'Token de rafraîchissement manquant'
            });
        }
        try {
            const decoded = jwtUtils.verifyRefreshToken(refreshToken);
            models.User.findOne({
                where: {
                    id: decoded.userId
                }
            }).then(function (userFound) {
                if (!userFound) {
                    return res.status(404).json({
                        error: 'Utilisateur non trouvé'
                    });
                }
                const newAccessToken = jwtUtils.generateTokenForUser(userFound);
                return res.status(200).json({
                    accessToken: newAccessToken
                });
            }).catch(function (err) {
                return res.status(500).json({
                    error: 'Erreur serveur'
                });
            });
        } catch (err) {
            return res.status(403).json({
                error: 'Token de rafraîchissement invalide ou expiré'
            });
        }
    },
    extendSession: async function (req, res) {
        try {
            // 🔍 Extraction du token depuis le header
            const headerAuth = req.headers['authorization'];
            const refreshToken = headerAuth?.split(' ')[1];
            if (!refreshToken) {
                return res.status(401).json({
                    message: 'Token de rafraîchissement manquant.'
                });
            }

            // 🔐 Vérification du refreshToken
            const decoded = jwtUtils.verifyRefreshToken(refreshToken);
            if (!decoded) {
                return res.status(403).json({
                    message: 'Token de rafraîchissement invalide.'
                });
            }

            // 🔎 Récupération de l'utilisateur
            const user = await models.User.findByPk(decoded.userId);
            if (!user) {
                return res.status(404).json({
                    message: 'Utilisateur introuvable.'
                });
            }

            // 🕒 Mise à jour de l'activité
            user.lastActivity = new Date();
            await user.save();

            // 🆕 Génération d'un nouveau accessToken avec durée de 20 minutes
            const accessToken = jwtUtils.generateExtendSessionToken(user);
            console.log('🆕 Nouveau accessToken généré (20 min) :', accessToken);

            // 📦 Réponse complète
            res.status(200).json({
                message: 'Session prolongée avec succès.',
                accessToken: accessToken
            });
        } catch (error) {
            console.error('❌ Erreur dans extendSession :', error);
            res.status(500).json({
                message: 'Erreur serveur.'
            });
        }
    },

    /** DEV uniquement : supprime un compte seed Cypress (006/007). Jamais exposé si NODE_ENV=production. */
    deleteE2eDevUser: async function (req, res) {
        const allowed = new Set([
            'admin2026@cppeurope.net',
            'user2026@cppeurope.net',
        ]);
        const email = decodeURIComponent(String(req.params.email || ''));
        if (!allowed.has(email)) {
            return res.status(400).json({ error: 'Email non autorisé pour reset E2E' });
        }
        try {
            const user = await models.User.findOne({ where: { email } });
            if (!user) {
                return res.status(204).end();
            }
            await models.Profile.destroy({ where: { userId: user.id } });
            await user.destroy();
            return res.status(200).json({ ok: true, email });
        } catch (err) {
            console.error('deleteE2eDevUser:', err);
            return res.status(500).json({ error: 'Erreur suppression E2E' });
        }
    },
};