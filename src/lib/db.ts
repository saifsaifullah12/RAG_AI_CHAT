import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('❌ DATABASE_URL environment variable is not set');
    }

    console.log('🔌 Connecting to database...');
    
    sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 30, // Increased timeout
      // Add retry logic
      max_lifetime: 60 * 30, // 30 minutes
      onnotice: () => {}, // Suppress notices
    });
  }

  return sql;
}

export async function initializeDatabase() {
  const db = getDb();

  try {
    console.log('🗄️ Initializing database schema...');

    // Enable vector extension
    await db`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✅ Vector extension enabled');

    // Users table (no foreign keys on this one)
    await db`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Users table ready');

    // Documents table
    await db`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        original_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Documents table ready');

    // Embeddings table with proper vector type (768 dimensions for gte-base)
    await db`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        chunk_index INTEGER,
        content TEXT NOT NULL,
       embedding vector(1536)
,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Embeddings table ready');

    // Chat messages
    await db`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        images TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Chat messages table ready');

    // Create indexes for better performance
    await db`CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id)`;
    await db`CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id)`;
    
    // CRITICAL: Create vector similarity index for fast retrieval
    await db`
      CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
      ON embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `;
    console.log('✅ Vector similarity index created');

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export const db = {
  users: {
    async upsert(id: string, email: string, name?: string, role: string = 'user') {
      try {
        console.log('🔄 Upserting user:', { id, email });
        
        const result = await getDb()`
          INSERT INTO users (id, email, name, role)
          VALUES (${id}, ${email}, ${name || null}, ${role})
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = COALESCE(EXCLUDED.name, users.name),
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        
        console.log('✅ User upserted:', result[0]?.id);
        return result[0];
      } catch (error) {
        console.error('❌ User upsert error:', error);
        throw error;
      }
    },

    async getById(id: string) {
      try {
        const result = await getDb()`
          SELECT * FROM users WHERE id = ${id}
        `;
        return result[0] || null;
      } catch (error) {
        console.error('❌ Get user error:', error);
        throw error;
      }
    },

    async updateRole(id: string, role: string) {
      const result = await getDb()`
        UPDATE users SET role = ${role}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      return result[0];
    },
  },

  documents: {
    async create(
      id: string,
      userId: string,
      fileName: string,
      fileType: string,
      fileSize: number,
      originalText: string
    ) {
      try {
        console.log('📄 Creating document:', { id, userId, fileName });
        
        // Verify user exists first
        const userCheck = await getDb()`SELECT id FROM users WHERE id = ${userId}`;
        if (userCheck.length === 0) {
          throw new Error(`User ${userId} does not exist`);
        }
        
        const result = await getDb()`
          INSERT INTO documents (id, user_id, file_name, file_type, file_size, original_text)
          VALUES (${id}, ${userId}, ${fileName}, ${fileType}, ${fileSize}, ${originalText})
          RETURNING *
        `;
        
        console.log('✅ Document created:', result[0]?.id);
        return result[0];
      } catch (error) {
        console.error('❌ Document creation error:', error);
        throw error;
      }
    },

    async getByUserId(userId: string) {
      return getDb()`
        SELECT * FROM documents WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
    },

    async getById(id: string) {
      const result = await getDb()`
        SELECT * FROM documents WHERE id = ${id}
      `;
      return result[0] || null;
    },

    async delete(id: string) {
      await getDb()`DELETE FROM documents WHERE id = ${id}`;
    },
  },

  embeddings: {
    async create(
      id: string,
      documentId: string,
      chunkIndex: number,
      content: string,
      embedding: number[],
      metadata: Record<string, any>
    ) {
      try {
        console.log(`💾 Storing embedding ${id}:`, {
          documentId,
          chunkIndex,
          contentLength: content.length,
          embeddingDimensions: embedding.length
        });

        // CRITICAL: Validate embedding
       if (!embedding || embedding.length !== 1536) {
  throw new Error(`Invalid embedding dimensions: ${embedding.length}, expected 1536`);
}


        // Format embedding as PostgreSQL vector string
        const vectorString = `[${embedding.join(',')}]`;
        
        const result = await getDb()`
          INSERT INTO embeddings (id, document_id, chunk_index, content, embedding, metadata)
          VALUES (
            ${id}, 
            ${documentId}, 
            ${chunkIndex}, 
            ${content}, 
            ${vectorString}::vector,
            ${JSON.stringify(metadata)}::jsonb
          )
          ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            metadata = EXCLUDED.metadata
          RETURNING id, document_id, chunk_index, 
                    vector_dims(embedding) as embedding_dims
        `;
        
        console.log('✅ Embedding stored:', {
          id: result[0]?.id,
          dimensions: result[0]?.embedding_dims
        });
        
        return result[0];
      } catch (error) {
        console.error('❌ Embedding storage error:', error);
        throw error;
      }
    },

    async getByDocumentId(documentId: string) {
      return getDb()`
        SELECT id, document_id, chunk_index, content, metadata,
               vector_dims(embedding) as embedding_dims,
               created_at
        FROM embeddings 
        WHERE document_id = ${documentId}
        ORDER BY chunk_index
      `;
    },

    async search(queryEmbedding: number[], limit: number = 5) {
      try {
        console.log(`🔍 Searching with embedding (${queryEmbedding.length} dims), limit=${limit}`);
        
      if (!queryEmbedding || queryEmbedding.length !== 1536) {
          throw new Error(`Invalid query embedding dimensions: ${queryEmbedding.length}`);
        }

        const vectorString = `[${queryEmbedding.join(',')}]`;
        
        const results = await getDb()`
           SELECT 
      id,
      document_id,
      content,
      metadata,
      1 - (embedding <#> ${vectorString}::vector) AS similarity
    FROM embeddings
    ORDER BY embedding <#> ${vectorString}::vector
    LIMIT ${limit}
        `;
        
        console.log(`✅ Found ${results.length} similar embeddings`);
        if (results.length > 0) {
          console.log(`📊 Top similarity: ${results[0].similarity}`);
        }
        
        return results;
      } catch (error) {
        console.error('❌ Embedding search error:', error);
        throw error;
      }
    },

    async count() {
      const result = await getDb()`SELECT COUNT(*) AS count FROM embeddings`;
      return Number(result[0].count);
    },
  },

  chatMessages: {
    async create(
      id: string,
      userId: string,
      role: 'user' | 'assistant',
      content: string,
      images?: string[]
    ) {
      const result = await getDb()`
        INSERT INTO chat_messages (id, user_id, role, content, images)
        VALUES (${id}, ${userId}, ${role}, ${content}, ${images || null})
        RETURNING *
      `;
      return result[0];
    },

    async getByUserId(userId: string, limit: number = 50) {
      return getDb()`
        SELECT * FROM chat_messages
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    },

    async deleteByUserId(userId: string) {
      await getDb()`DELETE FROM chat_messages WHERE user_id = ${userId}`;
    },
  },
};