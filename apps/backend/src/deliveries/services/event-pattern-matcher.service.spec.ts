import { EventPatternMatcherService } from './event-pattern-matcher.service';

describe('EventPatternMatcherService', () => {
  const matcher = new EventPatternMatcherService();

  it('matches an exact pattern', () => {
    expect(matcher.matches('order.completed', 'order.completed')).toBe(true);
  });

  it('does not match a different exact pattern', () => {
    expect(matcher.matches('order.created', 'order.completed')).toBe(false);
  });

  it('matches the bare wildcard against anything', () => {
    expect(matcher.matches('customer.created', '*')).toBe(true);
  });

  it('matches a single-level wildcard', () => {
    expect(matcher.matches('order.completed', 'order.*')).toBe(true);
  });

  it('does not match a single-level wildcard against a deeper path', () => {
    expect(matcher.matches('order.completed.detail', 'order.*')).toBe(false);
  });

  it('does not match a single-level wildcard against a different prefix', () => {
    expect(matcher.matches('invoice.paid', 'order.*')).toBe(false);
  });
});
