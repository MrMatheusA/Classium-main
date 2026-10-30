import { DomainEvent, EventName } from './DomainEvent';
import { EventHandler } from './EventHandler';

export class EventBus {
  private static instance: EventBus;
  private subscribers: Map<string, EventHandler[]>;
  private handlerCache: Map<string, EventHandler>;
  private eventLog: DomainEvent[];

  private constructor() {
    this.subscribers = new Map<string, EventHandler[]>();
    this.handlerCache = new Map<string, EventHandler>();
    this.eventLog = [];
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe(eventName: EventName | string, handler: EventHandler): void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    const handlers = this.subscribers.get(eventName)!;
    if (!handlers.some(h => h.handlerName === handler.handlerName)) {
      handlers.push(handler);
      this.handlerCache.set(handler.handlerName, handler);
      console.log(`[EventBus] Handler '${handler.handlerName}' subscribed to event '${eventName}'`);
    }
  }

  public unsubscribe(eventName: EventName | string, handlerName: string): void {
    if (!this.subscribers.has(eventName)) return;
    const handlers = this.subscribers.get(eventName)!;
    const filtered = handlers.filter(h => h.handlerName !== handlerName);
    this.subscribers.set(eventName, filtered);
    console.log(`[EventBus] Handler '${handlerName}' unsubscribed from event '${eventName}'`);
  }

  public async publish(event: DomainEvent): Promise<void> {
    this.eventLog.push(event);
    console.log(`[EventBus] Publishing event: ${event.eventName} (ID: ${event.eventId})`, {
      schoolId: event.schoolId,
      timestamp: event.timestamp,
    });
    await this.dispatch(event);
  }

  public async dispatch(event: DomainEvent): Promise<void> {
    const handlers = this.subscribers.get(event.eventName) || [];
    if (handlers.length === 0) {
      console.log(`[EventBus] No handlers registered for event: ${event.eventName}`);
      return;
    }

    for (const handler of handlers) {
      await this.executeWithRetry(handler, event);
    }
  }

  private async executeWithRetry(handler: EventHandler, event: DomainEvent, maxRetries = 3): typeof Promise.prototype {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        attempt++;
        await handler.handle(event);
        return;
      } catch (error: any) {
        console.warn(`[EventBus] Handler '${handler.handlerName}' failed for event '${event.eventName}' (Attempt ${attempt}/${maxRetries}):`, error.message || error);
        if (attempt >= maxRetries) {
          console.error(`[EventBus] CRITICAL: Handler '${handler.handlerName}' exhausted all retries for event '${event.eventName}'.`);
        } else {
          // Wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
    }
  }

  public getEventDocumentation(): Record<string, string[]> {
    const doc: Record<string, string[]> = {};
    for (const [eventName, handlers] of this.subscribers.entries()) {
      doc[eventName] = handlers.map(h => h.handlerName);
    }
    return doc;
  }

  public getRecentEvents(limit = 50): DomainEvent[] {
    return this.eventLog.slice(-limit);
  }
}

// ============================================================================
// Independent Handlers Implementation
// ============================================================================

export class DashboardHandler implements EventHandler {
  public handlerName = 'DashboardHandler';
  public subscribedEvents = ['EnrollmentCompleted', 'StudentCreated', 'AttendanceCreated', 'GradeCreated'];

  async handle(event: DomainEvent): Promise<void> {
    console.log(`[DashboardHandler] Updating analytics/dashboard metrics for event: ${event.eventName}`, { schoolId: event.schoolId });
  }
}

export class NotificationHandler implements EventHandler {
  public handlerName = 'NotificationHandler';
  public subscribedEvents = ['EnrollmentCompleted', 'CommunicationCreated', 'AttendanceUpdated', 'DigitalSignatureCompleted'];

  async handle(event: DomainEvent): Promise<void> {
    console.log(`[NotificationHandler] Dispatching notification for event: ${event.eventName}`, event.payload);
  }
}

export class AuditHandler implements EventHandler {
  public handlerName = 'AuditHandler';
  public subscribedEvents = [
    'EnrollmentCompleted', 'StudentCreated', 'GuardianLinked', 'FamilyAccountCreated',
    'AttendanceCreated', 'GradeCreated', 'CommunicationCreated', 'AcademicYearOpened', 'AcademicYearClosed'
  ];

  async handle(event: DomainEvent): Promise<void> {
    console.log(`[AuditHandler] Registering secure audit log for domain event: ${event.eventName}`, {
      timestamp: event.timestamp,
      schoolId: event.schoolId,
    });
  }
}

export class AnalyticsHandler implements EventHandler {
  public handlerName = 'AnalyticsHandler';
  public subscribedEvents = ['EnrollmentCompleted', 'AttendanceCreated', 'GradeCreated', 'TeacherAssigned'];

  async handle(event: DomainEvent): Promise<void> {
    console.log(`[AnalyticsHandler] Processing metrics for event: ${event.eventName}`);
  }
}

export class RealtimeHandler implements EventHandler {
  public handlerName = 'RealtimeHandler';
  public subscribedEvents = ['CommunicationCreated', 'CommunicationDelivered', 'CommunicationRead', 'DigitalSignatureCompleted', 'EnrollmentCompleted'];

  async handle(event: DomainEvent): Promise<void> {
    console.log(`[RealtimeHandler] Broadcasting real-time packet for event: ${event.eventName}`, { schoolId: event.schoolId });
  }
}

export class FamilyHandler implements EventHandler {
  public handlerName = 'FamilyHandler';
  public subscribedEvents = ['EnrollmentCompleted', 'GuardianLinked', 'FamilyAccountCreated', 'CommunicationCreated'];

  async handle(event: DomainEvent): Promise<void> {
    console.log(`[FamilyHandler] Updating Family Portal state for event: ${event.eventName}`);
  }
}

// Register default handlers on startup
export function registerDefaultEventHandlers(bus: EventBus): void {
  const dashboard = new DashboardHandler();
  const notification = new NotificationHandler();
  const audit = new AuditHandler();
  const analytics = new AnalyticsHandler();
  const realtime = new RealtimeHandler();
  const family = new FamilyHandler();

  const allEvents: EventName[] = [
    'EnrollmentCompleted',
    'StudentCreated',
    'GuardianLinked',
    'FamilyAccountCreated',
    'AttendanceCreated',
    'AttendanceUpdated',
    'GradeCreated',
    'GradeUpdated',
    'CommunicationCreated',
    'CommunicationDelivered',
    'CommunicationRead',
    'DigitalSignatureCompleted',
    'TeacherAssigned',
    'ClassCreated',
    'AcademicYearOpened',
    'AcademicYearClosed',
  ];

  for (const ev of allEvents) {
    if (dashboard.subscribedEvents.includes(ev)) bus.subscribe(ev, dashboard);
    if (notification.subscribedEvents.includes(ev)) bus.subscribe(ev, notification);
    if (audit.subscribedEvents.includes(ev)) bus.subscribe(ev, audit);
    if (analytics.subscribedEvents.includes(ev)) bus.subscribe(ev, analytics);
    if (realtime.subscribedEvents.includes(ev)) bus.subscribe(ev, realtime);
    if (family.subscribedEvents.includes(ev)) bus.subscribe(ev, family);
  }

  console.log('[EventBus] Default event handlers registered successfully.');
}
