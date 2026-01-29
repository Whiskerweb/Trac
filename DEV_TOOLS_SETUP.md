# Configuration des Outils de Développement

## Activation de l'outil "Force Mature" sur Vercel

L'outil de débogage qui permet de bypasser le délai de 30 jours des commissions nécessite une variable d'environnement pour être activé.

### ⚙️ Configuration sur Vercel

1. **Allez sur votre projet Vercel** : https://vercel.com/dashboard
2. Sélectionnez le projet **Traaaction**
3. **Settings** → **Environment Variables**
4. Ajoutez ces deux variables :

| Variable | Valeur | Environnement |
|----------|--------|---------------|
| `ENABLE_DEV_TOOLS` | `true` | Development, Preview |
| `NEXT_PUBLIC_ENABLE_DEV_TOOLS` | `true` | Development, Preview |

**Important** :
- ⚠️ **NE PAS** activer ces variables en **Production**
- ✅ Activer uniquement pour **Development** et **Preview**

### 5. Redéployer

Après avoir ajouté les variables :
- **Deployments** → Dernier déploiement → **Redeploy**
- Ou faites un nouveau `git push`

---

## 🎯 Comment utiliser l'outil

Une fois activé, vous verrez une nouvelle section dans la sidebar du dashboard :

```
Dev Tools
  ⚡ Force Mature
```

### Flow de test :

1. **Faites un paiement test** via un lien d'affiliation
   - La commission est créée en statut `PENDING`

2. **Accédez à l'outil** : `/dashboard/admin/debug`
   - Vous verrez la liste des commissions PENDING
   - Cliquez sur **"Forcer PROCEED"**

3. **Testez le paiement manuel** : `/dashboard/payouts`
   - Les commissions passées en PROCEED sont maintenant visibles
   - Testez le flow complet de paiement startup → seller

---

## 🔒 Sécurité

- L'endpoint `/api/admin/force-mature` retourne une erreur 403 si `ENABLE_DEV_TOOLS !== 'true'`
- La page `/dashboard/admin/debug` affiche "Accès refusé" si la variable n'est pas définie
- Le lien "Force Mature" dans la sidebar est masqué automatiquement

**En production** : Ces outils sont complètement désactivés pour éviter toute manipulation.

---

## 🐛 Troubleshooting

### Le lien "Force Mature" n'apparaît pas dans la sidebar

**Cause** : Variable d'environnement non configurée ou serveur non redémarré

**Solution** :
1. Vérifiez que `NEXT_PUBLIC_ENABLE_DEV_TOOLS=true` est bien dans les variables Vercel
2. Redéployez le projet
3. Si en local : redémarrez le serveur (`npm run dev`)

### Erreur 403 lors du clic sur "Forcer PROCEED"

**Cause** : Variable `ENABLE_DEV_TOOLS` (sans `NEXT_PUBLIC_`) non définie

**Solution** :
1. Ajoutez `ENABLE_DEV_TOOLS=true` sur Vercel (en plus de `NEXT_PUBLIC_ENABLE_DEV_TOOLS`)
2. Redéployez

### La commission ne passe pas en PROCEED

**Cause** : Erreur dans la requête ou commission déjà en PROCEED

**Solution** :
1. Ouvrez la console browser (F12) pour voir les erreurs
2. Vérifiez que la commission est bien en statut PENDING dans la DB
3. Regardez les logs Vercel pour plus de détails

---

## 📝 Variables d'environnement complètes

Voici toutes les variables nécessaires pour le développement :

```bash
# .env.local

# === Dev Tools ===
ENABLE_DEV_TOOLS=true
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...
DIRECT_URL=...

# === Redis ===
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# === Tinybird ===
TINYBIRD_ADMIN_TOKEN=...
NEXT_PUBLIC_TINYBIRD_HOST=...
NEXT_PUBLIC_TINYBIRD_TOKEN=...

# === Stripe (Test Mode) ===
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# === Autres ===
TRAC_CLIENT_TOKEN=...
CRON_SECRET=...
```

---

## ✅ Checklist

- [ ] Variables ajoutées sur Vercel (Development + Preview)
- [ ] Projet redéployé
- [ ] Lien "Force Mature" visible dans la sidebar
- [ ] Page `/dashboard/admin/debug` accessible
- [ ] Test : clic sur "Forcer PROCEED" fonctionne
- [ ] Commission passe de PENDING → PROCEED
- [ ] Paiement manuel testable sur `/dashboard/payouts`
