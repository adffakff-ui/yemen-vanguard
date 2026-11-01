export interface ChatSpace {
  name: string; // e.g. "spaces/AAAAxxxxxx"
  type: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  displayName?: string;
  singleUserBotDm?: boolean;
  spaceThreadingState?: string;
  externalUserAllowed?: boolean;
}

export interface ChatUser {
  name: string;
  displayName: string;
  avatarCustomUrl?: string;
  type: 'HUMAN' | 'BOT';
}

export interface ChatMessage {
  name: string; // e.g. "spaces/AAAA/messages/CCCC"
  sender: ChatUser;
  createTime: string;
  text?: string;
  thread?: {
    name: string;
  };
}

const CHAT_BASE_URL = 'https://chat.googleapis.com/v1';

export const CHAT_CONSOLE_CONFIG_URL =
  'https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=gen-lang-client-0566913084';

/**
 * Handle HTTP error responses specifically for Google Chat API prerequisites
 */
async function handleChatApiError(res: Response, context: string): Promise<never> {
  const errorText = await res.text();
  let errorJson: any = null;
  try {
    errorJson = JSON.parse(errorText);
  } catch {
    // raw text
  }

  const message = errorJson?.error?.message || errorText;
  if (res.status === 404 && message.includes('Google Chat app not found')) {
    throw new Error(
      `GOOGLE_CHAT_APP_NOT_FOUND: ${message}`
    );
  }

  if (res.status === 403 || res.status === 401) {
    if (message.includes('Google Workspace') || message.includes('consumer account')) {
      throw new Error(
        `GOOGLE_CHAT_WORKSPACE_REQUIRED: Google Chat API requires a Google Workspace (business/enterprise) account.`
      );
    }
  }

  throw new Error(`${context} (${res.status}): ${message}`);
}

/**
 * List Google Chat Spaces accessible by the user
 */
export async function listChatSpaces(accessToken: string): Promise<ChatSpace[]> {
  const res = await fetch(`${CHAT_BASE_URL}/spaces`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    await handleChatApiError(res, 'Failed to list Google Chat spaces');
  }

  const data = await res.json();
  return data.spaces || [];
}

/**
 * List messages in a specific Google Chat space
 */
export async function listChatMessages(
  accessToken: string,
  spaceName: string, // e.g. "spaces/AAAAxxxxxx"
  pageSize: number = 20
): Promise<ChatMessage[]> {
  const params = new URLSearchParams();
  params.set('pageSize', pageSize.toString());

  const res = await fetch(`${CHAT_BASE_URL}/${spaceName}/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    await handleChatApiError(res, `Failed to list messages in ${spaceName}`);
  }

  const data = await res.json();
  return data.messages || [];
}

/**
 * Send a text message to a Google Chat space (User confirmation required prior to calling)
 */
export async function sendChatMessage(
  accessToken: string,
  spaceName: string, // e.g. "spaces/AAAAxxxxxx"
  text: string
): Promise<ChatMessage> {
  const res = await fetch(`${CHAT_BASE_URL}/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    await handleChatApiError(res, `Failed to send message to ${spaceName}`);
  }

  return res.json();
}

/**
 * Create a new Google Chat Space for tactical team collaboration
 */
export async function createChatSpace(
  accessToken: string,
  displayName: string
): Promise<ChatSpace> {
  const res = await fetch(`${CHAT_BASE_URL}/spaces`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spaceType: 'SPACE',
      displayName,
    }),
  });

  if (!res.ok) {
    await handleChatApiError(res, 'Failed to create Google Chat space');
  }

  return res.json();
}
