// Google Classroom API Service

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId?: string;
  creationTime?: string;
  updateTime?: string;
  enrollmentCode?: string;
  courseState?: 'COURSE_STATE_UNSPECIFIED' | 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
  alternateLink?: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
  guardiansEnabled?: boolean;
}

export interface ClassroomCourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  materials?: any[];
  state?: 'COURSE_WORK_STATE_UNSPECIFIED' | 'PUBLISHED' | 'DRAFT' | 'DELETED';
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  maxPoints?: number;
  workType?: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
  submissionModificationMode?: string;
}

export interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  text: string;
  materials?: any[];
  state?: 'ANNOUNCEMENT_STATE_UNSPECIFIED' | 'PUBLISHED' | 'DRAFT';
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  creatorUserId?: string;
}

export interface ClassroomUserProfile {
  id: string;
  name?: {
    givenName?: string;
    familyName?: string;
    fullName?: string;
  };
  emailAddress?: string;
  photoUrl?: string;
}

export interface ClassroomStudent {
  courseId: string;
  userId: string;
  profile?: ClassroomUserProfile;
}

export interface ClassroomTeacher {
  courseId: string;
  userId: string;
  profile?: ClassroomUserProfile;
}

const CLASSROOM_BASE_URL = 'https://classroom.googleapis.com/v1';

/**
 * List active & accessible courses for the user
 */
export async function listCourses(accessToken: string): Promise<ClassroomCourse[]> {
  const response = await fetch(`${CLASSROOM_BASE_URL}/courses?courseStates=ACTIVE`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to list courses (${response.status})`);
  }

  const data = await response.json();
  return data.courses || [];
}

/**
 * Get single course details by ID
 */
export async function getCourse(accessToken: string, courseId: string): Promise<ClassroomCourse> {
  const response = await fetch(`${CLASSROOM_BASE_URL}/courses/${courseId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch course ${courseId}`);
  }

  return response.json();
}

/**
 * List coursework/assignments in a course
 */
export async function listCourseWork(accessToken: string, courseId: string): Promise<ClassroomCourseWork[]> {
  const response = await fetch(`${CLASSROOM_BASE_URL}/courses/${courseId}/courseWork`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to list coursework for course ${courseId}`);
  }

  const data = await response.json();
  return data.courseWork || [];
}

/**
 * List announcements in a course
 */
export async function listAnnouncements(accessToken: string, courseId: string): Promise<ClassroomAnnouncement[]> {
  const response = await fetch(`${CLASSROOM_BASE_URL}/courses/${courseId}/announcements`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to list announcements for course ${courseId}`);
  }

  const data = await response.json();
  return data.announcements || [];
}

/**
 * Create a new announcement in a course
 */
export async function createAnnouncement(
  accessToken: string,
  courseId: string,
  text: string
): Promise<ClassroomAnnouncement> {
  const response = await fetch(`${CLASSROOM_BASE_URL}/courses/${courseId}/announcements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      state: 'PUBLISHED',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to post announcement to course ${courseId}`);
  }

  return response.json();
}

/**
 * Create a new tactical assignment (coursework) in a course
 */
export async function createCourseWork(
  accessToken: string,
  courseId: string,
  title: string,
  description: string,
  maxPoints: number = 100
): Promise<ClassroomCourseWork> {
  const response = await fetch(`${CLASSROOM_BASE_URL}/courses/${courseId}/courseWork`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      description,
      maxPoints,
      workType: 'ASSIGNMENT',
      state: 'PUBLISHED',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to create assignment in course ${courseId}`);
  }

  return response.json();
}

/**
 * List enrolled students in a course
 */
export async function listStudents(accessToken: string, courseId: string): Promise<ClassroomStudent[]> {
  const response = await fetch(`${CLASSROOM_BASE_URL}/courses/${courseId}/students`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to list students in course ${courseId}`);
  }

  const data = await response.json();
  return data.students || [];
}

/**
 * List teachers in a course
 */
export async function listTeachers(accessToken: string, courseId: string): Promise<ClassroomTeacher[]> {
  const response = await fetch(`${CLASSROOM_BASE_URL}/courses/${courseId}/teachers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to list teachers in course ${courseId}`);
  }

  const data = await response.json();
  return data.teachers || [];
}
