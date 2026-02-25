"use client";

import { type ComponentProps, useEffect, useState } from "react";
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
  const [clientId, setClientId] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      setConfigLoading(true);
      setConfigError(null);
      try {
        const response = await fetch("/api/paypal/client-config", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload?.clientId !== "string") {
          throw new Error(payload?.message || "PayPal client configuration load failed.");
        }
        if (!cancelled) {
          setClientId(payload.clientId.trim());
        }
      } catch (error) {
        if (!cancelled) {
          setClientId("");
          setConfigError(
            error instanceof Error ? error.message : "PayPal client configuration load failed."
          );
        }
      } finally {
        if (!cancelled) {
          setConfigLoading(false);
        }
      }
    };

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  if (configLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70">
        PayPal 설정을 불러오는 중입니다...
      </div>
    );
  }

  if (configError) {
    return (
      <div className="rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-3 text-sm text-red-100">
        {configError}
      </div>
    );
  }

  if (!clientId) {
    return <div>Missing PayPal Client ID (server: PAYPAL_CLIENT_ID)</div>;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "USD",
        intent: "capture",
        components: "buttons",
      }}
    >
      <PaypalButtonInner buttonProps={buttonProps} />
    </PayPalScriptProvider>
  );
}
