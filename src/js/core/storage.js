/**
 * Namespaced JSON persistence on top of the Web Storage API.
 *
 * The adapter is the only place in the application that knows about
 * `localStorage`; repositories depend on this abstraction.
 */
export class StorageAdapter {
  #storage;
  #prefix;

  /**
   * @param {object} [options]
   * @param {Storage} [options.storage] backing store (defaults to localStorage)
   * @param {string} [options.prefix] key namespace
   */
  constructor({ storage = globalThis.localStorage, prefix = 'cef:v2:' } = {}) {
    this.#storage = storage;
    this.#prefix = prefix;
  }

  /** Build the fully qualified key for a collection. */
  #key(name) {
    return `${this.#prefix}${name}`;
  }

  /** Read and parse a collection. Returns `fallback` when absent or invalid. */
  read(name, fallback) {
    try {
      const raw = this.#storage.getItem(this.#key(name));
      if (raw === null) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /** Serialize and persist a collection. */
  write(name, value) {
    try {
      this.#storage.setItem(this.#key(name), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /** Remove a collection. */
  remove(name) {
    try {
      this.#storage.removeItem(this.#key(name));
    } catch {
      /* Storage unavailable: nothing to clean up. */
    }
  }

  /** Whether a collection exists. */
  has(name) {
    try {
      return this.#storage.getItem(this.#key(name)) !== null;
    } catch {
      return false;
    }
  }
}