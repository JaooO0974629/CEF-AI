import { delegate, escapeHtml } from '../../core/dom.js';
import { formatDate } from '../../core/format.js';
import { ViewId } from '../../domain/enums.js';
import { icon } from '../components/icons.js';
import { printHtml } from '../print.js';

/**
 * History tab: completed services and printable service reports.
 */
export class HistoryView {
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
    return ViewId.HISTORY;
  }

  mount(root) {
    this.#root = root;
    root.innerHTML = this.#template();
    this.#bind();
    this.render();
  }

  render() {
    const tbody = this.#root?.querySelector('#history-tbody');
    if (!tbody) {
      return;
    }

    const term = this.#searchTerm.trim().toLowerCase();
    const records = this.#inventory
      .listHistory()
      .filter((record) =>
        [record.empresa, record.id].some((value) => value.toLowerCase().includes(term)),
      );

    tbody.innerHTML =
      records.length === 0
        ? '<tr><td colspan="6" class="empty-state">Nenhum registro encontrado no histórico.</td></tr>'
        : records.map((record) => this.#row(record)).join('');
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
          <h2 class="page-header__title">Histórico de Serviços</h2>
          <p class="page-header__subtitle">Consulte ordens de serviço finalizadas e imprima relatórios.</p>
        </div>
        <div class="toolbar__search">
          <div class="search-field">
            ${icon('search')}
            <input type="search" id="history-search" class="input" placeholder="Filtrar por empresa ou OS..."
                   aria-label="Filtrar histórico" />
          </div>
        </div>
      </header>

      <div class="card card--flush">
        <div class="table-scroll custom-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">OS ID</th>
                <th scope="col">Empresa / Serviço</th>
                <th scope="col">Abertura</th>
                <th scope="col">Devolução</th>
                <th scope="col">Status</th>
                <th scope="col" class="cell--right">Relatório</th>
              </tr>
            </thead>
            <tbody id="history-tbody"></tbody>
          </table>
        </div>
      </div>`;
  }

  #row(record) {
    return `
      <tr>
        <td class="cell--mono">${escapeHtml(record.id)}</td>
        <td class="cell--strong">${escapeHtml(record.empresa)}</td>
        <td class="cell--muted">${escapeHtml(formatDate(record.dataAbertura))}</td>
        <td class="cell--muted">${escapeHtml(formatDate(record.dataDevolucao))}</td>
        <td>
          <span class="badge badge--success">${escapeHtml(record.status)}</span>
        </td>
        <td class="cell--right">
          <button type="button" class="btn btn--sm btn--outline" data-action="print-service"
                  data-id="${escapeHtml(record.id)}">
            ${icon('printer')} Imprimir Relatório
          </button>
        </td>
      </tr>`;
  }

  #bind() {
    this.#cleanups.push(
      delegate(this.#root, 'click', '[data-action]', (event, target) => {
        if (target.dataset.action === 'print-service') {
          const record = this.#inventory.getServiceRecord(target.dataset.id);
          printHtml(this.#reports.serviceReport(record));
        }
      }),
    );

    const search = this.#root.querySelector('#history-search');
    search.addEventListener('input', (event) => {
      this.#searchTerm = event.target.value;
      this.render();
    });
  }
}