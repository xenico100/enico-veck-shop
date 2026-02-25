export default function EnvCheckPage() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Env Check</h1>
      <div>
        This page no longer reads client-side PayPal env vars directly.
      </div>
      <p>Open /api/env-check to verify server-side PAYPAL_CLIENT_ID / PAYPAL_ENV.</p>
    </div>
  );
}
