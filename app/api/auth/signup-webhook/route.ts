import { getSignupNotificationDependencies } from '@/utils/signup-notifier';
import { createSignupWebhookHandler } from '@/utils/signup-webhook';

export const runtime = 'nodejs';
export const maxDuration = 30;

export const POST = createSignupWebhookHandler(getSignupNotificationDependencies());
