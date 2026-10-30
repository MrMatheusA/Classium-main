import { DomainEvent } from './DomainEvent';

export interface EventHandler {
  handlerName: string;
  subscribedEvents: string[];
  handle(event: DomainEvent): Promise<void>;
}
