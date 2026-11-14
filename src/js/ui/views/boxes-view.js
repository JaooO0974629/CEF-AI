import { delegate, escapeHtml } from '../../core/dom.js';
import { BoxStatus, ViewId } from '../../domain/enums.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

/**
 * Tool box tab: card grid with box registration and removal.
 */
export class BoxesView {
  #inventory;
  #root;
  #cleanups = [];

  constructor({ inventory }) {
    this.#inventory = inventory;
  }

  get id() {
    return ViewId.BOXES;
  }

  mount(root) {
    this.#root = root;
    root.innerHTML = this.#template();
    this.#bind();
    this.render();
  }

  render() {
    const grid = this.#root?.querySelector('#boxes-grid');
    if (!grid) {
      return;
    }

    const boxes = this.#inventory.listBoxes();
    grid.innerHTML =
      boxes.length === 0
        ? '<p class="empty-state">Nenhuma caixa de ferramentas cadastrada no estoque.</p>'
        : boxes.map((box) => this.#card(box)).join('');
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
          <h2 class="page-header__title">Caixas de Ferramentas</h2>
          <p class="page-header__subtitle">Cadastre caixas físicas prontas para receber ferramentas na alocação.</p>
        </div>
        <div class="page-header__actions">
          <button type="button" class="btn btn--primary" data-action="new-box">
            ${icon('plus')} Nova Caixa
          </button>
        </div>
      </header>

      <div class="grid grid--cards" id="boxes-grid"></div>`;
  }

  #card(box) {
    const available = box.status === BoxStatus.AVAILABLE;
    return `
      <article class="card card__body">
        <div>
          <div class="flex-between mb-2">
            <span class="badge badge--brand font-mono">${escapeHtml(box.id)}</span>
            <div class="flex-center">
              <span class="badge ${available ? 'badge--success' : 'badge--warning'}">
                ${escapeHtml(box.status)}
              </span>
              <button type="button" class="icon-button is-danger" data-action="delete-box"
                      data-id="${escapeHtml(box.id)}" title="Excluir caixa"
                      aria-label="Excluir caixa ${escapeHtml(box.id)}">${icon('trash')}</button>
            </div>
          </div>
          <h3 class="card__title mb-2">${escapeHtml(box.nome)}</h3>
          <p class="card__text">Caixa de transporte pronta para receber ferramentas no momento da alocação.</p>
        </div>
        <div class="card__footer">
          <span>Status:
            <strong class="${available ? 'text-success' : 'text-warning'}">${escapeHtml(box.status)}</strong>
          </span>
          <span class="cell--mono text-muted">${escapeHtml(box.id)}</span>
        </div>
      </article>`;
  }

  #bind() {
    this.#cleanups.push(
      delegate(this.#root, 'click', '[data-action]', (event, target) => {
        const { action, id } = target.dataset;
        if (action === 'new-box') {
          this.#openForm();
        } else if (action === 'delete-box') {
          this.#remove(id);
        }
      }),
    );
  }

  #openForm() {
    const body = `
      <form id="box-form" class="form">
        <div class="field">
          <label class="field__label" for="box-code">Código da Caixa</label>
          <input class="input input--mono" id="box-code" name="id" required autocomplete="off"
                 placeholder="Ex: CX-005" value="CX-${String(Math.floor(100 + Math.random() * 900))}" />
        </div>
        <div class="field">
          <label class="field__label" for="box-name">Nome / Identificação</label>
          <input class="input" id="box-name" name="nome" required autocomplete="off"
                 placeholder="Ex: Caixa Metálica Azul N° 3" />
        </div>
      </form>`;

    const footer = `
      <button type="button" class="btn" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn--primary" form="box-form">Salvar Caixa</button>`;

    const modal = openModal({
      title: 'Nova Caixa de Ferramentas',
      body,
      footer,
      onMount: (bodyElement) => {
        bodyElement.querySelector('#box-form').addEventListener('submit', (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          try {
            this.#inventory.createBox({ id: data.get('id'), nome: data.get('nome') });
            toast.success('Caixa cadastrada no estoque.');
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
      this.#inventory.deleteBox(id);
      toast.success('Caixa removida do estoque.');
    } catch (error) {
      toast.error(error.message);
    }
  }
}