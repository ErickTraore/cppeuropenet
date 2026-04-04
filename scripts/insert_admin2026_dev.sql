-- Abandonné : ne plus créer d’utilisateurs par INSERT SQL (pas de profil ni slots médias cohérents).
-- Chemin unique : POST /api/users/register/ sur le user-backend.
-- Script : hostinger-cppeurope/user-backend/scripts/create-users-2026.js
-- (ou Cypress 006_initUsersE2E / réinscription manuelle).
SELECT 'deprecated: create accounts via POST /api/users/register/ (see user-backend/scripts/create-users-2026.js)' AS instruction;
