type ServiceContentBlock =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'image';
      value: string;
    };

const URL_LINE_PATTERN = /^https?:\/\/\S+$/i;
const MARKDOWN_IMAGE_PATTERN = /^!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/i;
const ANY_URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const IMAGE_EXTENSION_PATTERN =
  /\.(?:png|jpe?g|gif|webp|svg|avif|bmp|heic|heif)(?:$|[?#])/i;

const normalizeLine = (value: string) => value.trim();

const removeWrappingBrackets = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>') && trimmed.length > 2) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const isKnownServiceImagePath = (value: string) => {
  const lower = value.toLowerCase();
  return (
    lower.includes('/storage/v1/object/public/service-images/') ||
    lower.includes('/storage/v1/object/sign/service-images/') ||
    lower.includes('/service-images/')
  );
};

const isLikelyImageUrl = (value: string) => {
  if (IMAGE_EXTENSION_PATTERN.test(value)) return true;
  return isKnownServiceImagePath(value);
};

const parseInlineImageUrl = (line: string) => {
  const normalized = normalizeLine(line);
  if (!normalized) return null;

  const markdownMatch = normalized.match(MARKDOWN_IMAGE_PATTERN);
  if (markdownMatch?.[1]) {
    const markdownUrl = removeWrappingBrackets(markdownMatch[1]);
    return isLikelyImageUrl(markdownUrl) ? markdownUrl : null;
  }

  const plainUrl = removeWrappingBrackets(normalized);
  if (!URL_LINE_PATTERN.test(plainUrl)) return null;
  return isLikelyImageUrl(plainUrl) ? plainUrl : null;
};

const trimUrlTrailingPunctuation = (value: string) => value.replace(/[.,!?;:]+$/g, '');

const splitLineByInlineImageUrls = (line: string): ServiceContentBlock[] | null => {
  const blocks: ServiceContentBlock[] = [];
  let cursor = 0;
  let foundImage = false;

  const matches = Array.from(line.matchAll(ANY_URL_PATTERN));
  for (const match of matches) {
    const raw = match[0];
    const start = match.index ?? -1;
    if (start < 0) continue;

    const candidate = trimUrlTrailingPunctuation(raw);
    if (!isLikelyImageUrl(candidate)) continue;

    foundImage = true;
    if (start > cursor) {
      const textBefore = line.slice(cursor, start);
      if (textBefore.trim()) {
        blocks.push({ type: 'text', value: textBefore.trim() });
      }
    }

    blocks.push({ type: 'image', value: candidate });
    cursor = start + raw.length;
  }

  if (!foundImage) return null;

  if (cursor < line.length) {
    const textAfter = line.slice(cursor);
    if (textAfter.trim()) {
      blocks.push({ type: 'text', value: textAfter.trim() });
    }
  }

  return blocks.length > 0 ? blocks : null;
};

const flushTextBuffer = (buffer: string[], blocks: ServiceContentBlock[]) => {
  if (buffer.length === 0) return;
  const text = buffer.join('\n').trim();
  if (text) {
    blocks.push({ type: 'text', value: text });
  }
  buffer.length = 0;
};

export const isServiceInlineImageUrl = (value: string) =>
  Boolean(parseInlineImageUrl(value));

export const parseServiceContentBlocks = (value: string | null | undefined) => {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.trim()) return [] as ServiceContentBlock[];

  const blocks: ServiceContentBlock[] = [];
  const textBuffer: string[] = [];
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const parsedImageUrl = parseInlineImageUrl(line);
    if (parsedImageUrl) {
      flushTextBuffer(textBuffer, blocks);
      blocks.push({ type: 'image', value: parsedImageUrl });
      continue;
    }

    const mixedBlocks = splitLineByInlineImageUrls(line);
    if (mixedBlocks) {
      flushTextBuffer(textBuffer, blocks);
      blocks.push(...mixedBlocks);
      continue;
    }
    textBuffer.push(line);
  }

  flushTextBuffer(textBuffer, blocks);
  return blocks;
};

export const extractServiceContentText = (value: string | null | undefined) => {
  const blocks = parseServiceContentBlocks(value);
  const text = blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.value.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
  return text;
};

export type { ServiceContentBlock };
