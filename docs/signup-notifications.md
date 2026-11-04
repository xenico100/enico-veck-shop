# 신규회원 관리자 알림

`POST /api/auth/signup-webhook`는 Supabase `auth.users`의 **INSERT** 이벤트 전용 서버 엔드포인트입니다. 클라이언트 로그인 이벤트에 연결하지 않으므로 로그인을 반복해도 가입 알림을 만들지 않습니다.

운영 환경에는 `SIGNUP_NOTIFICATION_WEBHOOK_SECRET`에 32자 이상의 임의 비밀값을 설정하고, DB webhook의 `x-signup-webhook-secret` 헤더에 같은 값을 지정합니다. 가입 전용 `SIGNUP_NOTIFICATION_RESEND_API_KEY`, `SIGNUP_NOTIFICATION_FROM_EMAIL`, `SIGNUP_NOTIFICATION_EMAIL`을 우선 사용하고, 없을 때만 기존 `RESEND_API_KEY`, `SALES_ALERT_TO_EMAIL`, `SALES_ALERT_FROM_EMAIL` 또는 `RESEND_FROM_EMAIL`로 대체합니다. 가입 전용 키를 설정해도 주문 알림 설정은 활성화되지 않습니다. 비밀값은 공개 환경변수나 저장소에 넣지 않습니다.

`SIGNUP_NOTIFICATION_ENABLED_AT`에 알림 활성화 시각의 ISO 8601 값을 설정하면 그 이전 가입은 알리지 않습니다. 값이 잘못되면 발송을 중단하며, 미설정 시에는 기존 24시간 제한만 적용합니다. 익명 여부는 Auth의 `is_anonymous` boolean을 최우선으로 판단하고, 값이 없는 예전 응답에서만 provider metadata를 참고합니다.

DB webhook은 해당 프로젝트의 `auth.users` INSERT에만 연결하고, 목적지는 운영 사이트의 위 경로로 지정합니다. 본문에는 전체 Auth 레코드를 보내지 않아도 됩니다. 아래 최소 형식이면 충분합니다.

```json
{
  "type": "INSERT",
  "schema": "auth",
  "table": "users",
  "record": { "id": "새 회원의 UUID" }
}
```

서버는 service role로 해당 UUID의 실제 Auth 계정을 다시 확인합니다. 비익명·유효 이메일·생성 24시간 이내 계정만 알리며, 이벤트 본문의 이메일이나 metadata를 신뢰하지 않습니다. 16KiB를 넘는 본문과 잘못된 이벤트는 거절합니다.

메일은 `mongsangin-signup/<UUID>`라는 고정 Resend idempotency key를 사용합니다. 성공 후 Auth `app_metadata.admin_signup_alert_mongsangin_v1`만 업데이트해 재전송을 차단합니다. 기존 권한·provider metadata는 변경하지 않습니다. 외부 메일이나 marker 저장이 실패하면 503을 반환하므로 재시도 체계에서 같은 이벤트를 재전송할 수 있습니다. Resend의 idempotency 보존기간과 같은 24시간 뒤에는 오래된 이벤트를 보내지 않습니다.

본문은 변하지 않는 회원 ID·가입 시각·인증된 관리자 링크를 사용해 이메일 주소를 수정한 뒤 재시도해도 같은 요청을 유지합니다. HTTP 성공 코드와 유효한 Resend 영수증 ID가 모두 확인된 경우에만 발송을 수락한 것으로 기록합니다.

DB webhook은 외부 메일 응답을 가입 트랜잭션에 동기로 연결하지 않는 비동기 전달을 사용해야 합니다. 메일 요청 timeout은 10초이며, webhook 호출 timeout은 이보다 넉넉하게 지정합니다. 이 코드를 배포하는 것과 DB webhook/운영 환경변수를 실제 설정하는 것은 별도 단계입니다.

동일한 비밀 헤더로 `POST /api/auth/signup-sweep`를 주기적으로 호출하면 발송되지 않은 신규 계정을 재확인합니다. 페이지당 1,000명·최대 20페이지, 한 번에 최대 10명·동시 2건으로 제한하고 시간 예산이 부족하면 다음 호출로 남깁니다. 응답에는 `notified`, `skipped`, `failed`, `scanned`, `pages`, `anonymous`, `emailMissing`, `partial`, `more` 집계만 포함합니다. 한도·실패로 미처리 작업이 있으면 `partial`과 `more`는 true입니다.

검증은 `node --test test/admin-member-profiles.test.mjs test/signup-webhook.test.mjs`로 수행합니다. 테스트는 Auth와 Resend를 mock하며 실계정 생성·실메일 발송을 하지 않습니다.
