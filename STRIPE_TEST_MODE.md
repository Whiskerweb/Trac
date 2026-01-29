# Basculer Stripe en Mode Test

## 🎯 Objectif

Tester le système de paiement sans dépenser d'argent réel.

---

## ✅ Étape 1 : Récupérer les clés Stripe Test

1. Va sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. **Active le mode test** : Toggle en haut à droite "Test mode" → **ON**
3. Va dans **Developers** → **API keys**
4. Copie :
   - **Publishable key** (commence par `pk_test_...`)
   - **Secret key** (commence par `sk_test_...`)

---

## ✅ Étape 2 : Mettre à jour `.env.local`

```bash
# Remplace les clés live par les clés test
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXX

# Les webhooks secrets restent les mêmes (on les recrée après)
```

---

## ✅ Étape 3 : Redéployer sur Vercel

### Option A : Via Dashboard Vercel (recommandé)

1. Va sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionne ton projet
3. **Settings** → **Environment Variables**
4. Édite les variables :
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → nouvelle valeur `pk_test_...`
   - `STRIPE_SECRET_KEY` → nouvelle valeur `sk_test_...`
5. **Redéploie** : Deployments → Plus récent → **Redeploy**

### Option B : Via CLI

```bash
# Si tu utilises Vercel CLI
vercel env pull .env.local
# Édite .env.local avec les nouvelles clés
vercel --prod
```

---

## ✅ Étape 4 : Reconfigurer les Webhooks Stripe

Les webhooks actuels pointent vers les clés live. Il faut les recréer pour le mode test.

### 4.1 Créer un nouveau webhook test

1. **Stripe Dashboard** (mode test activé)
2. **Developers** → **Webhooks** → **Add endpoint**
3. **URL** : `https://www.traaaction.com/api/webhooks/[TON_ENDPOINT_ID]`
   - Récupère l'endpoint ID depuis ta DB : `SELECT id FROM "WebhookEndpoint"`
4. **Events** : Sélectionne :
   - `checkout.session.completed`
   - `invoice.paid`
   - `charge.refunded`
5. **Add endpoint**

### 4.2 Copier le signing secret

1. Clique sur le webhook créé
2. **Signing secret** → **Reveal** → Copie (commence par `whsec_...`)
3. Va dans ta **DB** (Supabase ou Prisma Studio)
4. Update la table `WebhookEndpoint` :
   ```sql
   UPDATE "WebhookEndpoint"
   SET secret = 'whsec_NOUVEAU_SECRET_TEST'
   WHERE id = 'TON_ENDPOINT_ID';
   ```

---

## ✅ Étape 5 : Tester avec une carte de test

Stripe fournit des cartes de test :

| Carte | Résultat |
|-------|----------|
| `4242 4242 4242 4242` | ✅ Paiement réussi |
| `4000 0000 0000 0002` | ❌ Carte refusée |
| `4000 0025 0000 3155` | 🔐 Nécessite 3D Secure |

**Autres infos** :
- **Date expiration** : N'importe quelle date future (ex: 12/34)
- **CVC** : N'importe quel 3 chiffres (ex: 123)
- **Nom** : N'importe quel nom
- **Code postal** : N'importe quel code (ex: 75001)

---

## ✅ Étape 6 : Vérifier que ça fonctionne

1. **Frontend** : Fais une vente de 1€ avec la carte test `4242 4242 4242 4242`
2. **Stripe Dashboard (test)** : Vérifie que le paiement apparaît
3. **Webhook** : Vérifie dans les logs Vercel que le webhook est reçu
4. **DB** : Vérifie qu'une commission est créée avec les bons montants :
   ```sql
   SELECT
     gross_amount,
     tax_amount,
     commission_amount,
     platform_fee
   FROM "Commission"
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**Résultat attendu pour 1€ TTC avec 10% de reward :**
```
gross_amount: 100      (1.00€)
tax_amount: 17         (0.17€ - 20% TVA calculée)
commission_amount: 8   (0.08€ - 10% de 0.83€ HT)
platform_fee: 12       (0.12€ - 15% de 0.83€ HT)
```

---

## 🔄 Retour en mode Live (production)

Quand tu es prêt pour la prod :

1. **Vercel** → Remets les clés live :
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `STRIPE_SECRET_KEY=sk_live_...`
2. **Webhooks** : Recrée les webhooks en mode live
3. **DB** : Update le webhook secret avec celui du mode live
4. **Redéploie**

---

## ⚠️ Important

- **Ne mélange JAMAIS** les clés test et live
- Les webhooks test et live sont **séparés** (différents secrets)
- Les données Stripe test sont **isolées** (pas visibles en mode live)
- Tu peux basculer autant de fois que nécessaire entre test et live

---

## 🐛 Debugging

Si les webhooks ne fonctionnent pas :

```bash
# Logs Vercel
vercel logs --follow

# Ou depuis le dashboard : Deployments → Logs
```

Vérifie que le webhook secret en DB correspond bien au secret Stripe (mode test).

---

## 📊 Tableau récapitulatif

| Environnement | Publishable Key | Secret Key | Webhook Secret | Cartes |
|---------------|----------------|------------|----------------|--------|
| **Test** | `pk_test_...` | `sk_test_...` | `whsec_...` (test) | `4242 4242 4242 4242` |
| **Live** | `pk_live_...` | `sk_live_...` | `whsec_...` (live) | Vraies cartes |

---

✅ **Avec le mode test, tu peux tester autant que tu veux sans payer !**
