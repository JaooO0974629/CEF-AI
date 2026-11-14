import { clone } from '../core/ids.js';
import { BoxStatus } from '../domain/enums.js';
import {
  createSeedAllocations,
  createSeedBoxes,
  createSeedHistory,
  createSeedProfiles,
  createSeedTools,
} from './seed.js';

/**
 * Generic in-memory collection backed by the storage adapter.
 *
 * Implements the Repository pattern: the rest of the application depends on
 * this small, explicit API instead of touching persistence directly.
 */
export class Repository {
  #storage;
  #storageKey;
  #seedFactory;
  #items;

  /**
   * @param {object} options
   * @param {import('../core/storage.js').StorageAdapter} options.storage
   * @param {string} options.storageKey
   * @param {() => object[]} options.seedFactory
   */
  constructor({ storage, storageKey, seedFactory }) {
    this.#storage = storage;
    this.#storageKey = storageKey;
    this.#seedFactory = seedFactory;
    this.#items = this.#load();
  }

  #load() {
    const stored = this.#storage.read(this.#storageKey, null);
    if (Array.isArray(stored)) {
      return stored;
    }
    const seeded = this.#seedFactory();
    this.#storage.write(this.#storageKey, seeded);
    return seeded;
  }

  #persist() {
    this.#storage.write(this.#storageKey, this.#items);
  }

  /** All records, in insertion order (newest first). */
  all() {
    return this.#items.map(clone);
  }

  /** Find the first record matching a predicate, or `null`. */
  find(predicate) {
    const found = this.#items.find(predicate);
    return found ? clone(found) : null;
  }

  /** Find a record by identifier. */
  getById(id) {
    return this.find((item) => item.id === id);
  }

  /** Whether a record matching the predicate exists. */
  exists(predicate) {
    return this.#items.some(predicate);
  }

  /** All identifiers currently in use. */
  ids() {
    return this.#items.map((item) => item.id);
  }

  /** Number of records. */
  get size() {
    return this.#items.length;
  }

  /** Insert a new record at the front of the collection. */
  insert(entity) {
    this.#items.unshift(clone(entity));
    this.#persist();
    return clone(entity);
  }

  /** Apply a partial change to a record and return the updated copy. */
  update(id, changes) {
    const index = this.#items.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    const updated = { ...this.#items[index], ...clone(changes) };
    this.#items[index] = updated;
    this.#persist();
    return clone(updated);
  }

  /** Remove a record by identifier. Returns whether it existed. */
  remove(id) {
    const index = this.#items.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }
    this.#items.splice(index, 1);
    this.#persist();
    return true;
  }

  /** Replace the whole collection (used by maintenance operations). */
  replaceAll(items) {
    this.#items = clone(items);
    this.#persist();
  }
}

export class ToolRepository extends Repository {
  constructor({ storage }) {
    super({ storage, storageKey: 'tools', seedFactory: createSeedTools });
  }
}

export class ToolBoxRepository extends Repository {
  constructor({ storage }) {
    super({ storage, storageKey: 'boxes', seedFactory: createSeedBoxes });
  }

  /** Boxes currently available for a new allocation. */
  findAvailable() {
    return this.all().filter((box) => box.status === BoxStatus.AVAILABLE);
  }
}

export class AllocationRepository extends Repository {
  constructor({ storage }) {
    super({ storage, storageKey: 'allocations', seedFactory: createSeedAllocations });
  }
}

export class ProfileRepository extends Repository {
  constructor({ storage }) {
    super({ storage, storageKey: 'profiles', seedFactory: createSeedProfiles });
  }
}

export class HistoryRepository extends Repository {
  constructor({ storage }) {
    super({ storage, storageKey: 'history', seedFactory: createSeedHistory });
  }
}