"use client";

import { type ComponentProps, useMemo } from "react";
import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer,
  useScriptProviderContext,
  type ReactPayPalScriptOptions,
} from "@paypal/react-paypal-js";

type PaypalButtonProps = {
  buttonProps: ComponentProps<typeof PayPalButtons>;
};

function PaypalButtonInner({ buttonProps }: PaypalButtonProps) {
  const [{ isPending, isRejected, isResolved }] = usePayPalScriptReducer();
  const [scriptContext] = useScriptProviderContext();

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
        {scriptContext.loadingStatusErrorMessage ? (
          <p className="mt-2 break-all text-xs text-red-100/85">
            SDK error: {scriptContext.loadingStatusErrorMessage}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-red-100/75">
          clientId present: {scriptContext.options?.clientId ? "yes" : "no"}
        </p>
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
  const options = useMemo<ReactPayPalScriptOptions>(
    () => ({
      clientId,
      "client-id": clientId,
      currency: "USD",
      intent: "capture",
      components: "buttons",
    }),
    [clientId]
  );

  console.log(
    "PAYPAL CLIENT ID:",
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  );

  if (!clientId) {
    return <div>Missing PayPal Client ID</div>;
  }

  return (
    <PayPalScriptProvider options={options}>
      <PaypalButtonInner buttonProps={buttonProps} />
    </PayPalScriptProvider>
  );
}
