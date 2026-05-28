export const BIO_VILLAGE_CHAT_EVENT_MESSAGE = 'bio-village:chat-message';
export const BIO_VILLAGE_CHAT_EVENT_SEND = 'bio-village:chat-send';
export const BIO_VILLAGE_CHAT_ROOM = 'bio-village';
export const BIO_VILLAGE_CHAT_HISTORY_LIMIT = 24;
export const BIO_VILLAGE_CHAT_LOG_LIMIT = BIO_VILLAGE_CHAT_HISTORY_LIMIT;
export const BIO_VILLAGE_CHAT_MAX_LENGTH = 72;
export const BIO_VILLAGE_CHAT_BUBBLE_TTL_MS = 5200;
export const BIO_VILLAGE_CHAT_STORAGE_RETENTION_HOURS = 6;
export const BIO_VILLAGE_CHAT_STORAGE_KEEP_RECENT = 300;

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
