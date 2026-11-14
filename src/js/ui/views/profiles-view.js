import { delegate, escapeHtml } from '../../core/dom.js';
import { initials } from '../../core/format.js';
import { AccessLevel, ProfileStatus, ViewId } from '../../domain/enums.js';
import { icon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

/**
 * Profiles tab: operator/warehouse staff directory with CRUD.
 */
export class ProfilesView {
  #inventory;
  #root;
  #cleanups = [];

  constructor({ inventory }) {
    this.#inventory = inventory;
  }

  get id() {
    return ViewId.PROFILES;
  }

  mount(root) {
    this.#root = root;
    root.innerHTML = this.#template();
    this.#bind();
    this.render();
  }

  render() {
    const grid = this.#root?.querySelector('#profiles-grid');
    if (!grid) {
      return;
    }

    const profiles = this.#inventory.listProfiles();
    grid.innerHTML =
      profiles.length === 0
        ? '<p class="empty-state">Nenhum perfil cadastrado.</p>'
        : profiles.map((profile) => this.#card(profile)).join('');
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
          <h2 class="page-header__title">Perfis de Usuários</h2>
          <p class="page-header__subtitle">Operadores e almoxarifes com permissão de acesso ao CEF.</p>
        </div>
        <div class="page-header__actions">
          <button type="button" class="btn btn--primary" data-action="new-profile">
            ${icon('user-plus')} Novo Operador
          </button>
        </div>
      </header>

      <div class="grid grid--cards" id="profiles-grid"></div>`;
  }

  #card(profile) {
    const admin = profile.nivel === AccessLevel.ADMIN;
    const active = profile.status === ProfileStatus.ACTIVE;

    return `
      <article class="card card__body">
        <div>
          <div class="flex-between mb-3">
            <span class="avatar avatar--lg">${escapeHtml(initials(profile.nome))}</span>
            <div class="flex-center">
              <span class="badge ${admin ? 'badge--info' : 'badge--brand'}">${escapeHtml(profile.nivel)}</span>
              <button type="button" class="icon-button" data-action="edit-profile" data-id="${escapeHtml(profile.id)}"
                      title="Editar perfil" aria-label="Editar ${escapeHtml(profile.nome)}">${icon('pencil')}</button>
              <button type="button" class="icon-button is-danger" data-action="delete-profile" data-id="${escapeHtml(profile.id)}"
                      title="Excluir perfil" aria-label="Excluir ${escapeHtml(profile.nome)}">${icon('trash')}</button>
            </div>
          </div>
          <h3 class="card__title">${escapeHtml(profile.nome)}</h3>
          <p class="card__text font-mono">CPF/RE: ${escapeHtml(profile.doc || 'Não informado')}</p>
          <p class="card__text">${escapeHtml(profile.cargo)}</p>
        </div>
        <div class="card__footer">
          <span class="${active ? 'text-success' : 'text-muted'} flex-center">
            ${icon('dot', { className: 'icon--sm' })} Status: ${escapeHtml(profile.status)}
          </span>
          <span class="cell--mono text-muted">${escapeHtml(profile.id)}</span>
        </div>
      </article>`;
  }

  #bind() {
    this.#cleanups.push(
      delegate(this.#root, 'click', '[data-action]', (event, target) => {
        const { action, id } = target.dataset;
        if (action === 'new-profile') {
          this.#openForm();
        } else if (action === 'edit-profile') {
          this.#openForm(this.#inventory.getProfile(id));
        } else if (action === 'delete-profile') {
          this.#remove(id);
        }
      }),
    );
  }

  #openForm(profile = null) {
    const editing = Boolean(profile);
    const options = Object.values(AccessLevel)
      .map(
        (level) =>
          `<option value="${escapeHtml(level)}"${profile?.nivel === level ? ' selected' : ''}>${escapeHtml(level)}</option>`,
      )
      .join('');

    const body = `
      <form id="profile-form" class="form">
        <div class="field">
          <label class="field__label" for="profile-name">Nome Completo</label>
          <input class="input" id="profile-name" name="nome" required autocomplete="off"
                 placeholder="Ex: Roberto Santos" value="${escapeHtml(profile?.nome ?? '')}" />
        </div>
        <div class="field">
          <label class="field__label" for="profile-doc">CPF ou Registro da Empresa (RE)</label>
          <input class="input input--mono" id="profile-doc" name="doc" required autocomplete="off"
                 placeholder="Ex: 123.456.789-00 ou RE-4491" value="${escapeHtml(profile?.doc ?? '')}" />
        </div>
        <div class="field">
          <label class="field__label" for="profile-role">Cargo / Função</label>
          <input class="input" id="profile-role" name="cargo" required autocomplete="off"
                 placeholder="Ex: Almoxarife Jr" value="${escapeHtml(profile?.cargo ?? '')}" />
        </div>
        <div class="field">
          <label class="field__label" for="profile-level">Nível de Acesso</label>
          <select class="input" id="profile-level" name="nivel">${options}</select>
        </div>
      </form>`;

    const footer = `
      <button type="button" class="btn" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn--primary" form="profile-form">
        ${editing ? 'Salvar Perfil' : 'Cadastrar Perfil'}
      </button>`;

    const modal = openModal({
      title: editing ? 'Editar Operador' : 'Cadastrar Novo Operador',
      body,
      footer,
      onMount: (bodyElement) => {
        bodyElement.querySelector('#profile-form').addEventListener('submit', (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const payload = {
            nome: data.get('nome'),
            doc: data.get('doc'),
            cargo: data.get('cargo'),
            nivel: data.get('nivel'),
          };

          try {
            if (editing) {
              this.#inventory.updateProfile(profile.id, payload);
              toast.success('Perfil atualizado.');
            } else {
              this.#inventory.createProfile(payload);
              toast.success('Perfil cadastrado.');
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
      this.#inventory.deleteProfile(id);
      toast.success('Perfil removido.');
    } catch (error) {
      toast.error(error.message);
    }
  }
}