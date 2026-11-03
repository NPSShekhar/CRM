import { TicketPriority } from '@prisma/client';

export type CategoryType =
  | 'LOGIN'
  | 'PAYMENT'
  | 'ACCOUNT'
  | 'TECHNICAL'
  | 'BUG'
  | 'FEATURE_REQUEST'
  | 'ACCESS'
  | 'PERFORMANCE'
  | 'OTHER';

export class ClassificationService {
  /**
   * Deterministically classifies incoming message subject and body into category and priority.
   * Ready for future LLM / AI plug-in.
   */
  static classify(subject: string, bodyText: string): {
    categoryName: CategoryType;
    priority: TicketPriority;
    confidence: number;
    reasoning: string;
  } {
    const text = `${subject} ${bodyText}`.toLowerCase();

    // Priority Rules
    let priority: TicketPriority = 'MEDIUM';
    let reasoning = 'Standard default prioritization';

    if (
      text.includes('outage') ||
      text.includes('server down') ||
      text.includes('completely unavailable') ||
      text.includes('critical failure') ||
      text.includes('crash') ||
      text.includes('emergency') ||
      text.includes('data loss')
    ) {
      priority = 'URGENT';
      reasoning = 'Severe system unavailability or emergency keyword match';
    } else if (
      text.includes('payment failed') ||
      text.includes('billed twice') ||
      text.includes('charged incorrectly') ||
      text.includes('cannot checkout') ||
      text.includes('urgent') ||
      text.includes('high priority') ||
      text.includes('security')
    ) {
      priority = 'HIGH';
      reasoning = 'Financial impact, security flag or explicit high urgency';
    } else if (
      text.includes('how to') ||
      text.includes('question') ||
      text.includes('feature request') ||
      text.includes('documentation') ||
      text.includes('suggestion')
    ) {
      priority = 'LOW';
      reasoning = 'Informational query or non-blocking request';
    }

    // Category Rules
    let categoryName: CategoryType = 'TECHNICAL';

    if (
      text.includes('login') ||
      text.includes('sign in') ||
      text.includes('password') ||
      text.includes('otp') ||
      text.includes('2fa') ||
      text.includes('credentials')
    ) {
      categoryName = 'LOGIN';
    } else if (
      text.includes('payment') ||
      text.includes('billing') ||
      text.includes('invoice') ||
      text.includes('subscription') ||
      text.includes('refund') ||
      text.includes('credit card')
    ) {
      categoryName = 'PAYMENT';
    } else if (
      text.includes('account') ||
      text.includes('profile') ||
      text.includes('company name') ||
      text.includes('organization')
    ) {
      categoryName = 'ACCOUNT';
    } else if (
      text.includes('slow') ||
      text.includes('latency') ||
      text.includes('timing out') ||
      text.includes('lag')
    ) {
      categoryName = 'PERFORMANCE';
    } else if (
      text.includes('permission') ||
      text.includes('unauthorized') ||
      text.includes('role') ||
      text.includes('access denied') ||
      text.includes('invite')
    ) {
      categoryName = 'ACCESS';
    } else if (
      text.includes('bug') ||
      text.includes('error 500') ||
      text.includes('broken') ||
      text.includes('exception')
    ) {
      categoryName = 'BUG';
    } else if (
      text.includes('feature') ||
      text.includes('could you add') ||
      text.includes('enhancement') ||
      text.includes('request')
    ) {
      categoryName = 'FEATURE_REQUEST';
    }

    return {
      categoryName,
      priority,
      confidence: 0.92,
      reasoning,
    };
  }
}
