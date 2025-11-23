# AI RAG Chat - Production-Ready Application

A modern, full-featured AI chat application with real-time streaming, document processing, and semantic search capabilities.

## 🚀 Features

- **Real-time Streaming Chat** - Chat with AI powered by OpenRouter
- **PDF & Document Upload** - Support for PDF, DOCX, DOC, TXT files
- **Vector Embeddings** - Semantic search using Pinecone
- **User Authentication** - Secure auth with Clerk and RBAC
- **Production Database** - Neon PostgreSQL with pgvector
- **Image Support** - Send and process images in conversations
- **Dark Mode** - Beautiful dark/light theme
- **Chat History** - Persistent conversation storage
- **Responsive UI** - Built with Tailwind CSS and Shadcn/UI

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with TypeScript
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI
- **Authentication**: Clerk
- **Database**: Neon PostgreSQL with pgvector
- **Vector Store**: Pinecone
- **LLM**: OpenRouter (NVIDIA Nemotron)
- **Streaming**: Vercel AI SDK
- **API**: Next.js API Routes

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Git

## 🔑 Required API Keys

1. **Clerk** - https://clerk.com (Free tier available)
2. **Neon** - https://neon.tech (Free tier: 3GB storage)
3. **OpenRouter** - https://openrouter.ai (Free tier available)
4. **Pinecone** - https://pinecone.io (Free tier: 1M vectors)

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd ai-rag
npm install
```

### 2. Set Up Services

#### Clerk Setup
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Copy your Publishable and Secret keys

#### Neon Setup
1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Get your CONNECTION_STRING
4. Enable pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

#### OpenRouter & Pinecone
- Get API keys from respective dashboards
- Create a Pinecone index named `ai-rag`

### 3. Configure Environment

Create `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
C=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat
CLERK_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# AI Services
OPENROUTER_API_KEY=sk_or_...
PINECONE_API_KEY=...
PINECONE_INDEX=ai-rag
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Streaming chat endpoint
│   │   ├── embed/route.ts         # Embedding generation
│   │   ├── upload/route.ts        # Document upload & processing
│   │   └── webhooks/clerk/        # Clerk webhooks for user sync
│   ├── sign-in/                   # Clerk sign-in page
│   ├── sign-up/                   # Clerk sign-up page
│   ├── chat/                      # Main chat page
│   ├── layout.tsx                 # Root layout with ClerkProvider
│   └── page.tsx                   # Home/welcome page
├── components/
│   ├── ChatInterface.tsx          # Main chat component
│   ├── MessageInput.tsx           # Input with file upload
│   ├── MessageList.tsx            # Message display
│   ├── FileUpload.tsx             # File upload widget
│   ├── Sidebar.tsx                # Navigation & history
│   └── ui/                        # Reusable components
├── lib/
│   ├── db.ts                      # Neon utilities with schema
│   ├── rag.ts                     # RAG & embedding logic
│   ├── openrouter.ts              # LLM configuration
│   ├── fileProcessors.ts          # PDF/DOCX/TXT extraction
│   └── utils.ts                   # Helpers
└── types/
    └── index.ts                   # TypeScript definitions
```

## 🗄️ Database Schema

### users
- `id` (UUID, PK) - From Clerk
- `email` (TEXT, UNIQUE)
- `name` (TEXT)
- `role` (TEXT) - For RBAC
- `created_at`, `updated_at`

### documents
- `id` (UUID, PK)
- `user_id` (FK to users)
- `file_name`, `file_type`, `file_size`
- `original_text` (TEXT)
- `created_at`

### embeddings
- `id` (UUID, PK)
- `document_id` (FK)
- `chunk_index` (INTEGER)
- `content` (TEXT)
- `embedding` (VECTOR 1536)
- `metadata` (JSONB)
- `created_at`

### chat_messages
- `id` (UUID, PK)
- `user_id` (FK)
- `role` (TEXT) - 'user' or 'assistant'
- `content` (TEXT)
- `images` (TEXT[])
- `created_at`

## 🔌 API Endpoints

### POST /api/chat
Real-time streaming chat with RAG context

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What is in my documents?" }
  ],
  "images": ["data:image/png;base64,..."]
}
```

**Response:** Server-sent events (streaming)

### POST /api/upload
Upload and process documents

**Request:**
```
FormData: { file: File }
```

**Response:**
```json
{
  "success": true,
  "fileName": "document.pdf",
  "documentId": "doc-123",
  "chunksProcessed": 5
}
```

### POST /api/embed
Generate embeddings for text

**Request:**
```json
{ "text": "Some text to embed" }
```

**Response:**
```json
{
  "embedding": [...],
  "dimension": 1536
}
```

## 🔐 Authentication Flow

1. User visits `/sign-in` or `/sign-up`
2. Clerk handles OAuth/email auth
3. On successful auth, user redirected to `/chat`
4. Clerk webhook syncs user to Neon database
5. Protected routes use middleware to verify auth
6. Chat and upload APIs require valid Clerk session

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel login
vercel link
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# ... add all env vars
vercel deploy
```

### Docker
```bash
docker build -t ai-rag .
docker run -p 3000:3000 --env-file .env.local ai-rag
```

### Railway/Render
1. Connect GitHub repo
2. Add environment variables
3. Deploy

## 📊 Performance Tips

- Embeddings are cached in Pinecone and Neon
- Database queries use indexes for fast lookups
- Chat messages are streamed for responsive UX
- Images are base64 encoded for transmission
- CSS is optimized with Tailwind's JIT compiler

## 🐛 Troubleshooting

### Clerk module not found
```bash
rm -rf node_modules package-lock.json
npm install
```

### Database connection error
- Verify `DATABASE_URL` format
- Check Neon project is active
- Ensure IP whitelist is configured

### Pinecone connection failed
- Verify API key and index name
- Check index is in active state
- Verify free tier limits

### Streaming not working
- Check OpenRouter API key
- Verify internet connection
- Check browser console for errors

## 📝 Environment Variables Reference

```env
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=    # Public key from Clerk
CLERK_SECRET_KEY=                      # Secret key from Clerk
NEXT_PUBLIC_CLERK_SIGN_IN_URL=         # Should be /sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=         # Should be /sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=   # Should be /chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=   # Should be /chat
CLERK_WEBHOOK_SECRET=                  # For user sync webhook

# Database
DATABASE_URL=                          # postgresql://...

# AI Services
OPENROUTER_API_KEY=                    # For LLM access
PINECONE_API_KEY=                      # For vector search
PINECONE_INDEX=                        # Index name (e.g., ai-rag)
```

## 📚 Documentation Links

- [Next.js Docs](https://nextjs.org/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Neon Docs](https://neon.tech/docs)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Pinecone Docs](https://docs.pinecone.io)
- [AI SDK Docs](https://sdk.vercel.ai)

## 📄 License

MIT

## 🤝 Support

For issues or questions:
1. Check the [SETUP.md](./SETUP.md) for detailed setup guide
2. Review service documentation links above
3. Check GitHub issues
4. Contact support on respective platforms

## 🎯 Future Enhancements

- [ ] Web search integration
- [ ] Document summarization
- [ ] Code execution
- [ ] Custom models support
- [ ] Team/organization support
- [ ] API rate limiting
- [ ] Analytics dashboard
- [ ] Export conversations
