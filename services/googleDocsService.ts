
import { htmlToPlainText } from './htmlService';

export interface GoogleDocResponse {
  documentId: string;
  title: string;
}

/**
 * Creates a new Google Doc and populates it with plain text content.
 */
export const createGoogleDoc = async (accessToken: string, title: string, content: string): Promise<GoogleDocResponse> => {
  // 1. Create a new empty document
  const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(error.error?.message || 'Failed to create Google Doc');
  }

  const doc = await createResponse.json();
  const documentId = doc.documentId;

  const plainText = htmlToPlainText(content) || content;
  const requests: any[] = [];

  // Request 1: Insert all plain text
  requests.push({
    insertText: {
      location: { index: 1 },
      text: plainText,
    }
  });

  const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(error.error?.message || 'Failed to update Google Doc content');
  }

  return {
    documentId,
    title,
  };
};

/**
 * Returns the URL to open the Google Doc
 */
export const getGoogleDocUrl = (documentId: string): string => {
  return `https://docs.google.com/document/d/${documentId}/edit`;
};
