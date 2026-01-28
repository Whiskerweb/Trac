# 🔧 Tinybird Migration : Étapes Manuelles (5 minutes)

## ⚠️ Contexte

Docker/Colima ne peut pas être installé automatiquement sur ce système (problème d'architecture ARM64/Rosetta).

**La solution la plus rapide est de faire les modifications via l'interface Tinybird** (5 minutes).

---

## 📝 Étapes à Suivre

### 1. Ouvrir Tinybird Workspace (Ctrl+Click pour ouvrir)

👉 https://app.tinybird.co/workspace/trac/datasources

### 2. Modifier les Datasources (3 fois - 3 minutes)

Pour chaque datasource (`clicks`, `sales`, `leads`):

#### A. Clicks
1. Cliquer sur **clicks** dans la liste
2. Cliquer sur **"Edit"** (icône crayon en haut à droite)
3. Dans le schéma, trouver la ligne `link_id`
4. **Ajouter une nouvelle ligne APRÈS `link_id`** :
   ```
   seller_id  Nullable(String)  $.seller_id
   ```
5. Cliquer sur **"Save"**

#### B. Sales
1. Cliquer sur **sales** dans la liste
2. Cliquer sur **"Edit"**
3. Trouver la ligne `link_id`
4. **Ajouter après** :
   ```
   seller_id  Nullable(String)  $.seller_id
   ```
5. **"Save"**

#### C. Leads
1. Cliquer sur **leads**
2. **"Edit"**
3. Après `link_id`, ajouter :
   ```
   seller_id  Nullable(String)  $.seller_id
   ```
4. **"Save"**

---

### 3. Déployer les Pipes (2 fois - 2 minutes)

👉 https://app.tinybird.co/workspace/trac/pipes

#### A. Créer seller_kpis
1. Cliquer sur **"New Pipe"**
2. Nommer: `seller_kpis`
3. Copier le contenu de: `/Users/lucasroncey/Desktop/Projet Saas/Traaaction/pipes/seller_kpis.pipe`
4. Coller dans l'éditeur
5. **"Save"**

#### B. Créer sellers
1. Cliquer sur **"New Pipe"**
2. Nommer: `sellers`
3. Copier le contenu de: `/Users/lucasroncey/Desktop/Projet Saas/Traaaction/pipes/sellers.pipe`
4. Coller
5. **"Save"**

---

### 4. (Optionnel) Supprimer les Anciens Pipes

Une fois que tout fonctionne:
- Supprimer `partner_kpis` (si existe)
- Supprimer `affiliates` (si existe)

---

## ✅ Vérification

Après avoir fait ces étapes, exécute ce script pour vérifier:

```bash
cd /Users/lucasroncey/Desktop/Projet\ Saas/Traaaction
python3 scripts/check-tinybird-schema.py
```

Tu devrais voir:
```
seller_id: ✅ EXISTS
```

pour clicks, sales et leads.

---

## 🎯 Pourquoi ces Étapes ?

- ✅ Le code backend envoie déjà `seller_id` dans tous les nouveaux events
- ⏳ Tinybird rejette ces events car la colonne n'existe pas
- ✅ Une fois la colonne ajoutée, les nouveaux events seront acceptés
- ✅ Les pipes `seller_kpis` et `sellers` pourront interroger les données

---

## 🚀 Après la Migration

Une fois terminé:

1. **Tester un flow complet**:
   - Click → Lead → Sale
   - Vérifier que la commission est créée
   - Vérifier que les analytics affichent les données

2. **Nettoyer le code** (optionnel):
   - Dans `lib/analytics/tinybird.ts`
   - Supprimer la ligne `affiliateId:` (double écriture)
   - Garder seulement `seller_id:`

---

## ⏱️ Temps Total Estimé

- Modifier 3 datasources: **3 minutes**
- Créer 2 pipes: **2 minutes**
- **Total: 5 minutes**

---

## 💬 Besoin d'Aide ?

Si tu as des questions ou problèmes:
1. Vérifie que tu es connecté au bon workspace (trac)
2. Vérifie que tu as les droits d'édition
3. Les modifications sont instantanées (pas besoin de "deploy")

---

**Fichiers de référence**:
- Datasources: `/Users/lucasroncey/Desktop/Projet Saas/Traaaction/datasources/`
- Pipes: `/Users/lucasroncey/Desktop/Projet Saas/Traaaction/pipes/`
