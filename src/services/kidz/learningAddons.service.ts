import { apiClient, unwrapArray, unwrapData } from "@/lib/kidz/kidz-api-client";
import type {
  CourseReminderDTO,
  DiscussionDTO,
  DiscussionReplyDTO,
  StudentNoteDTO,
} from "@/types/kidz/api.types";

export const learningAddonsService = {
  // --------------------------------------------------
  // Student Notes
  // --------------------------------------------------

  async getNotesByCourse(courseId: string): Promise<StudentNoteDTO[]> {
    const response = await apiClient.get<StudentNoteDTO[]>(
      `/student_notes/course/${courseId}`,
    );
    return unwrapArray<StudentNoteDTO>(response);
  },

  async createNote(payload: {
    courseId: string;
    lessonId?: string;
    content: string;
  }): Promise<StudentNoteDTO> {
    const response = await apiClient.post<StudentNoteDTO>("/student_notes", payload);
    return unwrapData(response);
  },

  async deleteNote(noteId: string): Promise<void> {
    await apiClient.delete(`/student_notes/${noteId}`);
  },

  // --------------------------------------------------
  // Discussions & Q&A
  // --------------------------------------------------

  async getDiscussions(courseId: string): Promise<DiscussionDTO[]> {
    const response = await apiClient.get<DiscussionDTO[]>(
      `/discussions?courseId=${courseId}`,
    );
    return unwrapArray<DiscussionDTO>(response);
  },

  async postQuestion(payload: {
    courseId: string;
    lessonId?: string;
    question: string;
  }): Promise<DiscussionDTO> {
    const response = await apiClient.post<DiscussionDTO>("/discussions", payload);
    return unwrapData(response);
  },

  async replyToDiscussion(
    discussionId: string,
    content: string,
  ): Promise<DiscussionReplyDTO> {
    const response = await apiClient.post<DiscussionReplyDTO>(
      `/discussions/${discussionId}/replies`,
      { content },
    );
    return unwrapData(response);
  },

  // --------------------------------------------------
  // Course Reminders
  // --------------------------------------------------

  async createReminder(payload: {
    courseId: string;
    reminderTime: string;
    message?: string;
  }): Promise<CourseReminderDTO> {
    const response = await apiClient.post<CourseReminderDTO>(
      "/course/reminder/create",
      payload,
    );
    return unwrapData(response);
  },

  async getReminders(): Promise<CourseReminderDTO[]> {
    const response = await apiClient.get<CourseReminderDTO[]>("/course/reminder/get");
    return unwrapArray<CourseReminderDTO>(response);
  },
};
