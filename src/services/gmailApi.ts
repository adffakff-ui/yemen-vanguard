export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  labelIds: string[];
  unread: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
  body: string;
  isHtml: boolean;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Fetch current user Gmail profile (email, message counts)
 */
export async function getGmailProfile(accessToken: string): Promise<GmailProfile> {
  const res = await fetch(`${GMAIL_BASE_URL}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch Gmail profile (${res.status}): ${errorText}`);
  }
  return res.json();
}

/**
 * List message IDs and thread IDs with optional search query & labels
 */
export async function listGmailMessages(
  accessToken: string,
  query: string = '',
  maxResults: number = 20,
  pageToken?: string,
  labelIds: string[] = ['INBOX']
): Promise<{ messages: { id: string; threadId: string }[]; nextPageToken?: string; resultSizeEstimate: number }> {
  const params = new URLSearchParams();
  params.set('maxResults', maxResults.toString());
  if (query) params.set('q', query);
  if (pageToken) params.set('pageToken', pageToken);
  labelIds.forEach((lbl) => params.append('labelIds', lbl));

  const res = await fetch(`${GMAIL_BASE_URL}/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list messages (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return {
    messages: data.messages || [],
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate || 0,
  };
}

/**
 * Helper to decode base64url data safely
 */
function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(base64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    return '(Unable to decode message body)';
  }
}

/**
 * Recursively extracts plain text or html from payload
 */
function extractBodyFromPayload(payload: any): { body: string; isHtml: boolean } {
  if (!payload) return { body: '', isHtml: false };

  // Case 1: Simple body directly on payload
  if (payload.body && payload.body.data) {
    const isHtml = payload.mimeType === 'text/html';
    return { body: decodeBase64Url(payload.body.data), isHtml };
  }

  // Case 2: Multipart body with parts
  if (payload.parts && Array.isArray(payload.parts)) {
    // Prefer HTML if available, otherwise plain text
    let plainPart: any = null;
    let htmlPart: any = null;

    const findParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          htmlPart = part;
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
          plainPart = part;
        }
        if (part.parts) {
          findParts(part.parts);
        }
      }
    };

    findParts(payload.parts);

    if (htmlPart) {
      return { body: decodeBase64Url(htmlPart.body.data), isHtml: true };
    }
    if (plainPart) {
      return { body: decodeBase64Url(plainPart.body.data), isHtml: false };
    }
  }

  return { body: payload.snippet || '', isHtml: false };
}

/**
 * Fetch detailed message content
 */
export async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessageDetail> {
  const res = await fetch(`${GMAIL_BASE_URL}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to get message ${messageId} (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  const headers: GmailMessageHeader[] = data.payload?.headers || [];

  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const subject = getHeader('subject') || '(بدون موضوع // No Subject)';
  const from = getHeader('from') || 'Unknown Sender';
  const to = getHeader('to') || '';
  const date = getHeader('date') || '';
  const labelIds = data.labelIds || [];
  const unread = labelIds.includes('UNREAD');

  const { body, isHtml } = extractBodyFromPayload(data.payload);

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    subject,
    from,
    to,
    date,
    labelIds,
    unread,
    body: body || data.snippet || '',
    isHtml,
  };
}

/**
 * List Gmail labels
 */
export async function listGmailLabels(accessToken: string): Promise<GmailLabel[]> {
  const res = await fetch(`${GMAIL_BASE_URL}/labels`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.labels || [];
}

/**
 * Send an email using Gmail API (Requires user confirmation prior to invocation)
 */
export async function sendGmailMessage(
  accessToken: string,
  options: {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
    senderEmail?: string;
  }
): Promise<{ id: string; threadId: string }> {
  // Construct RFC 2822 email
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(options.subject)))}?=`;
  const fromHeader = options.senderEmail ? `From: ${options.senderEmail}\r\n` : '';
  const contentType = options.isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';

  const rawMessage = [
    `To: ${options.to}`,
    fromHeader.trim(),
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${contentType}`,
    'Content-Transfer-Encoding: 7bit',
    '',
    options.body,
  ]
    .filter(Boolean)
    .join('\r\n');

  // Base64url encoding
  const encodedRaw = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch(`${GMAIL_BASE_URL}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedRaw }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to send email (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * Trash a message (User confirmation required)
 */
export async function trashGmailMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  const res = await fetch(`${GMAIL_BASE_URL}/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to trash message (${res.status}): ${errorText}`);
  }
}

/**
 * Permanently delete a message (User confirmation strictly required)
 */
export async function deleteGmailMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  const res = await fetch(`${GMAIL_BASE_URL}/messages/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete message (${res.status}): ${errorText}`);
  }
}
