import { readOwnerWorkshop } from '@/utils/world-workshop-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { status, body } = await readOwnerWorkshop();
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
