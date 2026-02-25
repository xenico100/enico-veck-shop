import { NextResponse } from "next/server";
import { getPayPalClientConfig } from "@/utils/paypal";

export async function GET() {
  try {
    const { clientId, environment } = getPayPalClientConfig();
    return NextResponse.json({
      nodeEnv: process.env.NODE_ENV,
      hasPaypalClientId: Boolean(clientId),
      paypalClientIdPrefix: clientId ? clientId.slice(0, 6) + "..." : null,
      paypalEnv: environment,
      hasNextPublicPayPalClientId: Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID)
    });
  } catch (error) {
    return NextResponse.json(
      {
        nodeEnv: process.env.NODE_ENV,
        hasPaypalClientId: false,
        paypalClientIdPrefix: null,
        hasNextPublicPayPalClientId: Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
        message: error instanceof Error ? error.message : "PayPal env check failed."
      },
      { status: 500 }
    );
  }
}
