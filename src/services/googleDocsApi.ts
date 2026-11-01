export interface GoogleDocSummary {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface GoogleDocDetail {
  documentId: string;
  title: string;
  bodyText: string;
  revisionId?: string;
}

const DOCS_BASE_URL = 'https://docs.googleapis.com/v1/documents';
const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * List user's Google Docs documents from Google Drive
 */
export async function listGoogleDocs(
  accessToken: string,
  pageSize: number = 20
): Promise<GoogleDocSummary[]> {
  const query = "mimeType='application/vnd.google-apps.document' and trashed=false";
  const params = new URLSearchParams({
    q: query,
    pageSize: pageSize.toString(),
    fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink, iconLink)',
    orderBy: 'modifiedTime desc',
  });

  const res = await fetch(`${DRIVE_BASE_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list Google Docs files (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Extract plain text recursively from Google Docs structural body elements
 */
function extractTextFromDoc(docData: any): string {
  if (!docData?.body?.content) return '';
  let text = '';

  for (const element of docData.body.content) {
    if (element.paragraph?.elements) {
      for (const pElem of element.paragraph.elements) {
        if (pElem.textRun?.content) {
          text += pElem.textRun.content;
        }
      }
    } else if (element.table?.tableRows) {
      for (const row of element.table.tableRows) {
        if (row.tableCells) {
          for (const cell of row.tableCells) {
            text += extractTextFromDoc({ body: { content: cell.content } }) + ' | ';
          }
          text += '\n';
        }
      }
    }
  }

  return text;
}

/**
 * Get detailed content of a Google Doc
 */
export async function getGoogleDocDetail(
  accessToken: string,
  documentId: string
): Promise<GoogleDocDetail> {
  const res = await fetch(`${DOCS_BASE_URL}/${documentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to get Google Doc ${documentId} (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    documentId: data.documentId,
    title: data.title || 'Untitled Document',
    bodyText: extractTextFromDoc(data) || '(Empty Document)',
    revisionId: data.revisionId,
  };
}

/**
 * Create a new Google Document (User confirmation required prior to invocation)
 */
export async function createGoogleDoc(
  accessToken: string,
  title: string,
  initialContent?: string
): Promise<GoogleDocDetail> {
  // Step 1: Create document shell
  const res = await fetch(DOCS_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create Google Doc (${res.status}): ${errorText}`);
  }

  const doc = await res.json();

  // Step 2: Insert initial text content if provided
  if (initialContent && initialContent.trim()) {
    await appendTextToGoogleDoc(accessToken, doc.documentId, initialContent);
  }

  return {
    documentId: doc.documentId,
    title: doc.title,
    bodyText: initialContent || '',
    revisionId: doc.revisionId,
  };
}

/**
 * Append text content to an existing Google Doc via batchUpdate (User confirmation required prior to invocation)
 */
export async function appendTextToGoogleDoc(
  accessToken: string,
  documentId: string,
  textToAppend: string
): Promise<void> {
  // Retrieve document first to get the end index for insertion
  const docRes = await fetch(`${DOCS_BASE_URL}/${documentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!docRes.ok) {
    const errorText = await docRes.text();
    throw new Error(`Failed to fetch doc before append (${docRes.status}): ${errorText}`);
  }

  const docData = await docRes.json();
  const endIndex = docData.body?.content?.[docData.body.content.length - 1]?.endIndex || 1;

  const insertIndex = Math.max(1, endIndex - 1);

  const res = await fetch(`${DOCS_BASE_URL}/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: insertIndex },
            text: `\n\n${textToAppend.trim()}\n`,
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update Google Doc (${res.status}): ${errorText}`);
  }
}
