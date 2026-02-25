import { POST as createOrderPost } from '@/app/api/paypal/create-order/route';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return createOrderPost(request);
}
