import { NextRequest, NextResponse } from 'next/server';
import {
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  processImage,
  chunkText,
} from '@/lib/fileProcessors';
import { embedText, storeEmbedding } from '@/lib/rag';
import { db, initializeDatabase } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SUPPORTED_IMAGE_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
  'image/webp', 'image/bmp', 'image/svg+xml', 'image/tiff', 'image/tif'
];

const SUPPORTED_DOC_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain'
];

// Helper function to ensure user exists with retry logic
async function ensureUserExists(userId: string): Promise<string> {
  try {
    console.log('🔍 Ensuring user exists:', userId);
    
    // Try to get user first
    let user = await db.users.getById(userId);
    
    if (!user) {
      console.log('👤 User not found, creating...');
      
      // Create user with upsert (handles conflicts)
      user = await db.users.upsert(
        userId,
        `${userId}@temp.local`,
        'App User',
        'user'
      );
      
      console.log('✅ User created successfully:', user);
    } else {
      console.log('✅ User already exists:', user);
    }
    
    return userId;
  } catch (error) {
    console.error('❌ Failed to ensure user exists:', error);
    throw new Error(`User creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const file = formData.get('file') as File;

    console.log('📤 Upload received:', { 
      userId, 
      hasFile: !!file, 
      fileName: file?.name, 
      fileSize: file?.size,
      fileType: file?.type 
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    // STEP 1: Initialize database
    console.log('🗄️ Initializing database...');
    try {
      await initializeDatabase();
      console.log('✅ Database initialized');
    } catch (initError) {
      console.error('❌ Database init error:', initError);
      return NextResponse.json(
        { error: 'Database initialization failed' },
        { status: 500 }
      );
    }

    // STEP 2: Ensure user exists (CRITICAL - must succeed before documents)
    let finalUserId: string;
    try {
      finalUserId = await ensureUserExists(userId);
      console.log('✅ User ready:', finalUserId);
    } catch (userError) {
      console.error('❌ User creation failed:', userError);
      return NextResponse.json(
        { 
          error: 'Failed to create user record',
          details: userError instanceof Error ? userError.message : String(userError)
        },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    // STEP 3: Handle images (no database needed)
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType) || mimeType.startsWith('image/')) {
      try {
        const base64Image = await processImage(buffer, mimeType);
        console.log('✅ Image processed:', file.name);
        return NextResponse.json({
          success: true,
          isImage: true,
          base64: base64Image,
          fileName: file.name,
          fileType: mimeType,
        });
      } catch (imageError) {
        console.error('❌ Image processing error:', imageError);
        return NextResponse.json(
          { error: `Image processing failed: ${imageError instanceof Error ? imageError.message : String(imageError)}` },
          { status: 500 }
        );
      }
    }

    // STEP 4: Extract text from document
    let extractedText = '';
    try {
      if (mimeType === 'application/pdf') {
        extractedText = await extractTextFromPDF(buffer);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 mimeType === 'application/msword') {
        extractedText = await extractTextFromDOCX(buffer);
      } else if (mimeType === 'text/plain') {
        extractedText = await extractTextFromTXT(buffer);
      } else {
        return NextResponse.json(
          { error: 'Unsupported file type', supportedTypes: [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOC_TYPES] },
          { status: 400 }
        );
      }
      
      console.log(`✅ Text extracted: ${extractedText.length} characters`);
    } catch (extractError) {
      console.error('❌ Text extraction error:', extractError);
      return NextResponse.json(
        { error: `Text extraction failed: ${extractError instanceof Error ? extractError.message : String(extractError)}` },
        { status: 500 }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text content found in document' },
        { status: 400 }
      );
    }

    // STEP 5: Create document record (now user exists for sure)
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('💾 Creating document with userId:', finalUserId);
      
      const doc = await db.documents.create(
        documentId,
        finalUserId,
        file.name,
        mimeType,
        file.size,
        extractedText
      );
      
      console.log('✅ Document created:', doc);
    } catch (dbError) {
      console.error('❌ Document creation error:', dbError);
      console.error('Error details:', {
        documentId,
        userId: finalUserId,
        fileName: file.name,
        error: dbError
      });
      
      return NextResponse.json(
        { 
          error: 'Database error',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }

    // STEP 6: Chunk and embed
    console.log('✂️ Chunking text...');
    const chunks = chunkText(extractedText);
    console.log(`✅ Created ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create text chunks' },
        { status: 400 }
      );
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        console.log(`🔢 Processing chunk ${i + 1}/${chunks.length}...`);
        
        const embedding = await embedText(chunks[i]);
        
        if (!embedding || embedding.length === 0) {
          console.warn(`⚠️ Empty embedding for chunk ${i}`);
          failCount++;
          continue;
        }
        
        const id = `${documentId}-chunk-${i}`;
        
        // Store in Pinecone
        try {
          await storeEmbedding(id, embedding, {
            content: chunks[i],
            fileName: file.name,
            fileType: mimeType,
            chunkIndex: i,
            uploadedAt: new Date().toISOString(),
            documentId,
            userId: finalUserId,
          });
        } catch (pineconeError) {
          console.error(`⚠️ Pinecone error chunk ${i}:`, pineconeError);
        }

        // Store in PostgreSQL
        try {
          await db.embeddings.create(
            id,
            documentId,
            i,
            chunks[i],
            embedding,
            {
              fileName: file.name,
              fileType: mimeType,
              uploadedAt: new Date().toISOString(),
            }
          );
          successCount++;
        } catch (pgError) {
          console.error(`⚠️ PostgreSQL error chunk ${i}:`, pgError);
          failCount++;
        }
      } catch (chunkError) {
        console.error(`❌ Error processing chunk ${i}:`, chunkError);
        failCount++;
      }
    }

    console.log(`✅ Upload complete: ${successCount} succeeded, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      isImage: false,
      fileName: file.name,
      fileType: mimeType,
      documentId,
      chunksProcessed: successCount,
      totalChunks: chunks.length,
      successCount,
      failCount,
      extractedText: extractedText.substring(0, 500) + '...',
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process file',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}