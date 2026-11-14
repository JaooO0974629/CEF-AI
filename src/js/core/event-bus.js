/**
 * Minimal publish/subscribe event bus used to decouple the service layer from
 * the presentation layer.
 */
export class EventBus {
  #handlers = new Map();

  /**
   * Subscribe to an event.
   * @returns {() => void} unsubscribe function
   */
  on(eventName, handler) {
    if (!this.#handlers.has(eventName)) {
      this.#handlers.set(eventName, new Set());
    }
    const handlers = this.#handlers.get(eventName);
    handlers.add(handler);

    return () => this.off(eventName, handler);
  }

  /** Subscribe to the next occurrence of an event only. */
  once(eventName, handler) {
    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  /** Remove a previously registered handler. */
  off(eventName, handler) {
    this.#handlers.get(eventName)?.delete(handler);
  }

  /** Notify all handlers registered for an event. */
  emit(eventName, payload) {
    const handlers = this.#handlers.get(eventName);
    if (!handlers) {
      return;
    }
    for (const handler of [...handlers]) {
      handler(payload);
    }
  }

  /** Remove every handler (useful for teardown/tests). */
  clear() {
    this.#handlers.clear();
  }
}