type ServiceContentBlock =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'image';
      value: string;
    };

const IMAGE_URL_PATTERN =
  /^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg|avif|bmp)(?:\?[^ \n\r\t]*)?(?:#[^ \n\r\t]*)?$/i;

const normalizeLine = (value: string) => value.trim();

const flushTextBuffer = (buffer: string[], blocks: ServiceContentBlock[]) => {
  if (buffer.length === 0) return;
  const text = buffer.join('\n').trim();
  if (text) {
    blocks.push({ type: 'text', value: text });
  }
  buffer.length = 0;
};

export const isServiceInlineImageUrl = (value: string) =>
  IMAGE_URL_PATTERN.test(normalizeLine(value));

export const parseServiceContentBlocks = (value: string | null | undefined) => {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.trim()) return [] as ServiceContentBlock[];

  const blocks: ServiceContentBlock[] = [];
  const textBuffer: string[] = [];
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const normalized = normalizeLine(line);
    if (normalized && isServiceInlineImageUrl(normalized)) {
      flushTextBuffer(textBuffer, blocks);
      blocks.push({ type: 'image', value: normalized });
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
