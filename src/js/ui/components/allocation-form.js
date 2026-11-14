import { todayIso } from '../../core/format.js';
import { AccessLevel } from '../../domain/enums.js';
import { icon } from './icons.js';
import { openModal } from './modal.js';
import { SearchableSelect } from './select.js';
import { toast } from './toast.js';

/**
 * Modal form for creating an allocation.
 *
 * The form is intentionally self-contained: it owns its dynamic rows and select
 * fields, and only talks to the outside world through the inventory service.
 *
 * @param {object} dependencies
 * @param {import('../../services/inventory-service.js').InventoryService} dependencies.inventory
 */
export function openAllocationForm({ inventory }) {
  const availableBoxes = inventory.listAvailableBoxes();
  const selects = [];

  const boxSelect = new SearchableSelect({
    placeholder: 'Selecione uma caixa de ferramentas',
    options: availableBoxes.map((box) => ({
      value: box.id,
      label: box.nome,
      meta: box.id,
      side: 'Disponível',
    })),
  });
  selects.push(boxSelect);

  const toolRows = [];
  const personRows = [];
  let quickProfileTarget = null;
  let root = null;

  const toolOptions = () =>
    inventory
      .listTools()
      .filter((tool) => tool.disponivel > 0)
      .map((tool) => ({
        value: tool.id,
        label: tool.nome,
        meta: `${tool.categoria} (${tool.id})`,
        side: `Disp: ${tool.disponivel}`,
      }));

  const personOptions = () =>
    inventory.listProfiles().map((profile) => ({
      value: profile.id,
      label: profile.nome,
      meta: `CPF/RE: ${profile.doc || 'N/A'}`,
      side: profile.cargo,
    }));

  function addToolRow() {
    const select = new SearchableSelect({
      placeholder: 'Selecione a ferramenta',
      options: toolOptions(),
    });
    selects.push(select);

    const row = document.createElement('div');
    row.className = 'line-row';
    row.innerHTML = `
      <div class="line-row__grow"></div>
      <input type="number" class="input input--sm line-row__qty" min="1" value="1" aria-label="Quantidade" />
      <button type="button" class="icon-button is-danger" data-remove aria-label="Remover ferramenta">
        ${icon('trash')}
      </button>`;

    row.querySelector('.line-row__grow').appendChild(select.element);

    const record = { select, row };
    toolRows.push(record);

    row.querySelector('[data-remove]').addEventListener('click', () => {
      select.destroy();
      selects.splice(selects.indexOf(select), 1);
      row.remove();
      const index = toolRows.indexOf(record);
      if (index !== -1) {
        toolRows.splice(index, 1);
      }
    });

    root.querySelector('#tool-rows').appendChild(row);
  }

  function addPersonRow() {
    const select = new SearchableSelect({
      placeholder: 'Selecione a pessoa',
      options: personOptions(),
    });
    selects.push(select);

    const row = document.createElement('div');
    row.className = 'line-row';
    row.innerHTML = `
      <div class="line-row__grow"></div>
      <button type="button" class="icon-button" data-quick-add title="Cadastrar novo perfil" aria-label="Cadastrar novo perfil">
        ${icon('user-plus')}
      </button>
      <button type="button" class="icon-button is-danger" data-remove aria-label="Remover pessoa">
        ${icon('trash')}
      </button>`;

    row.querySelector('.line-row__grow').appendChild(select.element);

    const record = { select, row };
    personRows.push(record);

    row.querySelector('[data-quick-add]').addEventListener('click', () => {
      quickProfileTarget = select;
      root.querySelector('#quick-profile').classList.remove('is-hidden');
    });

    row.querySelector('[data-remove]').addEventListener('click', () => {
      select.destroy();
      selects.splice(selects.indexOf(select), 1);
      row.remove();
      const index = personRows.indexOf(record);
      if (index !== -1) {
        personRows.splice(index, 1);
      }
    });

    root.querySelector('#person-rows').appendChild(row);
  }

  function saveQuickProfile() {
    const nome = root.querySelector('#quick-perf-nome').value.trim();
    const doc = root.querySelector('#quick-perf-doc').value.trim();
    const cargo = root.querySelector('#quick-perf-cargo').value.trim();

    if (!nome || !doc) {
      toast.error('Informe nome e CPF/RE para cadastrar o operador.');
      return;
    }

    try {
      const profile = inventory.createProfile({
        nome,
        doc,
        cargo: cargo || 'Operador',
        nivel: AccessLevel.OPERATOR,
      });

      const options = personOptions();
      for (const record of personRows) {
        record.select.setOptions(options);
      }

      if (quickProfileTarget) {
        quickProfileTarget.setValue(profile.id);
      }

      root.querySelector('#quick-perf-nome').value = '';
      root.querySelector('#quick-perf-doc').value = '';
      root.querySelector('#quick-perf-cargo').value = '';
      root.querySelector('#quick-profile').classList.add('is-hidden');
      quickProfileTarget = null;

      toast.success(`Perfil de ${profile.nome} cadastrado.`);
    } catch (error) {
      toast.error(error.message);
    }
  }

  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const items = toolRows
      .map(({ select, row }) => ({
        ferramentaId: select.value,
        quantidade: Number(row.querySelector('.line-row__qty').value) || 0,
      }))
      .filter((item) => item.ferramentaId);

    const personIds = personRows.map(({ select }) => select.value).filter(Boolean);

    try {
      inventory.createAllocation({
        empresa: data.get('empresa'),
        dataAbertura: data.get('dataAbertura'),
        dataExpiracao: data.get('dataExpiracao'),
        boxId: boxSelect.value,
        items,
        personIds,
      });
      toast.success('Alocação criada com sucesso.');
      modal.close();
    } catch (error) {
      toast.error(error.message);
    }
  }

  const body = `
    <form id="allocation-form" class="form">
      <div class="field">
        <label class="field__label" for="aloc-empresa">Empresa / Solicitante</label>
        <input class="input" id="aloc-empresa" name="empresa" required
               placeholder="Ex: Petrobras Setor 4" autocomplete="off" />
      </div>

      <div class="form-grid form-grid--2">
        <div class="field">
          <label class="field__label" for="aloc-data-abertura">Data de Abertura</label>
          <input class="input" type="date" id="aloc-data-abertura" name="dataAbertura" required />
        </div>
        <div class="field">
          <label class="field__label" for="aloc-data-expiracao">Devolução Prevista</label>
          <input class="input" type="date" id="aloc-data-expiracao" name="dataExpiracao" required />
        </div>
      </div>

      <div class="field">
        <span class="field__label">Caixa de Ferramentas</span>
        <div id="aloc-box-slot"></div>
        ${
          availableBoxes.length === 0
            ? '<p class="field__hint text-danger">Nenhuma caixa disponível. Cadastre uma na aba "Caixas de Ferramentas".</p>'
            : ''
        }
      </div>

      <section class="form-section">
        <header class="form-section__header">
          <div>
            <h3 class="form-section__title">Ferramentas da Caixa</h3>
            <p class="form-section__hint">Selecione as ferramentas do estoque para esta caixa.</p>
          </div>
          <button type="button" class="btn btn--sm btn--outline" data-add-tool>
            ${icon('plus')} Adicionar
          </button>
        </header>
        <div class="form-section__list" id="tool-rows"></div>
      </section>

      <section class="form-section form-section--muted">
        <header class="form-section__header">
          <div>
            <h3 class="form-section__title">Pessoas Designadas</h3>
            <p class="form-section__hint">Operadores responsáveis pela caixa.</p>
          </div>
          <button type="button" class="btn btn--sm btn--outline" data-add-person>
            ${icon('user-plus')} Incluir
          </button>
        </header>
        <div class="form-section__list" id="person-rows"></div>

        <div id="quick-profile" class="quick-profile is-hidden">
          <div class="quick-profile__header">
            <span class="quick-profile__title">${icon('user-plus')} Cadastrar novo perfil</span>
            <button type="button" class="icon-button" data-close-quick aria-label="Fechar">
              ${icon('x')}
            </button>
          </div>
          <div class="quick-profile__grid">
            <input type="text" id="quick-perf-nome" class="input input--sm" placeholder="Nome completo" />
            <input type="text" id="quick-perf-doc" class="input input--sm input--mono" placeholder="CPF ou RE" />
            <input type="text" id="quick-perf-cargo" class="input input--sm" placeholder="Cargo / Função" />
          </div>
          <div class="quick-profile__actions">
            <button type="button" class="btn btn--sm btn--primary" data-save-quick>Salvar e selecionar</button>
          </div>
        </div>
      </section>
    </form>`;

  const footer = `
    <button type="button" class="btn" data-modal-close>Cancelar</button>
    <button type="submit" class="btn btn--primary" form="allocation-form">Criar Alocação</button>`;

  const modal = openModal({
    title: 'Nova Alocação',
    body,
    footer,
    size: 'lg',
    onClose: () => {
      for (const select of selects) {
        select.destroy();
      }
    },
    onMount(bodyElement) {
      root = bodyElement;
      bodyElement.querySelector('#aloc-box-slot').appendChild(boxSelect.element);
      bodyElement.querySelector('#aloc-data-abertura').value = todayIso();
      bodyElement.querySelector('#aloc-data-expiracao').value = todayIso();

      bodyElement.querySelector('[data-add-tool]').addEventListener('click', addToolRow);
      bodyElement.querySelector('[data-add-person]').addEventListener('click', addPersonRow);
      bodyElement.querySelector('[data-save-quick]').addEventListener('click', saveQuickProfile);
      bodyElement.querySelector('[data-close-quick]').addEventListener('click', () => {
        bodyElement.querySelector('#quick-profile').classList.add('is-hidden');
        quickProfileTarget = null;
      });
      bodyElement.querySelector('#allocation-form').addEventListener('submit', submit);

      addToolRow();
      addPersonRow();
    },
  });

  return modal;
}