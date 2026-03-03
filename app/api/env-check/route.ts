import { NextResponse } from "next/server";
import { getPayPalClientConfig } from "@/utils/paypal";

const paypalPlanEnvKeys = [
  "PAYPAL_PLAN_ID_MONTHLY",
  "PAYPAL_PLAN_ID_MONTHLY_4900",
  "PAYPAL_PLAN_ID_MONTHLY_13900",
  "PAYPAL_PLAN_ID_MONTHLY_69000"
] as const;

export async function GET() {
  try {
    const { clientId, environment } = getPayPalClientConfig();
    const paypalPlanEnv = Object.fromEntries(
      paypalPlanEnvKeys.map((key) => [key, Boolean(process.env[key]?.trim())])
    );
    return NextResponse.json({
      nodeEnv: process.env.NODE_ENV,
      hasPaypalClientId: Boolean(clientId),
      paypalClientIdPrefix: clientId ? clientId.slice(0, 6) + "..." : null,
      paypalEnv: environment,
      hasNextPublicPayPalClientId: Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
      paypalPlanEnv
    });
  } catch (error) {
    const paypalPlanEnv = Object.fromEntries(
      paypalPlanEnvKeys.map((key) => [key, Boolean(process.env[key]?.trim())])
    );
    return NextResponse.json(
      {
        nodeEnv: process.env.NODE_ENV,
        hasPaypalClientId: false,
        paypalClientIdPrefix: null,
        hasNextPublicPayPalClientId: Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
        paypalPlanEnv,
        message: error instanceof Error ? error.message : "PayPal env check failed."
      },
      { status: 500 }
    );
  }
}
