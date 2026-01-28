# Guide de Migration Tinybird : affiliate_id → seller_id

## ✅ Statut

- ✅ **Redis Cache** : Flushed (88 keys supprimées)
- ✅ **Code Backend** : Tous les fichiers mis à jour
- ⏳ **Tinybird** : Migration manuelle requise (voir ci-dessous)

---

## 🎯 Actions Requises dans Tinybird

### Étape 1 : Exécuter le Script SQL

1. Ouvrez la **Console SQL Tinybird** : https://app.tinybird.co/workspace/trac/sql-console

2. Copiez et exécutez le script [scripts/tinybird-migration.sql](scripts/tinybird-migration.sql)

   Ce script va :
   - ✅ Ajouter la colonne `seller_id` aux datasources `clicks`, `sales`, `leads`
   - ✅ Copier les données de `affiliate_id` → `seller_id`
   - ✅ Vérifier que la migration s'est bien passée

3. Vérifiez les résultats avec les requêtes de vérification dans le script

---

### Étape 2 : Mettre à Jour les Pipes

Les pipes suivants doivent être mis à jour pour utiliser `seller_id` au lieu de `affiliate_id` :

#### Option A : Via l'Interface Tinybird (Recommandé)

1. **Renommer `partner_kpis` → `seller_kpis`** :
   - Allez dans **Pipes** → `partner_kpis`
   - Cliquez sur **Settings** → **Rename**
   - Nouveau nom : `seller_kpis`
   - Mettez à jour la description : "Seller KPIs - Stats for a specific seller"

2. **Renommer `affiliates` → `sellers`** :
   - Allez dans **Pipes** → `affiliates`
   - Cliquez sur **Settings** → **Rename**
   - Nouveau nom : `sellers`
   - Mettez à jour la description : "Seller Leaderboard - Top sellers by revenue"

3. **Mettre à jour les requêtes SQL dans chaque pipe** :

   Pour `seller_kpis` :
   ```sql
   -- Remplacer dans NODE clicks_stats et NODE click_ids :
   WHERE seller_id = {{ String(seller_id, required=True) }}
   ```

   Pour `sellers` :
   ```sql
   -- Remplacer dans NODE endpoint :
   SELECT
       seller_id,  -- Au lieu de link_id as affiliate_id
       count() as total_sales,
       ...
   WHERE seller_id IS NOT NULL
   GROUP BY seller_id
   ```

   Pour `funnel` :
   ```sql
   -- Déjà mis à jour dans le fichier local
   countDistinct(seller_id) AS unique_sellers
   ```

#### Option B : Via le CLI Tinybird (Si Docker disponible)

```bash
# Démarrer Docker Desktop, puis :
cd /Users/lucasroncey/Desktop/Projet\ Saas/Traaaction

# Supprimer les anciens pipes
tb pipe rm partner_kpis --yes
tb pipe rm affiliates --yes

# Déployer les nouveaux pipes
tb push pipes/seller_kpis.pipe
tb push pipes/sellers.pipe
tb push pipes/funnel.pipe
```

---

### Étape 3 : Vérification

Une fois les changements appliqués, vérifiez que tout fonctionne :

1. **Test de la datasource `clicks`** :
   ```sql
   SELECT
       count() as total,
       countIf(seller_id IS NOT NULL) as has_seller_id,
       countIf(affiliate_id IS NOT NULL) as has_affiliate_id
   FROM clicks
   LIMIT 1
   ```
   **Résultat attendu** : Les deux colonnes existent et ont les mêmes valeurs

2. **Test du pipe `seller_kpis`** :
   ```bash
   curl 'https://api.europe-west2.gcp.tinybird.co/v0/pipes/seller_kpis.json?seller_id=SELLER_ID_TEST' \
     -H 'Authorization: Bearer p.eyJ1IjogImQ3NGRhMWFjLWQ3YzItNGQwMi1iOTM1LTcwZTkwOTY3ZDhkNyIsICJpZCI6ICJjZDgwNzYxNy1jNDlhLTQwZjQtYjQ4YS01NGRkYmFkOGUyNTYiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0.2zuN6EcaJsm1_op9HqzUYVDh1rfg_dAZkqEu35n8z6k'
   ```

3. **Test du pipe `sellers`** :
   ```bash
   curl 'https://api.europe-west2.gcp.tinybird.co/v0/pipes/sellers.json?workspace_id=YOUR_WORKSPACE_ID' \
     -H 'Authorization: Bearer p.eyJ1IjogImQ3NGRhMWFjLWQ3YzItNGQwMi1iOTM1LTcwZTkwOTY3ZDhkNyIsICJpZCI6ICJjZDgwNzYxNy1jNDlhLTQwZjQtYjQ4YS01NGRkYmFkOGUyNTYiLCAiaG9zdCI6ICJnY3AtZXVyb3BlLXdlc3QyIn0.2zuN6EcaJsm1_op9HqzUYVDh1rfg_dAZkqEu35n8z6k'
   ```

---

## 🗑️ Nettoyage (Optionnel)

Une fois que tout fonctionne et que vous avez vérifié pendant quelques jours :

1. **Supprimer les anciennes colonnes `affiliate_id`** :
   ```sql
   ALTER TABLE clicks DROP COLUMN affiliate_id;
   ALTER TABLE sales DROP COLUMN affiliate_id;
   ALTER TABLE leads DROP COLUMN affiliate_id;
   ```

2. **Supprimer les anciens pipes** (si renommés) :
   - Via UI : Pipes → `partner_kpis` → Delete (si dupliqué)
   - Via UI : Pipes → `affiliates` → Delete (si dupliqué)

---

## 📊 État Actuel de Tinybird

### Datasources existantes :
- ✅ `clicks` - A `affiliate_id`, nécessite ajout de `seller_id`
- ✅ `sales` - A `affiliate_id`, nécessite ajout de `seller_id`
- ✅ `leads` - A `affiliate_id`, nécessite ajout de `seller_id`
- ✅ `sale_items` - Pas de colonne affiliate/seller (OK)
- ✅ `events` - Datasource générique (OK)
- ✅ `sale_events` - Datasource générique (OK)

### Pipes existants :
- ⏳ `partner_kpis` → À renommer en `seller_kpis`
- ⏳ `affiliates` → À renommer en `sellers`
- ✅ `funnel` - Déjà mis à jour localement
- ✅ `kpis` - Dashboard général (OK)
- ✅ `trend` - Dashboard général (OK)
- ✅ `attribution` - Dashboard général (OK)
- ✅ `link_stats` - Dashboard général (OK)
- ✅ `product_analytics` - Dashboard général (OK)

---

## ⚠️ Important

1. **Les nouveaux événements** envoyés depuis l'application utilisent déjà `seller_id` grâce aux changements dans [lib/analytics/tinybird.ts](lib/analytics/tinybird.ts)

2. **Compatibilité** : Tant que les colonnes `affiliate_id` et `seller_id` coexistent, les anciennes et nouvelles données fonctionnent ensemble

3. **Pas de perte de données** : La migration SQL copie simplement les données, ne les supprime pas

4. **Rollback** : Si problème, vous pouvez revenir à `affiliate_id` temporairement en modifiant le code backend

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs Tinybird : https://app.tinybird.co/workspace/trac/logs
2. Testez les requêtes SQL dans la console avant de les exécuter
3. Gardez une copie de backup de vos pipes importants

**Date** : 2026-01-27
**Version** : 1.0
