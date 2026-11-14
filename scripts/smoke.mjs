import assert from 'node:assert/strict';
import { EventBus } from '../src/js/core/event-bus.js';
import { StorageAdapter } from '../src/js/core/storage.js';
import {
  AllocationRepository,
  HistoryRepository,
  ProfileRepository,
  ToolBoxRepository,
  ToolRepository,
} from '../src/js/data/repositories.js';
import { ConflictError } from '../src/js/domain/errors.js';
import { BoxStatus } from '../src/js/domain/enums.js';
import { isOverdue } from '../src/js/core/format.js';
import { InventoryService } from '../src/js/services/inventory-service.js';

class MemoryStorage {
  #map = new Map();
  getItem(key) {
    return this.#map.has(key) ? this.#map.get(key) : null;
  }
  setItem(key, value) {
    this.#map.set(key, String(value));
  }
  removeItem(key) {
    this.#map.delete(key);
  }
}

const bus = new EventBus();
const events = [];
bus.on('state:changed', (payload) => events.push(payload.scope));

const storage = new StorageAdapter({ storage: new MemoryStorage() });
const inventory = new InventoryService({
  tools: new ToolRepository({ storage }),
  boxes: new ToolBoxRepository({ storage }),
  allocations: new AllocationRepository({ storage }),
  profiles: new ProfileRepository({ storage }),
  history: new HistoryRepository({ storage }),
  bus,
  clock: () => '2026-05-20',
});

const summary = inventory.getInventorySummary();
assert.deepEqual(summary, { total: 41, available: 28, allocated: 11, broken: 2 });

const created = inventory.createTool({
  nome: 'Chave de Fenda Teste',
  categoria: 'Manual',
  total: 4,
  disponivel: 4,
  quebradas: 0,
});
assert.equal(created.id, 'FR-106');
assert.equal(created.alocadas, 0);

inventory.updateTool(created.id, { total: 6, disponivel: 4, quebradas: 1 });
assert.equal(inventory.getTool(created.id).alocadas, 1);

const allocation = inventory.createAllocation({
  empresa: 'Empresa Teste',
  dataAbertura: '2026-05-18',
  dataExpiracao: '2026-05-22',
  boxId: 'CX-002',
  items: [
    { ferramentaId: 'FR-101', quantidade: 2 },
    { ferramentaId: 'FR-101', quantidade: 1 },
  ],
  personIds: ['USR-03'],
});

assert.equal(allocation.id, 'ALC-2026-001');
assert.equal(allocation.itens.length, 1);
assert.equal(allocation.itens[0].quantidade, 3);
assert.equal(inventory.getTool('FR-101').disponivel, 4);
assert.equal(inventory.getTool('FR-101').alocadas, 5);
assert.equal(inventory.getBox('CX-002').status, BoxStatus.ALLOCATED);

assert.throws(
  () => inventory.deleteTool('FR-101'),
  (error) => error instanceof ConflictError,
);
assert.throws(
  () => inventory.deleteBox('CX-002'),
  (error) => error instanceof ConflictError,
);
assert.throws(
  () =>
    inventory.createAllocation({
      empresa: 'Estouro',
      dataAbertura: '2026-05-18',
      dataExpiracao: '2026-05-19',
      boxId: 'CX-003',
      items: [{ ferramentaId: 'FR-102', quantidade: 99 }],
      personIds: [],
    }),
  (error) => error instanceof ConflictError,
);
assert.throws(
  () =>
    inventory.createAllocation({
      empresa: 'Data inválida',
      dataAbertura: '2026-05-20',
      dataExpiracao: '2026-05-19',
      boxId: 'CX-003',
      items: [{ ferramentaId: 'FR-102', quantidade: 1 }],
      personIds: [],
    }),
);

const record = inventory.finalizeAllocation(allocation.id);
assert.equal(record.id, 'ALC-2026-001');
assert.equal(record.dataDevolucao, '2026-05-20');
assert.equal(inventory.getTool('FR-101').disponivel, 7);
assert.equal(inventory.getTool('FR-101').alocadas, 2);
assert.equal(inventory.getBox('CX-002').status, BoxStatus.AVAILABLE);
assert.equal(inventory.listAllocations().length, 1);
assert.equal(inventory.listAllocations()[0].id, 'ALC-2024-001');
assert.equal(inventory.listHistory()[0].id, 'ALC-2026-001');

const profile = inventory.createProfile({
  nome: 'Novo Operador',
  doc: 'RE-9999',
  cargo: 'Operador',
  nivel: 'Operador',
});
assert.equal(profile.id, 'USR-04');

assert.equal(isOverdue('2020-01-01'), true);
assert.equal(isOverdue('2999-01-01'), false);
assert.ok(events.length > 0);

console.log('Smoke test passed:', events.length, 'state events emitted.');