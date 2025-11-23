# AI RAG Chat - Complete Setup Guide

This project includes real-time streaming chat, PDF upload and processing, vector embeddings for semantic search, user authentication with Clerk, and a production-ready Neon database.

## Features

✅ **Real-time streaming chat interface** - Chat with AI powered by OpenRouter
✅ **PDF/Document upload and processing** - Support for PDF, DOCX, DOC, TXT
✅ **Vector embeddings for semantic search** - Using Pinecone
✅ **User authentication and RBAC** - Using Clerk
✅ **Production-ready database** - Using Neon PostgreSQL
✅ **Image support** - Send images in chat for vision capabilities

## Prerequisites

- Node.js 18+ and npm
- Clerk account (https://clerk.com)
- Neon PostgreSQL database (https://neon.tech)
- OpenRouter API key (https://openrouter.ai)
- Pinecone API key (https://pinecone.io)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Copy your `Publishable Key` and `Secret Key`
4. Create `/src/app/sign-in/[[...sign-in]]/page.tsx` and `/src/app/sign-up/[[...sign-up]]/page.tsx` (already created)

### 3. Set Up Neon PostgreSQL

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project
3. Get your connection string (DATABASE_URL format)
4. Note: The database initialization happens automatically on first use. Tables are created with pgvector support for embeddings.

### 4. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# Neon PostgreSQL Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# OpenRouter API (for LLM)
OPENROUTER_API_KEY=sk_or_xxxxx

# Pinecone Vector Database (for semantic search)
PINECONE_API_KEY=xxxxx
PINECONE_INDEX=your-index-name
```

### 5. Enable pgvector Extension in Neon

The database schema uses pgvector for vector embeddings. To enable it:

1. Connect to your Neon database using psql or the Neon console
2. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

## Running the Application

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Streaming chat endpoint
│   │   ├── embed/route.ts     # Text embedding endpoint
│   │   └── upload/route.ts    # File upload and processing
│   ├── chat/page.tsx          # Main chat interface
│   ├── sign-in/               # Clerk sign-in page
│   ├── sign-up/               # Clerk sign-up page
│   └── layout.tsx             # Root layout with ClerkProvider
├── components/
│   ├── ChatInterface.tsx      # Main chat component
│   ├── MessageInput.tsx       # Message input with file upload
│   ├── MessageList.tsx        # Chat message display
│   ├── FileUpload.tsx         # File upload component
│   ├── Sidebar.tsx            # Sidebar with history & user profile
│   └── ui/                    # Reusable UI components
├── lib/
│   ├── db.ts                  # Neon database utilities
│   ├── rag.ts                 # RAG and embedding logic
│   ├── openrouter.ts          # OpenRouter API setup
│   ├── fileProcessors.ts      # PDF/DOCX/TXT processing
│   └── utils.ts               # Helper functions
└── types/
    └── index.ts               # TypeScript types
```

## Database Schema

The Neon database includes the following tables:

### `users`
- id (Primary Key)
- email (Unique)
- name
- role (for RBAC)
- created_at, updated_at

### `documents`
- id (Primary Key)
- user_id (Foreign Key)
- file_name, file_type, file_size
- original_text
- created_at

### `embeddings`
- id (Primary Key)
- document_id (Foreign Key)
- chunk_index
- content
- embedding (VECTOR 1536)
- metadata (JSONB)
- created_at

### `chat_messages`
- id (Primary Key)
- user_id (Foreign Key)
- role, content, images
- created_at

## API Endpoints

### Chat (Real-time Streaming)
```
POST /api/chat
Body: { messages: Array, images?: Array }
```

### Upload Documents
```
POST /api/upload
FormData: { file: File }
```

### Generate Embeddings
```
POST /api/embed
Body: { text: string }
```

## Key Features Explained

### 1. Real-time Streaming Chat
- Uses AI SDK with OpenRouter
- Streams responses word-by-word
- Integrates RAG context from uploaded documents

### 2. PDF Processing
- Extracts text from PDF, DOCX, TXT files
- Chunks text intelligently
- Generates embeddings for each chunk

### 3. Vector Search
- Uses Pinecone for vector similarity search
- Stores embeddings in Neon for persistence
- Retrieves relevant context for each query

### 4. Authentication
- Clerk handles OAuth and email/password auth
- Automatic user creation in database
- Role-based access control ready

### 5. Database
- Neon PostgreSQL for production-ready storage
- Automatic schema creation
- Indexes for optimal query performance

## Troubleshooting

### "Cannot find module '@clerk/nextjs'"
- Run `npm install` to install all dependencies
- Clear `.next` folder: `rm -rf .next`
- Restart dev server

### "DATABASE_URL not set"
- Ensure `.env.local` file exists
- Check the connection string format
- Verify Neon project is active

### "Pinecone connection failed"
- Verify API key in `.env.local`
- Check Pinecone project is created
- Ensure index name matches environment

### Vector embedding limits exceeded
- Pinecone free tier supports 1M vectors
- Neon free tier supports 3GB storage
- Consider upgrading for production

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## License

MIT

## Support

For issues or questions:
1. Check the Clerk docs: https://clerk.com/docs
2. Check Neon docs: https://neon.tech/docs
3. Check OpenRouter docs: https://openrouter.ai/docs
4. Check Pinecone docs: https://docs.pinecone.io
