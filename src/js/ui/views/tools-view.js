import { delegate, escapeHtml } from '../../core/dom.js';
import { ViewId } from '../../domain/enums.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { printHtml } from '../print.js';

const EMPTY_MESSAGE = 'Nenhuma ferramenta encontrada no estoque.';

/**
 * Inventory tab: dashboard counters, searchable table and tool CRUD.
 */
export class ToolsView {
  #inventory;
  #reports;
  #root;
  #searchTerm = '';
  #cleanups = [];

  constructor({ inventory, reports }) {
    this.#inventory = inventory;
    this.#reports = reports;
  }

  get id() {
    return ViewId.TOOLS;
  }

  mount(root) {
    this.#root = root;
    root.innerHTML = this.#template();
    this.#bind();
    this.render();
  }

  render() {
    if (!this.#root) {
      return;
    }
    const summary = this.#inventory.getInventorySummary();
    this.#setText('#stat-total', summary.total);
    this.#setText('#stat-available', summary.available);
    this.#setText('#stat-allocated', summary.allocated);
    this.#setText('#stat-broken', summary.broken);
    this.#renderTable();
  }

  destroy() {
    for (const cleanup of this.#cleanups) {
      cleanup();
    }
    this.#cleanups = [];
    this.#root = null;
  }

  #template() {
    return `
      <header class="page-header">
        <div>
          <h2 class="page-header__title">Estoque de Ferramentas</h2>
          <p class="page-header__subtitle">Consulte e gerencie o inventário de ferramentas.</p>
        </div>
        <div class="page-header__actions">
          <button type="button" class="btn btn--outline" data-action="print-stock">
            ${icon('printer')} Relatório
          </button>
          <button type="button" class="btn btn--primary" data-action="new-tool">
            ${icon('plus')} Nova Ferramenta
          </button>
        </div>
      </header>

      <div class="grid grid--stats">
        ${this.#statCard('brand', 'toolbox', 'Total Ferramentas', 'stat-total')}
        ${this.#statCard('success', 'check-circle', 'Disponíveis', 'stat-available')}
        ${this.#statCard('warning', 'package', 'Alocadas', 'stat-allocated')}
        ${this.#statCard('danger', 'alert-octagon', 'Manutenção', 'stat-broken')}
      </div>

      <div class="toolbar">
        <div class="search-field toolbar__search">
          ${icon('search')}
          <input type="search" id="tools-search" class="input" placeholder="Buscar ferramenta por nome, categoria..."
                 aria-label="Buscar ferramenta" />
        </div>
      </div>

      <div class="card card--flush">
        <div class="table-scroll custom-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Ferramenta</th>
                <th scope="col">Categoria</th>
                <th scope="col" class="cell--center">Total</th>
                <th scope="col" class="cell--center">Disponível</th>
                <th scope="col" class="cell--center">Alocadas</th>
                <th scope="col" class="cell--center">Quebradas</th>
                <th scope="col" class="cell--right">Ações</th>
              </tr>
            </thead>
            <tbody id="tools-tbody"></tbody>
          </table>
        </div>
      </div>`;
  }

  #statCard(tone, iconName, label, valueId) {
    return `
      <article class="stat-card">
        <span class="stat-card__icon stat-card__icon--${tone}">${icon(iconName)}</span>
        <div class="stat-card__meta">
          <p class="stat-card__label">${escapeHtml(label)}</p>
          <p class="stat-card__value" id="${valueId}">0</p>
        </div>
      </article>`;
  }

  #bind() {
    this.#cleanups.push(
      delegate(this.#root, 'click', '[data-action]', (event, target) => {
        const { action, id } = target.dataset;
        if (action === 'new-tool') {
          this.#openForm();
        } else if (action === 'edit-tool') {
          this.#openForm(this.#inventory.getTool(id));
        } else if (action === 'delete-tool') {
          this.#remove(id);
        } else if (action === 'print-stock') {
          printHtml(this.#reports.stockReport());
        }
      }),
    );

    const search = this.#root.querySelector('#tools-search');
    search.addEventListener('input', (event) => {
      this.#searchTerm = event.target.value;
      this.#renderTable();
    });
  }

  #renderTable() {
    const tbody = this.#root?.querySelector('#tools-tbody');
    if (!tbody) {
      return;
    }

    const term = this.#searchTerm.trim().toLowerCase();
    const tools = this.#inventory
      .listTools()
      .filter((tool) =>
        [tool.nome, tool.categoria, tool.id].some((value) => value.toLowerCase().includes(term)),
      );

    tbody.innerHTML =
      tools.length === 0
        ? `<tr><td colspan="8" class="empty-state">${EMPTY_MESSAGE}</td></tr>`
        : tools.map((tool) => this.#row(tool)).join('');
  }

  #row(tool) {
    return `
      <tr>
        <td class="cell--mono">${escapeHtml(tool.id)}</td>
        <td class="cell--strong">${escapeHtml(tool.nome)}</td>
        <td class="cell--muted">${escapeHtml(tool.categoria)}</td>
        <td class="cell--center cell--count">${escapeHtml(tool.total)}</td>
        <td class="cell--center cell--count cell--count-success">${escapeHtml(tool.disponivel)}</td>
        <td class="cell--center cell--count cell--count-warning">${escapeHtml(tool.alocadas)}</td>
        <td class="cell--center cell--count cell--count-danger">${escapeHtml(tool.quebradas)}</td>
        <td class="cell--right">
          <div class="cell-actions">
            <button type="button" class="icon-button" data-action="edit-tool" data-id="${escapeHtml(tool.id)}"
                    title="Editar" aria-label="Editar ${escapeHtml(tool.nome)}">${icon('pencil')}</button>
            <button type="button" class="icon-button is-danger" data-action="delete-tool" data-id="${escapeHtml(tool.id)}"
                    title="Excluir" aria-label="Excluir ${escapeHtml(tool.nome)}">${icon('trash')}</button>
          </div>
        </td>
      </tr>`;
  }

  #openForm(tool = null) {
    const editing = Boolean(tool);

    const body = `
      <form id="tool-form" class="form">
        <div class="field">
          <label class="field__label" for="tool-name">Nome da Ferramenta</label>
          <input class="input" id="tool-name" name="nome" required autocomplete="off"
                 placeholder="Ex: Esmerilhadeira 7&quot; Bosch" value="${escapeHtml(tool?.nome ?? '')}" />
        </div>
        <div class="field">
          <label class="field__label" for="tool-category">Categoria</label>
          <input class="input" id="tool-category" name="categoria" required autocomplete="off"
                 placeholder="Ex: Elétrica / Manutenção" value="${escapeHtml(tool?.categoria ?? '')}" />
        </div>
        <div class="form-grid form-grid--3">
          <div class="field">
            <label class="field__label" for="tool-total">Qtd Total</label>
            <input class="input" type="number" id="tool-total" name="total" min="0" required
                   value="${escapeHtml(tool?.total ?? 0)}" />
          </div>
          <div class="field">
            <label class="field__label" for="tool-available">Disponível</label>
            <input class="input" type="number" id="tool-available" name="disponivel" min="0" required
                   value="${escapeHtml(tool?.disponivel ?? 0)}" />
          </div>
          <div class="field">
            <label class="field__label" for="tool-broken">Quebradas</label>
            <input class="input" type="number" id="tool-broken" name="quebradas" min="0" required
                   value="${escapeHtml(tool?.quebradas ?? 0)}" />
          </div>
        </div>
      </form>`;

    const footer = `
      <button type="button" class="btn" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn--primary" form="tool-form">
        ${editing ? 'Salvar Ferramenta' : 'Cadastrar Ferramenta'}
      </button>`;

    const modal = openModal({
      title: editing ? 'Editar Ferramenta' : 'Nova Ferramenta',
      body,
      footer,
      onMount: (bodyElement) => {
        bodyElement.querySelector('#tool-form').addEventListener('submit', (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const payload = {
            nome: data.get('nome'),
            categoria: data.get('categoria'),
            total: Number(data.get('total')),
            disponivel: Number(data.get('disponivel')),
            quebradas: Number(data.get('quebradas')),
          };

          try {
            if (editing) {
              this.#inventory.updateTool(tool.id, payload);
              toast.success('Ferramenta atualizada.');
            } else {
              this.#inventory.createTool(payload);
              toast.success('Ferramenta cadastrada.');
            }
            modal.close();
          } catch (error) {
            toast.error(error.message);
          }
        });
      },
    });
  }

  #remove(id) {
    try {
      this.#inventory.deleteTool(id);
      toast.success('Ferramenta removida do estoque.');
    } catch (error) {
      toast.error(error.message);
    }
  }

  #setText(selector, value) {
    const element = this.#root?.querySelector(selector);
    if (element) {
      element.textContent = String(value);
    }
  }
}