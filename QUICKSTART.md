# Quick Start Guide

Get your AI RAG Chat application running in 5 minutes!

## 🎯 5-Minute Setup

### Step 1: Clone & Install (1 min)
```bash
cd "d:\Ai SDK\Ai-RAG\ai-rag"
npm install
```

### Step 2: Create Free Accounts (2 min)

1. **Clerk** (https://clerk.com/sign-up)
   - Create app → Copy Publishable Key & Secret Key

2. **Neon** (https://console.neon.tech/sign_up)
   - Create project → Copy connection string
   - Run in SQL: `CREATE EXTENSION IF NOT EXISTS vector;`

3. **OpenRouter** (https://openrouter.ai)
   - Sign up → Get API key

4. **Pinecone** (https://www.pinecone.io)
   - Sign up → Create index named `ai-rag`
   - Get API key

### Step 3: Create `.env.local` (1 min)

Create file in project root:

```env
# Clerk - from clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXX
CLERK_SECRET_KEY=sk_test_XXXXX
CLERK_WEBHOOK_SECRET=whsec_XXXXX

# URLs (keep as is)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# Neon - from neon.tech
DATABASE_URL=postgresql://user:password@host/database_name?sslmode=require

# OpenRouter - from openrouter.ai
OPENROUTER_API_KEY=sk_or_XXXXX

# Pinecone - from pinecone.io
PINECONE_API_KEY=XXXXX
PINECONE_INDEX=ai-rag
```

### Step 4: Run (1 min)
```bash
npm run dev
```

Open http://localhost:3000

### Step 5: Clerk Webhooks Setup (Optional but recommended)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your app → Webhooks
3. Create webhook:
   - **Endpoint URL**: `https://your-domain/api/webhooks/clerk`
   - **Events**: 
     - user.created
     - user.updated
     - user.deleted

## 🎮 Try It Out

1. Click "Sign Up" and create an account
2. Upload a PDF file (click file upload area)
3. Chat with the AI about your document
4. Ask it questions - it will search your documents automatically!

## 🔗 Useful Links

- [Clerk Setup Docs](https://clerk.com/docs/quickstarts/nextjs)
- [Neon Quick Start](https://neon.tech/docs/connect/connect-from-any-app)
- [OpenRouter API](https://openrouter.ai/docs)
- [Pinecone Quickstart](https://docs.pinecone.io/guides/getting-started/quickstart)

## ✅ Verify Setup

Check if everything works:

```bash
# Build the app
npm run build

# Should complete without errors
```

## 🚀 Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# ... repeat for other env variables
vercel deploy
```

## 📞 Troubleshooting

**"Cannot find module @clerk/nextjs"**
```bash
rm -rf node_modules package-lock.json
npm install
```

**"Database connection failed"**
- Check DATABASE_URL format
- Ensure Neon project is active
- Verify pgvector extension is enabled

**"Streaming not working"**
- Check OPENROUTER_API_KEY is valid
- Check browser network tab for errors
- Verify free tier limits not exceeded

## 📚 Next Steps

1. Read [README.md](./README.md) for full documentation
2. Check [SETUP.md](./SETUP.md) for detailed setup
3. Review [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for what's included

## 💡 Pro Tips

- **Free Tier Limits**:
  - Neon: 3GB storage
  - Pinecone: 1M vectors
  - OpenRouter: Check token limits

- **Development**:
  - Use `npm run dev` for hot reload
  - Check `npm run build` before deploying
  - Monitor browser console for errors

- **Production**:
  - Set up monitoring/logging
  - Configure rate limiting
  - Back up your Neon database regularly
  - Monitor embedding costs

## 🎉 You're All Set!

Your AI RAG chat is now ready to use. Start by uploading a PDF and asking questions about it!
