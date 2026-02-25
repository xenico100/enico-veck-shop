import { POST as captureOrderPost } from '@/app/api/paypal/capture-order/route';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return captureOrderPost(request);
}
