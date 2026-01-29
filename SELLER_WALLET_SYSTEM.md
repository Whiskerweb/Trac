# Système de Wallet Seller - Documentation Complète

## 📊 Vue d'ensemble

Le système de wallet Traaaction gère les gains des sellers, leur stockage temporaire et leur versement final.

---

## 🔄 Flux Complet : De la vente au retrait

```
CLIENT ACHÈTE (1€)
    ↓
STRIPE CHECKOUT COMPLETED
    ↓
WEBHOOK DÉTECTE LA VENTE
    ↓
COMMISSION CRÉÉE (status: PENDING, startup_payment_status: UNPAID)
    • gross_amount: 100 (TTC)
    • tax_amount: 17 (TVA 20%)
    • ht_amount: 83 (HT)
    • stripe_fee: 4
    • net_amount: 79 (HT - Stripe)
    • commission_amount: 8 (10% de HT = 8 centimes)
    • platform_fee: 12 (15% de HT = 12 centimes)
    ↓
MATURATION (30 JOURS)
    status: PENDING → PROCEED
    ↓
STARTUP PAIE VIA /dashboard/payouts
    • Startup paie: commission (8€) + platform fee (12€) = 20€
    • Stripe Checkout session créée
    • Metadata: type='startup_payout', startup_payment_id
    ↓
WEBHOOK CONFIRME PAIEMENT STARTUP
    • confirmStartupPayment() appelé
    • startup_payment_status: UNPAID → PAID
    • status: PROCEED → COMPLETE
    • paid_at: now()
    ↓
SELLER PEUT RETIRER (2 options)
    Option A: STRIPE CONNECT
        • Argent transféré directement sur compte Stripe du seller
        • Disponible sous 2-3 jours sur compte bancaire
        • Minimum: 10€

    Option B: PLATFORM BALANCE (Wallet Traaaction)
        • Argent reste sur la plateforme
        • Utilisable UNIQUEMENT pour cartes cadeaux
        • Amazon, iTunes, Steam, PayPal Gift
        • Pas de minimum
```

---

## 💾 Structure de Données : SellerBalance

**Table Prisma :** `SellerBalance`

```typescript
{
  id: string
  seller_id: string (unique)

  // Soldes en centimes
  balance: number       // Solde actuel sur la plateforme (wallet Traaaction)
  pending: number       // Commissions en PENDING (non matures, < 30j)
  due: number          // Commissions en PROCEED (matures, prêtes à payer)
  paid_total: number   // Total historique déjà versé

  updated_at: DateTime
}
```

### Calcul des Soldes

| Champ | Source | Quand il change |
|-------|--------|-----------------|
| **pending** | SUM(commission_amount) WHERE status='PENDING' | Nouvelle vente, maturation |
| **due** | SUM(commission_amount) WHERE status='PROCEED' AND startup_payment_status='PAID' | Après maturation ET paiement startup |
| **balance** | Argent sur wallet Traaaction | Si seller sans Stripe Connect |
| **paid_total** | SUM historique des versements | À chaque withdraw réussi |

---

## 💰 Stockage de l'Argent

### ❓ Où est stocké l'argent ?

**Réponse courte :** Nulle part ! C'est un **système de comptabilité virtuelle**.

#### Explication détaillée

1. **Client paie → Startup**
   - L'argent va sur le compte Stripe de la **startup**
   - Traaaction ne touche JAMAIS l'argent du client

2. **Startup paie → Traaaction (plateforme) + Seller**
   - Après 30 jours, startup paie via `/dashboard/payouts`
   - Paiement inclut : seller_commissions + platform_fee (15%)
   - L'argent va sur le **compte Stripe de Traaaction**

3. **Traaaction paie → Seller**
   - **Option A : Stripe Connect** (recommandé)
     - `stripe.transfers.create()` depuis Traaaction → Seller
     - Argent transféré directement sur compte Stripe du seller
     - Seller reçoit sur son compte bancaire sous 2-3 jours

   - **Option B : Platform Balance** (wallet)
     - Argent reste virtuellement sur Traaaction
     - Seller peut échanger contre cartes cadeaux
     - Pas de transfert bancaire

---

## 🎯 Méthodes de Payout

### 1. Stripe Connect (Production Ready ✅)

```typescript
// Seller configure Stripe Connect
await createStripeConnectAccount(sellerId)
// → Onboarding Stripe (KYC, vérification identité)
// → stripe_connect_id créé

// Seller demande retrait
await dispatchPayout({
  sellerId,
  amount: 1000, // 10€
  commissionIds: ['comm_1', 'comm_2']
})

// Stripe Transfer
stripe.transfers.create({
  amount: 1000,
  currency: 'eur',
  destination: seller.stripe_connect_id,
  description: 'Payout for 2 commissions'
})

// Commissions marquées COMPLETE
// SellerBalance.due → 0
// SellerBalance.paid_total += 1000
```

**Avantages :**
- ✅ Automatique
- ✅ Sécurisé (KYC Stripe)
- ✅ Rapide (2-3 jours)
- ✅ Production-ready

**Minimum :** 10€

---

### 2. Platform Balance (Wallet Traaaction) ✅

Si le seller **n'a pas Stripe Connect** :

```typescript
// Argent va sur balance plateforme
await processPlatformBalance({
  sellerId,
  amount: 1000,
  commissionIds: ['comm_1']
})

// SellerBalance.balance += 1000
// SellerBalance.due → 0

// Seller peut ensuite échanger contre cartes cadeaux
await requestGiftCard({
  sellerId,
  amount: 1000,
  cardType: 'amazon' // ou 'itunes', 'steam', 'paypal_gift'
})

// GiftCardRedemption créée (status: PENDING)
// Admin fulfille manuellement la carte cadeau
```

**Avantages :**
- ✅ Pas de KYC requis
- ✅ Pas de minimum
- ✅ Bon pour sellers occasionnels

**Inconvénients :**
- ❌ Pas de retrait cash
- ❌ Seulement cartes cadeaux
- ❌ Fulfillment manuel admin

---

### 3. PayPal & IBAN (MVP Manual ⚠️)

**Status actuel :** Stub pour MVP, **pas de paiement automatique**.

```typescript
// PayPal
async function processPayPal(request, paypalEmail) {
  // TODO: Integrate PayPal Payouts API
  // Pour l'instant : garde commissions en PROCEED
  // Admin doit envoyer PayPal manuellement
  return { success: false, method: 'PAYPAL', error: 'Manual fulfillment required' }
}

// IBAN/SEPA
async function processIBAN(request, iban, bic) {
  // TODO: Integrate with banking API (Stripe Treasury, Wise, etc.)
  // Pour l'instant : garde commissions en PROCEED
  // Admin doit faire virement SEPA manuellement
  return { success: false, method: 'IBAN', error: 'Manual fulfillment required' }
}
```

**Recommandation :** Pour l'instant, utiliser uniquement **Stripe Connect** ou **Platform Balance**.

---

## 📱 Interface Seller : `/seller/wallet`

### Composants UI

**Fichier :** `app/seller/wallet/page.tsx`

```typescript
interface WalletData {
  // Soldes
  balance: number       // Wallet Traaaction (centimes)
  pending: number       // En maturation (PENDING)
  due: number          // Prêt à retirer (PROCEED + PAID)
  paid_total: number   // Total versé historique

  // Métadonnées
  canWithdraw: boolean // due >= minWithdraw
  method: PayoutMethod // STRIPE_CONNECT | PAYPAL | IBAN | PLATFORM
  commissions: Commission[] // Liste 50 dernières
}
```

### Actions Disponibles

1. **"Demander un versement"** (bouton principal)
   - Appelle `POST /api/seller/withdraw`
   - Conditions : `canWithdraw === true`
   - Minimum : 10€ (Stripe Connect), 0€ (Platform)

2. **Historique commissions**
   - Badges : PENDING (orange) / PROCEED (vert) / COMPLETE (gris)
   - Countdown maturation pour PENDING
   - Montants : commission + vente brute

---

## 🔧 APIs Backend

### GET `/api/seller/wallet`

**Fonction :** Récupère les infos du wallet

```typescript
// Source: app/api/seller/wallet/route.ts
const wallet = await getSellerWallet(sellerId)
// → Retourne WalletData (soldes + commissions + config)
```

---

### POST `/api/seller/withdraw`

**Fonction :** Demande un retrait

```typescript
// Source: app/api/seller/withdraw/route.ts

// 1. Vérifier balance.due > 0
// 2. Récupérer commissions PROCEED
// 3. Appeler dispatchPayout(sellerId, amount, commissionIds)
// 4. Retourner success + transferId
```

**Logique `dispatchPayout()` :**

```typescript
// Source: lib/payout-service.ts

switch (seller.payout_method) {
  case 'STRIPE_CONNECT':
    // stripe.transfers.create()
    // Commissions → COMPLETE
    // Balance.due → 0
    // Balance.paid_total += amount

  case 'PLATFORM':
    // Balance.balance += amount
    // Balance.due → 0
    // Seller peut échanger contre gift cards

  case 'PAYPAL':
  case 'IBAN':
    // Pas d'implémentation auto
    // Return error 'Manual fulfillment required'
}
```

---

## ⚠️ Problèmes Actuels & Solutions

### Problème 1 : SellerBalance pas mis à jour automatiquement

**Symptôme :** Les soldes (`pending`, `due`, `paid_total`) ne reflètent pas les commissions réelles.

**Cause :** `SellerBalance` est un cache qui doit être recalculé après chaque changement de commission.

**Solution :** Implémenter `updateSellerBalance()` appelé après :
- Création commission
- Maturation (PENDING → PROCEED)
- Paiement startup (startup_payment_status → PAID)
- Withdraw seller (PROCEED → COMPLETE)

```typescript
// À implémenter dans lib/commission/engine.ts
async function updateSellerBalance(sellerId: string) {
  const [pending, proceed, complete] = await Promise.all([
    prisma.commission.aggregate({
      where: { seller_id: sellerId, status: 'PENDING' },
      _sum: { commission_amount: true }
    }),
    prisma.commission.aggregate({
      where: {
        seller_id: sellerId,
        status: 'PROCEED',
        startup_payment_status: 'PAID' // ← Important!
      },
      _sum: { commission_amount: true }
    }),
    prisma.commission.aggregate({
      where: { seller_id: sellerId, status: 'COMPLETE' },
      _sum: { commission_amount: true }
    })
  ])

  await prisma.sellerBalance.upsert({
    where: { seller_id: sellerId },
    create: {
      seller_id: sellerId,
      pending: pending._sum.commission_amount || 0,
      due: proceed._sum.commission_amount || 0,
      paid_total: complete._sum.commission_amount || 0,
      balance: 0 // Si pas de Stripe Connect, argent va ici
    },
    update: {
      pending: pending._sum.commission_amount || 0,
      due: proceed._sum.commission_amount || 0,
      paid_total: complete._sum.commission_amount || 0
    }
  })
}
```

---

### Problème 2 : Commissions restent en "À payer" après paiement startup

**Symptôme :** Dans `/dashboard/commissions`, certaines commissions affichent "À payer" (PROCEED) alors que la startup a déjà payé.

**Cause :** Le webhook ne marque pas toujours les commissions COMPLETE après paiement startup.

**Status :** ✅ **CORRIGÉ** dans commit `3d29b4e`

Le webhook appelle maintenant `confirmStartupPayment()` qui met :
```typescript
{
  startup_payment_status: 'PAID',
  status: 'COMPLETE',  // ← Ajouté
  paid_at: new Date()
}
```

---

### Problème 3 : Seller ne voit pas son argent dans wallet

**Symptôme :** Seller a des commissions COMPLETE mais `wallet.due = 0`.

**Cause possible :**
1. **SellerBalance pas mis à jour** → Voir Problème 1
2. **Startup n'a pas encore payé** → Vérifier `startup_payment_status = UNPAID`
3. **Commission déjà retirée** → Status = COMPLETE mais `paid_at` set

**Debug :**
```sql
-- Vérifier état des commissions
SELECT
  id,
  commission_amount / 100.0 as amount_eur,
  status,
  startup_payment_status,
  paid_at
FROM "Commission"
WHERE seller_id = 'seller_xxx'
ORDER BY created_at DESC;

-- Vérifier SellerBalance
SELECT
  pending / 100.0 as pending_eur,
  due / 100.0 as due_eur,
  paid_total / 100.0 as paid_eur,
  balance / 100.0 as balance_eur
FROM "SellerBalance"
WHERE seller_id = 'seller_xxx';
```

---

## 🚀 Prochaines Étapes

### Priorité 1 : Implémenter `updateSellerBalance()`

**Fichiers à modifier :**
1. `lib/commission/engine.ts` - Ajouter fonction `updateSellerBalance()`
2. `lib/commission/engine.ts` - Appeler après `createCommission()`
3. `lib/commission/worker.ts` - Appeler après maturation PENDING→PROCEED
4. `app/actions/payouts.ts` - Appeler dans `confirmStartupPayment()`
5. `lib/payout-service.ts` - Appeler après `dispatchPayout()`

### Priorité 2 : Tester le flow complet

1. Créer vente test (1€)
2. Force maturation (Dev Tools)
3. Startup paie (/dashboard/payouts)
4. Vérifier SellerBalance mis à jour
5. Seller withdraw (/seller/wallet)
6. Vérifier Stripe Transfer créé
7. Vérifier commissions COMPLETE + balance reset

### Priorité 3 : Améliorer UX Wallet

- Ajouter bouton "Configurer Stripe Connect" si pas configuré
- Afficher prochain versement disponible (countdown)
- Historique des versements (table Payout à créer)
- Graphiques évolution gains (Recharts)

---

## 📝 Récapitulatif : Qui paie qui ?

```
CLIENT (1€)
  ↓
STARTUP (reçoit 1€ sur Stripe)
  ↓ (après 30j)
STARTUP paie TRAAACTION (seller_commission + 15% platform_fee)
  ↓
TRAAACTION transfère SELLER (via Stripe Transfer)
  ↓
SELLER reçoit sur compte bancaire (2-3 jours)
```

**Important :**
- Traaaction ne touche JAMAIS l'argent du client directement
- Tout passe par les comptes Stripe (startup → Traaaction → seller)
- SellerBalance est juste un cache comptable

---

## ❓ Questions Fréquentes

**Q: Le seller peut-il retirer avant 30 jours ?**
R: Non. Les commissions doivent maturer 30 jours (protection anti-fraude/refund).

**Q: Que se passe-t-il si la startup ne paie jamais ?**
R: Commission reste en `PROCEED` + `startup_payment_status=UNPAID`. Seller ne peut pas withdraw tant que startup n'a pas payé.

**Q: Seller peut-il choisir sa méthode de payout ?**
R: Oui, via `/seller/account` (à implémenter). Par défaut : `PLATFORM` (wallet).

**Q: PayPal/IBAN sont-ils vraiment nécessaires ?**
R: Non pour MVP. Stripe Connect couvre 90% des besoins. Platform Balance couvre le reste.

**Q: Quelle est la différence entre `due` et `balance` ?**
R:
- `due` = argent que la startup DOIT payer au seller (commissions PROCEED + PAID)
- `balance` = argent DÉJÀ sur le wallet Traaaction du seller (après withdraw en mode PLATFORM)

---

## 📚 Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `app/seller/wallet/page.tsx` | Interface wallet seller |
| `app/api/seller/wallet/route.ts` | GET wallet data |
| `app/api/seller/withdraw/route.ts` | POST withdraw request |
| `lib/payout-service.ts` | Logique payout multi-méthode |
| `lib/stripe-connect.ts` | Stripe Connect onboarding + transfers |
| `lib/commission/engine.ts` | Création commissions + calculs |
| `lib/commission/worker.ts` | Maturation PENDING→PROCEED |
| `app/actions/payouts.ts` | Paiement startup→plateforme |
| `prisma/schema.prisma` | Modèles Commission, SellerBalance |

---

**Dernière mise à jour :** 29 janvier 2026
**Version :** 1.0
