import { retrieveContext } from '@/lib/rag';
import { db, initializeDatabase } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages, images, userId } = await req.json();

    console.log('Chat API received:', { 
      userId, 
      messagesCount: messages.length, 
      hasImages: !!images,
      imagesCount: images?.length 
    });

    if (!userId) {
      console.log('Missing userId');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ensure database is initialized
    try {
      await initializeDatabase();
    } catch (initError) {
      console.warn('⚠️ Database initialization check:', initError);
    }

    // CRITICAL FIX: Ensure user exists before storing messages
    try {
      console.log('🔍 Checking if user exists:', userId);
      const existingUser = await db.users.getById(userId);
      
      if (!existingUser) {
        console.log('👤 User not found, creating user record...');
        await db.users.upsert(
          userId,
          `${userId}@temp.local`,
          'Chat User',
          'user'
        );
        console.log('✅ User created:', userId);
      }
    } catch (userError) {
      console.error('❌ Error checking/creating user:', userError);
    }

    // Get RAG context from the last user message
    const lastMessage = messages[messages.length - 1];
    let ragContext = '';
    
    try {
      ragContext = await retrieveContext(lastMessage.content);
    } catch (error) {
      console.error('RAG context error:', error);
    }

    // Build the system message with RAG context
    const systemMessage = ragContext
      ? `You are a helpful AI assistant. Use the following context to answer questions when relevant:\n\n${ragContext}\n\nIf the context doesn't contain relevant information, answer based on your general knowledge.`
      : 'You are a helpful AI assistant.';

    // Process messages and handle images
    const hasImages = images && images.length > 0;
    const userMessages = messages
      .filter((msg: any) => msg.role && msg.content)
      .map((msg: any, index: number) => {
        const role = msg.role?.toLowerCase() === 'assistant' ? 'assistant' : 'user';
        
        // For the last user message with images, create multimodal content
        if (role === 'user' && hasImages && index === messages.length - 1) {
          return {
            role,
            content: [
              { type: 'text', text: msg.content },
              ...images.map((img: string) => ({
                type: 'image_url',
                image_url: { url: img }
              }))
            ]
          };
        }
        
        return {
          role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        };
      });

    console.log('Processed messages:', JSON.stringify(userMessages, null, 2));

    // Use vision model if images are present
    const model = hasImages
      ? "google/gemini-flash-1.5"
      : "microsoft/phi-3-medium-128k-instruct";

    console.log('Using model:', model);

    // Call OpenRouter API directly
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI RAG Chat',
      },
      body: JSON.stringify({
        model,
       messages: [
  { role: "assistant", content: "Here is relevant document context:\n\n" + ragContext },
  ...userMessages
]
,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      console.error('OpenRouter API error:', openrouterResponse.status, errorText);
      return new Response(JSON.stringify({ error: errorText }), { 
        status: openrouterResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store user message in database (fire and forget)
    try {
      await db.chatMessages.create(
        `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        userId,
        'user',
        lastMessage.content,
        images
      );
    } catch (error) {
      console.error('Error storing user message:', error);
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = openrouterResponse.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }

          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                } else {
                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                      const event = `data: ${JSON.stringify({ type: 'text-delta', delta: { text: delta } })}\n\n`;
                      controller.enqueue(encoder.encode(event));
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                }
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Error processing chat request' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}