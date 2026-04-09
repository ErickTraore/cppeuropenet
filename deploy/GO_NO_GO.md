# Checklist Go / No-Go

Utiliser cette checklist juste avant un deploiement production.

## GO technique (tous requis)

- [ ] Branche cible validee (ex: `main`) et CI verte.
- [ ] Build frontend OK.
- [ ] Smoke local OK.
- [ ] Suite staging executee et resultat accepte.
- [ ] Services staging UP (`docker compose ps`).
- [ ] Aucun incident critique ouvert.

## GO exploitation (tous requis)

- [ ] Backup disponible et verifiee.
- [ ] Plan de rollback pret et teste (commande connue).
- [ ] Fenetre de deploiement confirmee.
- [ ] Personne d'astreinte disponible pendant et apres release.

## NO-GO immediat (un seul suffit)

- [ ] CI rouge.
- [ ] Test critique rouge sans mitigation explicite.
- [ ] Incoherence de configuration entre staging et prod non comprise.
- [ ] Pas de backup exploitable.
- [ ] Pas d'operateur disponible pour rollback.

## Validation finale

- Decision: [ ] GO  [ ] NO-GO
- Date/heure:
- Responsable decision:
- Commit SHA:
- Commentaire:

## Post-deploy obligatoire

- [ ] Smoke prod passe
- [ ] Home OK (`/api/home-config`)
- [ ] Login OK (admin + user)
- [ ] Presse generale create/delete OK
- [ ] Presse locale consult OK
- [ ] Logs sans erreur critique 10 minutes apres deploy

