import { NextRequest } from 'next/server';
import { registerSseClient } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomFilter = searchParams.get('room');

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Başlangıç ping mesajı
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'ok', timestamp: Date.now() })}\n\n`));

      // Hub'a kaydol
      const unregister = registerSseClient((event) => {
        // Eğer odaya özgü bir olay ise ve istemci başka odayı dinliyorsa filtrele
        if (event.room && roomFilter && event.room !== roomFilter) {
          return;
        }

        try {
          const payloadString = JSON.stringify(event.payload);
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${payloadString}\n\n`));
        } catch {
          // Stream kapandıysa
        }
      });

      // Bağlantıyı canlı tutmak için her 15 saniyede bir heartbeat gönder
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        unregister();
        try {
          controller.close();
        } catch {
          // Zaten kapalı
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
