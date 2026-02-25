export default function EnvCheckPage() {
  const hasPayPalJsClientId = Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Env Check</h1>
      <div>
        PayPal JS SDK client env:{" "}
        {hasPayPalJsClientId ? "NEXT_PUBLIC_PAYPAL_CLIENT_ID detected" : "NEXT_PUBLIC_PAYPAL_CLIENT_ID missing"}
      </div>
      <p>Open /api/env-check to verify server-side PAYPAL_CLIENT_ID / PAYPAL_ENV.</p>
    </div>
  );
}
