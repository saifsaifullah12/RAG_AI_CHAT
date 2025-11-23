import mammoth from "mammoth";
import { extractText } from "unpdf";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log("📄 Starting PDF extraction...");
    
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8);
    
    // CRITICAL FIX: Handle array or string response
    let text = '';
    if (Array.isArray(result.text)) {
      text = result.text.join('\n');
    } else if (typeof result.text === 'string') {
      text = result.text;
    } else {
      console.warn('⚠️ Unexpected PDF result type:', typeof result.text);
      text = String(result.text || '');
    }
    
    const cleanedText = text.trim();
    console.log(`✅ PDF extracted: ${cleanedText.length} characters`);
    
    return cleanedText;
  } catch (error) {
    console.error("❌ PDF extraction error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    console.log('📝 Starting DOCX extraction...');
    
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty buffer provided for DOCX extraction');
    }
    
    const result = await mammoth.extractRawText({ buffer });
    
    if (!result.value) {
      console.warn('⚠️ DOCX parsed but no text found');
      return '';
    }
    
    const cleanedText = result.value.trim();
    console.log(`✅ DOCX extracted: ${cleanedText.length} characters`);
    
    if (result.messages && result.messages.length > 0) {
      console.log('DOCX warnings:', result.messages);
    }
    
    return cleanedText;
  } catch (error) {
    console.error("❌ DOCX extraction error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from DOCX: ${errorMessage}`);
  }
}

export async function extractTextFromTXT(buffer: Buffer): Promise<string> {
  try {
    console.log('📃 Starting TXT extraction...');
    
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty buffer provided for TXT extraction');
    }
    
    let text = '';
    
    try {
      text = buffer.toString("utf-8");
    } catch (utf8Error) {
      console.warn('⚠️ UTF-8 decoding failed, trying latin1...');
      try {
        text = buffer.toString("latin1");
      } catch (latin1Error) {
        console.warn('⚠️ latin1 decoding failed, trying ascii...');
        text = buffer.toString("ascii");
      }
    }
    
    const cleanedText = text.trim();
    console.log(`✅ TXT extracted: ${cleanedText.length} characters`);
    
    return cleanedText;
  } catch (error) {
    console.error("❌ TXT extraction error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from TXT: ${errorMessage}`);
  }
}

export async function processImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    console.log(`🖼️ Processing image: ${mimeType}, ${buffer.length} bytes`);
    
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty buffer provided for image processing');
    }
    
    if (!mimeType.startsWith('image/')) {
      throw new Error(`Invalid MIME type for image: ${mimeType}`);
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      throw new Error(`Image too large: ${buffer.length} bytes (max ${maxSize} bytes)`);
    }
    
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    console.log(`✅ Image processed: ${dataUrl.length} characters`);
    
    return dataUrl;
  } catch (error) {
    console.error("❌ Image processing error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process image: ${errorMessage}`);
  }
}

// IMPROVED CHUNKING with better overlap
export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  try {
    console.log(`✂️ Chunking text: ${text.length} characters, maxSize: ${maxChunkSize}`);
    
    if (!text || text.trim().length === 0) {
      console.warn('⚠️ Empty text provided for chunking');
      return [];
    }
    
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+[\s]?/g) || [text];
    
    let currentChunk = "";

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (!trimmedSentence) continue;
      
      if ((currentChunk + ' ' + trimmedSentence).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          const words = currentChunk.trim().split(' ');
          const overlapWords = words.slice(-Math.ceil(overlap / 10));
          currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
        } else {
          if (trimmedSentence.length > maxChunkSize) {
            const words = trimmedSentence.split(' ');
            let tempChunk = '';
            
            for (const word of words) {
              if ((tempChunk + ' ' + word).length > maxChunkSize) {
                if (tempChunk) chunks.push(tempChunk.trim());
                tempChunk = word;
              } else {
                tempChunk += (tempChunk ? ' ' : '') + word;
              }
            }
            
            if (tempChunk) currentChunk = tempChunk;
          } else {
            currentChunk = trimmedSentence;
          }
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    const filteredChunks = chunks.filter(chunk => chunk.length >= 50);
    
    console.log(`✅ Created ${filteredChunks.length} chunks`);
    
    if (filteredChunks.length === 0 && text.trim().length > 0) {
      console.log('⚠️ No valid chunks created, returning original text as single chunk');
      return [text.trim()];
    }
    
    return filteredChunks;
  } catch (error) {
    console.error('❌ Chunking error:', error);
    return text.trim() ? [text.trim()] : [];
  }
}