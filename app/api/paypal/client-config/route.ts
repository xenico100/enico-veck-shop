import { NextResponse } from 'next/server';
import { getPayPalClientConfig } from '@/utils/paypal';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { clientId, environment } = getPayPalClientConfig();
    return NextResponse.json({
      clientId,
      environment
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'PayPal client configuration is missing on the server.'
      },
      { status: 500 }
    );
  }
}

