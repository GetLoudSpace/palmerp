// src/modules/education/lib/models.ts
export type EduOutboxMessage = {
  id: string; // uuid
  studentId: string;
  professorId: string;
  messageId?: string; // WhatsApp message ID if available
  content: string;
  sentAt: string; // ISO timestamp
};
