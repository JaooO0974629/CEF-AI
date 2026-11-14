import { nextId } from '../core/ids.js';
import { todayIso } from '../core/format.js';
import { ConflictError, NotFoundError } from '../domain/errors.js';
import { BoxStatus, StateScope } from '../domain/enums.js';
import {
  applyProfileChanges,
  applyToolChanges,
  createAllocation,
  createAllocationItems,
  createProfile,
  createServiceRecord,
  createTool,
  createToolBox,
} from '../domain/entities.js';
import {
  requireChronologicalOrder,
  requireIsoDate,
  requireText,
} from '../domain/validation.js';

/**
 * Application service holding every business rule of the CEF domain.
 *
 * It orchestrates repositories and publishes state changes on the event bus;
 * it never touches the DOM.
 */
export class InventoryService {
  #tools;
  #boxes;
  #allocations;
  #profiles;
  #history;
  #bus;
  #clock;

  /**
   * @param {object} dependencies
   * @param {import('../data/repositories.js').ToolRepository} dependencies.tools
   * @param {import('../data/repositories.js').ToolBoxRepository} dependencies.boxes
   * @param {import('../data/repositories.js').AllocationRepository} dependencies.allocations
   * @param {import('../data/repositories.js').ProfileRepository} dependencies.profiles
   * @param {import('../data/repositories.js').HistoryRepository} dependencies.history
   * @param {import('../core/event-bus.js').EventBus} dependencies.bus
   * @param {() => string} [dependencies.clock] injectable clock (ISO date)
   */
  constructor({ tools, boxes, allocations, profiles, history, bus, clock = todayIso }) {
    this.#tools = tools;
    this.#boxes = boxes;
    this.#allocations = allocations;
    this.#profiles = profiles;
    this.#history = history;
    this.#bus = bus;
    this.#clock = clock;
  }

  /* ------------------------------------------------------------------ */
  /* Queries                                                             */
  /* ------------------------------------------------------------------ */

  listTools() {
    return this.#tools.all();
  }

  getTool(id) {
    return this.#requireTool(id);
  }

  listBoxes() {
    return this.#boxes.all();
  }

  listAvailableBoxes() {
    return this.#boxes.findAvailable();
  }

  getBox(id) {
    return this.#requireBox(id);
  }

  listAllocations() {
    return this.#allocations.all();
  }

  getAllocation(id) {
    return this.#requireAllocation(id);
  }

  listHistory() {
    return this.#history.all();
  }

  getServiceRecord(id) {
    return this.#requireHistory(id);
  }

  listProfiles() {
    return this.#profiles.all();
  }

  getProfile(id) {
    return this.#requireProfile(id);
  }

  /** Aggregate counters shown on the inventory dashboard. */
  getInventorySummary() {
    return this.#tools.all().reduce(
      (summary, tool) => {
        summary.total += tool.total;
        summary.available += tool.disponivel;
        summary.allocated += tool.alocadas;
        summary.broken += tool.quebradas;
        return summary;
      },
      { total: 0, available: 0, allocated: 0, broken: 0 },
    );
  }

  /* ------------------------------------------------------------------ */
  /* Tools                                                               */
  /* ------------------------------------------------------------------ */

  createTool(input) {
    const tool = createTool({
      ...input,
      id: nextId('FR', this.#tools.ids(), 3),
    });
    this.#tools.insert(tool);
    this.#notify(StateScope.TOOLS);
    return tool;
  }

  updateTool(id, input) {
    const current = this.#requireTool(id);
    const updated = applyToolChanges(current, input);
    this.#tools.update(id, updated);
    this.#notify(StateScope.TOOLS);
    return updated;
  }

  deleteTool(id) {
    const tool = this.#requireTool(id);
    if (tool.alocadas > 0) {
      throw new ConflictError(
        `Não é possível excluir "${tool.nome}" pois existem ${tool.alocadas} unidade(s) alocada(s) em serviço.`,
      );
    }
    this.#tools.remove(id);
    this.#notify(StateScope.TOOLS);
  }

  /* ------------------------------------------------------------------ */
  /* Tool boxes                                                          */
  /* ------------------------------------------------------------------ */

  createBox(input) {
    const id = requireText(input.id, 'Código da caixa').toUpperCase();
    if (this.#boxes.exists((box) => box.id === id)) {
      throw new ConflictError(`Já existe uma caixa cadastrada com o código ${id}.`);
    }
    const box = createToolBox({ id, nome: input.nome });
    this.#boxes.insert(box);
    this.#notify(StateScope.BOXES);
    return box;
  }

  deleteBox(id) {
    const box = this.#requireBox(id);
    if (box.status === BoxStatus.ALLOCATED) {
      throw new ConflictError('Não é possível excluir esta caixa pois ela está alocada em um serviço ativo.');
    }
    this.#boxes.remove(id);
    this.#notify(StateScope.BOXES);
  }

  /* ------------------------------------------------------------------ */
  /* Profiles                                                            */
  /* ------------------------------------------------------------------ */

  createProfile(input) {
    const profile = createProfile({
      ...input,
      id: nextId('USR', this.#profiles.ids(), 2),
    });
    this.#profiles.insert(profile);
    this.#notify(StateScope.PROFILES);
    return profile;
  }

  updateProfile(id, input) {
    const current = this.#requireProfile(id);
    const updated = applyProfileChanges(current, input);
    this.#profiles.update(id, updated);
    this.#notify(StateScope.PROFILES);
    return updated;
  }

  deleteProfile(id) {
    this.#requireProfile(id);
    this.#profiles.remove(id);
    this.#notify(StateScope.PROFILES);
  }

  /* ------------------------------------------------------------------ */
  /* Allocations                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Create an allocation, decrementing tool stock and reserving the box.
   *
   * @param {object} input
   * @param {string} input.empresa
   * @param {string} input.dataAbertura ISO date
   * @param {string} input.dataExpiracao ISO date
   * @param {string} input.boxId
   * @param {{ferramentaId: string, quantidade: number}[]} input.items
   * @param {string[]} [input.personIds]
   */
  createAllocation(input) {
    const empresa = requireText(input.empresa, 'Empresa / Solicitante');
    const dataAbertura = requireIsoDate(input.dataAbertura, 'Data de abertura');
    const dataExpiracao = requireIsoDate(input.dataExpiracao, 'Devolução prevista');
    requireChronologicalOrder(dataAbertura, dataExpiracao, 'Data de abertura', 'Devolução prevista');

    const box = this.#requireBox(input.boxId);
    if (box.status !== BoxStatus.AVAILABLE) {
      throw new ConflictError(`A caixa ${box.id} não está disponível para alocação.`);
    }

    const requestedItems = createAllocationItems(input.items);
    const items = requestedItems.map(({ ferramentaId, quantidade }) => {
      const tool = this.#requireTool(ferramentaId);
      if (quantidade > tool.disponivel) {
        throw new ConflictError(
          `A ferramenta "${tool.nome}" possui apenas ${tool.disponivel} unidade(s) disponível(is) no estoque.`,
        );
      }
      return { ferramentaId: tool.id, nome: tool.nome, quantidade };
    });

    const seenPeople = new Set();
    const pessoas = (input.personIds ?? []).reduce((list, personId) => {
      const profile = this.#requireProfile(personId);
      if (!seenPeople.has(profile.id)) {
        seenPeople.add(profile.id);
        list.push({ nome: profile.nome, doc: profile.doc });
      }
      return list;
    }, []);

    for (const item of items) {
      const tool = this.#requireTool(item.ferramentaId);
      this.#tools.update(tool.id, {
        disponivel: tool.disponivel - item.quantidade,
        alocadas: tool.alocadas + item.quantidade,
      });
    }

    this.#boxes.update(box.id, { status: BoxStatus.ALLOCATED });

    const allocation = createAllocation({
      id: this.#nextAllocationId(),
      empresa,
      dataAbertura,
      dataExpiracao,
      caixaId: box.id,
      codigoCaixa: box.id,
      nomeCaixa: box.nome,
      pessoas,
      itens: items,
    });

    this.#allocations.insert(allocation);
    this.#notify(StateScope.ALL);
    return allocation;
  }

  /**
   * Close an allocation: items return to stock, the box is released and a
   * service record is appended to the history.
   */
  finalizeAllocation(id) {
    const allocation = this.#requireAllocation(id);

    for (const item of allocation.itens) {
      const tool = this.#tools.getById(item.ferramentaId);
      if (!tool) {
        continue;
      }
      this.#tools.update(tool.id, {
        disponivel: tool.disponivel + item.quantidade,
        alocadas: Math.max(0, tool.alocadas - item.quantidade),
      });
    }

    const box = this.#boxes.getById(allocation.caixaId);
    if (box) {
      this.#boxes.update(box.id, { status: BoxStatus.AVAILABLE });
    }

    const record = createServiceRecord({
      id: allocation.id,
      empresa: allocation.empresa,
      dataAbertura: allocation.dataAbertura,
      dataDevolucao: this.#clock(),
      codigoCaixa: allocation.codigoCaixa,
      nomeCaixa: allocation.nomeCaixa,
      pessoas: allocation.pessoas,
      itens: allocation.itens,
      observacoes: 'Devolução realizada sem observações.',
    });

    this.#history.insert(record);
    this.#allocations.remove(id);
    this.#notify(StateScope.ALL);
    return record;
  }

  /* ------------------------------------------------------------------ */
  /* Internals                                                           */
  /* ------------------------------------------------------------------ */

  #nextAllocationId() {
    const prefix = `ALC-${new Date().getFullYear()}`;
    return nextId(prefix, [...this.#allocations.ids(), ...this.#history.ids()], 3);
  }

  #requireTool(id) {
    const tool = this.#tools.getById(id);
    if (!tool) {
      throw new NotFoundError(`Ferramenta ${id} não encontrada.`);
    }
    return tool;
  }

  #requireBox(id) {
    const box = this.#boxes.getById(id);
    if (!box) {
      throw new NotFoundError(`Caixa ${id} não encontrada.`);
    }
    return box;
  }

  #requireProfile(id) {
    const profile = this.#profiles.getById(id);
    if (!profile) {
      throw new NotFoundError(`Perfil ${id} não encontrado.`);
    }
    return profile;
  }

  #requireAllocation(id) {
    const allocation = this.#allocations.getById(id);
    if (!allocation) {
      throw new NotFoundError(`Alocação ${id} não encontrada.`);
    }
    return allocation;
  }

  #requireHistory(id) {
    const record = this.#history.getById(id);
    if (!record) {
      throw new NotFoundError(`Registro ${id} não encontrado no histórico.`);
    }
    return record;
  }

  #notify(scope) {
    this.#bus.emit('state:changed', { scope });
  }
}