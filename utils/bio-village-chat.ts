export const BIO_VILLAGE_CHAT_EVENT_MESSAGE = 'bio-village:chat-message';
export const BIO_VILLAGE_CHAT_EVENT_SEND = 'bio-village:chat-send';
export const BIO_VILLAGE_CHAT_LOG_LIMIT = 24;
export const BIO_VILLAGE_CHAT_MAX_LENGTH = 72;
export const BIO_VILLAGE_CHAT_BUBBLE_TTL_MS = 5200;

export type BioVillageChatTone = 'remote' | 'self' | 'system';

export type BioVillageChatEntry = {
  actorId: string;
  author: string;
  id: string;
  sentAt: number;
  text: string;
  tone: BioVillageChatTone;
};

export type BioVillageChatSendDetail = {
  text: string;
};

export const normalizeBioVillageChatText = (value: string) =>
  value.replace(/\s+/g, ' ').trim().slice(0, BIO_VILLAGE_CHAT_MAX_LENGTH);
