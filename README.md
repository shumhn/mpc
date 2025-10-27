# 🏦 Privacy-Preserving Group Savings App

A decentralized savings platform on Solana with Arcium MPC privacy.

## 📁 Project Structure

```
/mpc/
├── backend/           ✅ COMPLETE ARCIUM BACKEND
│   ├── programs/      # Solana programs (Arcium MPC)
│   ├── encrypted-ixs/ # ALL 7 MPC circuits
│   ├── Arcium.toml    # MPC configuration
│   └── Anchor.toml    # Deployment config
│
├── frontend/          🆕 FRONTEND (To be built)
│   └── (Next.js app will go here)
│
├── arcium-mxe/        📚 OLD - Can be deleted after verification
│   └── savings_mxe/   (Backup of original Arcium code)
│
└── savings-app/       📚 OLD - Can be deleted after verification
    └── (Partial integration attempt)
```

## 🚀 Getting Started

### Backend (Arcium MPC)

```bash
cd backend

# Build the backend
anchor build

# Test the backend
anchor test

# Start Arcium localnet (MPC nodes)
arcium localnet up

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Frontend (To be built)

```bash
cd frontend

# Create Next.js app
npx create-next-app@latest . --typescript --tailwind --app

# Install Solana wallet adapter
npm install @solana/wallet-adapter-react @solana/wallet-adapter-wallets

# Run dev server
npm run dev
```

## 🔐 What This App Does

### Privacy-Preserving Savings
- **Create Goals**: Set savings targets with deadlines
- **Invite Members**: Friends join savings rooms
- **Private Contributions**: Amounts stay encrypted
- **Progress Tracking**: See % complete without revealing individual amounts
- **Conditional Reveals**: Only decrypt when goal is reached

### Arcium MPC Features
- ✅ Encrypted contribution aggregation
- ✅ Private progress checking
- ✅ Secure goal completion verification
- ✅ Conditional contribution reveals

## 📋 Next Steps

1. ✅ Backend is complete and ready
2. 🔄 Build the frontend UI
3. 🔄 Connect frontend to backend
4. 🔄 Deploy to devnet
5. 🔄 Test end-to-end

## 🧹 Cleanup (Optional)

After verifying backend works:
```bash
# Remove old folders
rm -rf arcium-mxe/
rm -rf savings-app/
```

---

**Backend Status:** ✅ Complete (ALL 7 Arcium circuits + full integration)
**Frontend Status:** 🆕 Ready to build
**Next:** Create frontend UI!
