import { AggregateRoot, DomainError } from '@edulaunch/ddd';

export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketCategory = 'wrong_data' | 'account' | 'other';

interface TicketProps {
  userId: string;
  category: TicketCategory;
  programId: string | null;
  message: string;
  assignedAdminId: string | null;
  adminReply: string | null;
  status: TicketStatus;
  closedAt: Date | null;
}

export class SupportTicket extends AggregateRoot<string, TicketProps> {
  static open(id: string, input: { userId: string; category: TicketCategory; programId: string | null; message: string }): SupportTicket {
    if (input.category === 'wrong_data' && !input.programId) throw new DomainError('invalid_ticket', 'Say which programme has wrong data');
    if (input.message.trim().length < 10) throw new DomainError('invalid_ticket', 'Please describe the problem in a sentence or two');
    return new SupportTicket(id, { ...input, message: input.message.trim(), assignedAdminId: null, adminReply: null, status: 'open', closedAt: null });
  }

  static restore(id: string, props: TicketProps): SupportTicket {
    return new SupportTicket(id, props);
  }

  get status(): TicketStatus {
    return this.props.status;
  }

  claim(adminId: string): void {
    if (this.props.status === 'closed') throw new DomainError('conflict', 'This ticket is already closed');
    this.props.assignedAdminId = adminId;
    this.props.status = 'in_progress';
  }

  close(adminId: string, reply: string): void {
    if (this.props.status === 'closed') throw new DomainError('conflict', 'This ticket is already closed');
    if (this.props.assignedAdminId && this.props.assignedAdminId !== adminId) throw new DomainError('forbidden', 'Another admin is handling this ticket');
    if (reply.trim().length < 5) throw new DomainError('reply_required', 'Tell the student what was done');
    this.props.assignedAdminId = adminId;
    this.props.adminReply = reply.trim();
    this.props.status = 'closed';
    this.props.closedAt = new Date();
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }
}
