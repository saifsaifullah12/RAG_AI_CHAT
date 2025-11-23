'use server';

import { Pinecone } from '@pinecone-database/pinecone';
import { db } from './db';

let pineconeClient: Pinecone | null = null;

export async function initPinecone() {
  if (pineconeClient) return pineconeClient;
  
  try {
    if (!process.env.PINECONE_API_KEY) {
      console.warn('⚠️ PINECONE_API_KEY not set, Pinecone disabled');
      return null;
    }
    
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    console.log('✅ Pinecone client initialized');
    return pineconeClient;
  } catch (error) {
    console.error('❌ Pinecone initialization failed:', error);
    return null;
  }
}

export async function embedText(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Empty text provided for embedding');
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }

    // Clean and truncate text
    const maxLength = 8000;
    const cleanedText = text
      .slice(0, maxLength)
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`🔢 Embedding text (${cleanedText.length} chars)...`);
    
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "AI RAG Chat",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small" ,  // 1536 dimensions
        input: cleanedText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.data?.[0]?.embedding) {
      throw new Error('Invalid embedding response from API');
    }

    const embedding = data.data[0].embedding;
    
    // CRITICAL: Validate dimensions
    if (embedding.length !== 1536) {
  throw new Error(`Invalid embedding dimensions: ${embedding.length}, expected 1536`);
}


    console.log(`✅ Embedding created: ${embedding.length} dimensions`);
    
    return embedding;
  } catch (error) {
    console.error("❌ Embedding error:", error);
    throw error;
  }
}

export async function storeEmbedding(
  id: string,
  embedding: number[],
  metadata: Record<string, any>
) {
  const errors: string[] = [];

  try {
    // Validate embedding
   if (!embedding || embedding.length !== 1536) {
  throw new Error(`Invalid embedding: expected 1536 dimensions, got ${embedding?.length || 0}`);
}


    console.log(`💾 Storing embedding: ${id}`);

    // 1. Always store in PostgreSQL (primary storage)
    try {
      await db.embeddings.create(
        id,
        metadata.documentId,
        metadata.chunkIndex,
        metadata.content,
        embedding,
        {
          fileName: metadata.fileName,
          fileType: metadata.fileType,
          uploadedAt: metadata.uploadedAt,
        }
      );
      console.log(`✅ Stored in PostgreSQL: ${id}`);
    } catch (pgError) {
      const error = `PostgreSQL storage failed: ${pgError instanceof Error ? pgError.message : String(pgError)}`;
      console.error('❌', error);
      errors.push(error);
      throw pgError; // Critical error - must succeed
    }

    // 2. Optionally store in Pinecone (if configured)
    if (process.env.PINECONE_INDEX) {
      try {
        const pc = await initPinecone();
        if (pc) {
          const index = pc.index(process.env.PINECONE_INDEX);
          
          // Clean metadata for Pinecone
          const cleanMetadata: Record<string, string | number | boolean> = {};
          for (const [key, value] of Object.entries(metadata)) {
            if (value !== undefined && value !== null) {
              if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                cleanMetadata[key] = value;
              } else {
                cleanMetadata[key] = JSON.stringify(value);
              }
            }
          }
          
          await index.upsert([{
            id,
            values: embedding,
            metadata: cleanMetadata,
          }]);
          
          console.log(`✅ Stored in Pinecone: ${id}`);
        }
      } catch (pineconeError) {
        const error = `Pinecone storage failed: ${pineconeError instanceof Error ? pineconeError.message : String(pineconeError)}`;
        console.warn('⚠️', error);
        errors.push(error);
        // Non-critical - continue
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️ Partial success storing ${id}:`, errors);
    }
  } catch (error) {
    console.error('❌ Failed to store embedding:', error);
    throw error;
  }
}

export async function queryEmbeddings(
  queryEmbedding: number[],
  topK: number = 5
): Promise<any[]> {
  try {
    if (!queryEmbedding || queryEmbedding.length !== 1536) {
      throw new Error(`Invalid query embedding: expected 1536 dimensions, got ${queryEmbedding?.length || 0}`);
    }

    console.log(`🔍 Querying embeddings (topK=${topK})...`);

    // Try PostgreSQL first (faster and more reliable)
    try {
      const results = await db.embeddings.search(queryEmbedding, topK);
      
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} matches in PostgreSQL`);
        console.log(`📊 Top match similarity: ${results[0].similarity}`);
        return results;
      }
    } catch (pgError) {
      console.error('❌ PostgreSQL query failed:', pgError);
    }

    // Fallback to Pinecone if configured
    if (process.env.PINECONE_INDEX) {
      try {
        const pc = await initPinecone();
        if (pc) {
          const index = pc.index(process.env.PINECONE_INDEX);
          const results = await index.query({
            vector: queryEmbedding,
            topK,
            includeMetadata: true,
          });
          
          if (results.matches && results.matches.length > 0) {
            console.log(`✅ Found ${results.matches.length} matches in Pinecone`);
            return results.matches;
          }
        }
      } catch (pineconeError) {
        console.error('❌ Pinecone query failed:', pineconeError);
      }
    }

    console.log('ℹ️ No matches found in any vector store');
    return [];
  } catch (error) {
    console.error('❌ Query error:', error);
    return [];
  }
}

export async function retrieveContext(query: string): Promise<string> {
  try {
    if (!query || query.trim().length === 0) {
      return '';
    }

    console.log(`🔍 Retrieving context for: "${query.substring(0, 100)}..."`);
    
    // 1. Create query embedding
   const rewrittenQuery = `Use the document only. Extract the answer. Question: ${query}`;
   const queryEmbedding = await embedText(rewrittenQuery);

    function textSimilarity(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let score = 0;

  if (b.includes(a)) score += 1;
  const words = a.split(" ");
  words.forEach(w => {
    if (b.includes(w)) score += 0.1;
  });

  return score;
}

    // 2. Search for similar embeddings
    const matches = await queryEmbeddings(queryEmbedding, 10);
    
    matches.sort((a, b) => {
  return textSimilarity(query, b.content) - textSimilarity(query, a.content);
});

    if (matches.length === 0) {
      console.log('ℹ️ No relevant context found');
      return '';
    }
    
    // 3. Extract and combine content
    const context = matches
      .map((match) => {
        // Handle both PostgreSQL and Pinecone response formats
        const content = match.content 
  || match.metadata?.content
  || match.metadata?.chunk_content 
  || '';

        if (typeof content === 'string') {
          return content;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
    
    console.log(`✅ Retrieved context: ${context.length} chars from ${matches.length} chunks`);
    
    return context;
  } catch (error) {
    console.error('❌ Context retrieval error:', error);
    return '';
  }
}