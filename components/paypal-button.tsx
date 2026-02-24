"use client";

import { type ComponentProps, useEffect, useMemo } from "react";
import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";

type PaypalButtonProps = {
  buttonProps: ComponentProps<typeof PayPalButtons>;
};

function PaypalButtonInner({ buttonProps }: PaypalButtonProps) {
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();

  if (isPending) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
        PayPal 버튼을 불러오는 중입니다...
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-3 text-sm text-red-100">
        PayPal SDK 로드에 실패했습니다. 개발 서버를 재시작하고(환경변수 반영), 광고 차단기/추적 차단을 잠시 끈 뒤 다시 시도해 주세요.
      </div>
    );
  }

  return (
    <PayPalButtons
      {...buttonProps}
      disabled={buttonProps.disabled || !isResolved}
    />
  );
}

export default function PaypalButton({ buttonProps }: PaypalButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ?? "";
  const sdkUrlForDiagnostics = useMemo(() => {
    const maskedClientId = clientId ? `${clientId.slice(0, 6)}...` : "missing";
    return `https://www.paypal.com/sdk/js?client-id=${maskedClientId}&currency=USD&intent=capture&components=buttons`;
  }, [clientId]);

  useEffect(() => {
    const host = window.location.hostname;
    const siteMode =
      host === "localhost" || host === "127.0.0.1" ? "localhost" : "production-like";

    console.log("[PayPal Diagnostic] client env", {
      sdkUrl: sdkUrlForDiagnostics,
      host,
      siteMode,
      hasClientId: Boolean(clientId),
      clientIdPrefix: clientId ? `${clientId.slice(0, 6)}...` : null,
      environment: "sandbox expected when using sandbox client id",
    });
  }, [clientId, sdkUrlForDiagnostics]);

  if (!clientId) {
    return <div>Missing PayPal Client ID</div>;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: "USD",
        intent: "capture",
        components: "buttons",
      }}
    >
      <PaypalButtonInner buttonProps={buttonProps} />
    </PayPalScriptProvider>
  );
}
