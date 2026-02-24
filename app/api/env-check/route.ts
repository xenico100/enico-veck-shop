import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasPaypalClientId: Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
    paypalClientIdPrefix: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
      ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID.slice(0, 6) + "..."
      : null,
  });
}
