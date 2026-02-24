"use client";

export default function EnvCheckPage() {
  const v = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Env Check</h1>
      <div>NEXT_PUBLIC_PAYPAL_CLIENT_ID: {v ? v.slice(0, 6) + "..." : "undefined"}</div>
      <p>Open /api/env-check to see server-side env.</p>
    </div>
  );
}
