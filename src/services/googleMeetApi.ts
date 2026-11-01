/**
 * Google Meet API Service
 * Handles creating and managing Meet spaces for tactical coordination.
 */

export interface MeetSpace {
  name: string;
  meetingUri: string;
  meetingCode: string;
  config: {
    accessType: string;
    entryPointAccess: string;
  };
}

/**
 * Create a new Google Meet space
 * POST https://meet.googleapis.com/v2/spaces
 */
export const createMeetSpace = async (accessToken: string): Promise<MeetSpace> => {
  const response = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create Meet space');
  }

  return response.json();
};

/**
 * Get information about a Meet space
 * GET https://meet.googleapis.com/v2/spaces/{name}
 */
export const getMeetSpace = async (accessToken: string, spaceName: string): Promise<MeetSpace> => {
  const response = await fetch(`https://meet.googleapis.com/v2/${spaceName}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch Meet space');
  }

  return response.json();
};
