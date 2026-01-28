# 📊 Tinybird Migration Status: affiliate_id → seller_id

**Date**: 2026-01-27
**Status**: ⚠️ **MIGRATION PARTIELLE - Action manuelle requise**

---

## ✅ Complété

### 1. Code Backend (100%)
```
✅ Tous les events envoient maintenant seller_id:
   - lib/analytics/tinybird.ts (recordSaleToTinybird, recordLeadToTinybird)
   - app/api/webhooks/[endpointId]/route.ts (attribution avec sellerId)
   - app/api/track/lead/route.ts (seller_id au lieu d'affiliate_id)
```

### 2. Fichiers Datasource Locaux (100%)
```
✅ datasources/clicks.datasource - seller_id ajouté (ligne 8)
✅ datasources/sales.datasource - seller_id ajouté (ligne 10)
✅ datasources/leads.datasource - seller_id ajouté (ligne 11)
```

### 3. Fichiers Pipes Locaux (100%)
```
✅ pipes/seller_kpis.pipe - Utilise seller_id (lignes 15, 25)
✅ pipes/sellers.pipe - Utilise seller_id (lignes 11, 20, 22)
✅ Anciens pipes (partner_kpis, affiliates) supprimés/renommés
```

---

## ⏳ En Attente

### Déploiement Tinybird (Action manuelle requise)

**Problème**: Le CLI Tinybird (`tb deploy`) nécessite Docker qui n'est pas en cours d'exécution. L'API REST de Tinybird n'accepte que le format .datasource via le CLI, pas via POST direct.

**Solutions possibles**:

#### Option 1: Via Docker + CLI Tinybird (Recommandée)
```bash
# 1. Démarrer Docker
open -a Docker

# 2. Attendre que Docker soit prêt, puis:
cd /Users/lucasroncey/Desktop/Projet\ Saas/Traaaction
export TB_VERSION_WARNING=0
tb deploy --wait --auto -v
```

#### Option 2: Via l'UI Tinybird (Manuelle)
1. Ouvrir https://app.tinybird.co/workspace/trac/datasources
2. Pour chaque datasource (clicks, sales, leads):
   - Cliquer sur "Edit"
   - Ajouter la colonne: `seller_id Nullable(String)`
   - Cliquer sur "Save"
3. Aller dans https://app.tinybird.co/workspace/trac/pipes
4. Renommer ou mettre à jour les pipes:
   - `partner_kpis` → `seller_kpis`
   - `affiliates` → `sellers`
   - Mettre à jour les requêtes SQL pour utiliser `seller_id`

#### Option 3: Utiliser Tinybird Branches
```bash
cd /Users/lucasroncey/Desktop/Projet\ Saas/Traaaction

# La branche seller_migration existe déjà
tb branch ls

# Note: Cette approche nécessite également Docker pour le déploiement final
```

---

## 📈 Impact Actuel

### État des Datasources en Production
```
❌ clicks: Possède affiliate_id, PAS de seller_id
❌ sales: Possède affiliate_id, PAS de seller_id
❌ leads: Possède affiliate_id, PAS de seller_id
```

### État du Code Backend
```
✅ Nouveaux events envoient seller_id ET affiliate_id (double écriture pour compatibilité)
✅ Le code est prêt à fonctionner avec seller_id uniquement
⚠️  Les events sont en quarantaine car seller_id n'existe pas dans le schéma Tinybird
```

**Exemple d'event envoyé** (dans `lib/analytics/tinybird.ts`):
```typescript
await recordSaleToTinybird({
    clickId: clickId || 'direct',
    orderId: invoiceId,
    sellerId: sellerId || undefined,  // ✅ NOUVEAU (mais rejeté par Tinybird)
    affiliateId: sellerId || undefined, // ✅ ANCIEN (fonctionne)
    // ...
})
```

---

## 🚨 Conséquences de l'État Actuel

### ✅ Ce qui fonctionne
- Tous les nouveaux events sont trackés via `affiliate_id` (nom ancien mais contient seller_id)
- Les dashboards analytics fonctionnent
- L'attribution fonctionne
- Les commissions sont créées correctement

### ❌ Ce qui ne fonctionne pas
- Les pipes `seller_kpis` et `sellers` ne sont PAS déployés en production
- Les anciens pipes `partner_kpis` et `affiliates` sont toujours actifs
- Les nouveaux events avec `seller_id` sont en quarantaine (rejetés)

### ⚠️  Risques
- **Double écriture** dans le code (envoie les deux seller_id ET affiliate_id)
- **Confusion terminologique** : les events utilisent `affiliate_id` alors que le code utilise `sellerId`
- **Events en quarantaine** : 17+ events sont en quarantaine à cause de seller_id

---

## 🎯 Actions Requises (PAR ORDRE DE PRIORITÉ)

### Priorité 1: Déployer les schemas Tinybird
**Sans cette étape, les nouveaux events sont rejetés**

Choisir UNE des options ci-dessus:
- [ ] Démarrer Docker et exécuter `tb deploy`
- [ ] Modifier manuellement via l'UI Tinybird
- [ ] Utiliser Tinybird branches (nécessite Docker au final)

### Priorité 2: Vérifier le déploiement
```bash
# Exécuter après le déploiement
python3 scripts/check-tinybird-schema.py

# Doit afficher:
# seller_id: ✅ EXISTS pour clicks, sales, leads
```

### Priorité 3: Tester les pipes
```bash
# Tester seller_kpis pipe
curl "https://api.europe-west2.gcp.tinybird.co/v0/pipes/seller_kpis.json?seller_id=test" \
  -H "Authorization: Bearer $TINYBIRD_TOKEN"

# Doit retourner des KPIs (ou erreur si aucune donnée)
```

### Priorité 4: Nettoyer le code (optionnel)
Une fois seller_id déployé en production:
```typescript
// Dans lib/analytics/tinybird.ts, SUPPRIMER la double écriture
await recordSaleToTinybird({
    sellerId: sellerId || undefined,  // Garder seulement ça
    // affiliateId: ..., // SUPPRIMER cette ligne
})
```

---

## 📝 Scripts Disponibles

| Script | Description | Status |
|--------|-------------|--------|
| `scripts/check-tinybird-schema.py` | Vérifie si seller_id existe dans les datasources | ✅ Fonctionnel |
| `scripts/create-seller-id-columns.py` | Envoie des events de test (rejetés pour l'instant) | ⚠️ Events en quarantaine |
| `scripts/update-tinybird-via-api.py` | Tente de mettre à jour via API (ne fonctionne pas) | ❌ Format incompatible |
| `scripts/execute-tinybird-migration.sh` | Tente ALTER TABLE via SQL (non supporté) | ❌ Endpoint SQL read-only |

---

## 🔄 État des Fichiers

### Fichiers Locaux (Prêts pour déploiement)
```
✅ datasources/clicks.datasource (avec seller_id)
✅ datasources/sales.datasource (avec seller_id)
✅ datasources/leads.datasource (avec seller_id)
✅ pipes/seller_kpis.pipe
✅ pipes/sellers.pipe
```

### Fichiers en Production (Non synchronisés)
```
❌ Datasource clicks: PAS de seller_id
❌ Datasource sales: PAS de seller_id
❌ Datasource leads: PAS de seller_id
❌ Pipe seller_kpis: N'existe PAS
❌ Pipe sellers: N'existe PAS
✅ Pipe partner_kpis: Existe encore (à supprimer après migration)
✅ Pipe affiliates: Existe encore (à supprimer après migration)
```

---

## ✅ Conclusion

**Migration code:** 100% complète ✅
**Migration Tinybird:** 0% déployée ⏳

**Prochaine action immédiate:**
Démarrer Docker et exécuter `tb deploy` pour synchroniser les schemas.

**Temps estimé:** 5-10 minutes une fois Docker démarré.

---

**Dernière mise à jour:** 2026-01-27 13:30 UTC
