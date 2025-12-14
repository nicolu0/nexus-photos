// src/lib/messageHelpers.ts
export type GmailHeader = {
  name: string;
  value: string;
};

export type GmailBody = {
  size?: number;
  data?: string;           // base64url-encoded
  attachmentId?: string;
};

export type GmailMessagePart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailMessagePart[];
};

export type GmailPayload = GmailMessagePart;

export type GmailMessage = {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  payload: GmailPayload;
  // allow extra fields from Gmail we don't care about
  [key: string]: unknown;
};

export type ExtractedContent = {
  text: string;
};

export type SimplifiedMessage = {
  id: string;
  // subject: string;
  // from: string;
  // to: string;
  text: string;
};


export function decodeBase64Url(data: string | undefined | null): string {
  if (!data) return '';
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(base64);
  try {
    // handle UTF-8 safely
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return decodeURIComponent(escape(decoded));
  } catch {
    return decoded;
  }
}

export function extractTextFromPayload(payload: GmailPayload | undefined): ExtractedContent {
	console.log('payload: ', payload);
  const textParts: string[] = [];

  function walk(part: GmailMessagePart | undefined): void {
    if (!part) return;

    if (part.mimeType === 'text/plain' && part.body?.data) {
      textParts.push(decodeBase64Url(part.body.data));
    } 
    if (part.parts) {
      part.parts.forEach(walk);
    }
  }

  walk(payload);

  return {
    text: textParts.join('\n\n')
  };
}

export function simplifyThread(thread): SimplifiedMessage {
  console.log('THREAD: ', thread);
  console.log('THREAD FROM SIMPLIFY MESSAGE: ', thread.messages);
  const messages = thread.messages;
  const processed = messages.map(m => extractTextFromPayload(m.payload));
  console.log('text extracted messages: ', processed);
  // get thread messages, extract text for each using map, join
  const text = processed
  	.map((m) => m.text)
	.filter(Boolean)
	.join('\n\n');

  return {
    id: thread.id,
    text
  };

}
