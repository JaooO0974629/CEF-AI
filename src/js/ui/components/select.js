import { escapeHtml } from '../../core/dom.js';
import { icon } from './icons.js';

let openSelect = null;

function closeOpenSelect(except) {
  if (openSelect && openSelect !== except) {
    openSelect.close();
  }
}

/**
 * Accessible, searchable single-select control.
 *
 * The component owns its own state and renders a trigger plus a filterable
 * listbox. It is framework-free and reusable by any form.
 */
export class SearchableSelect {
  #placeholder;
  #options;
  #value = '';
  #onChange;
  #element;
  #trigger;
  #valueElement;
  #menu;
  #searchInput;
  #list;
  #documentListener = null;

  /**
   * @param {object} options
   * @param {string} [options.placeholder]
   * @param {{value: string, label: string, meta?: string, side?: string}[]} [options.options]
   * @param {(value: string, option: object | undefined) => void} [options.onChange]
   */
  constructor({ placeholder = 'Selecione', options = [], onChange } = {}) {
    this.#placeholder = placeholder;
    this.#options = [...options];
    this.#onChange = onChange;
    this.#build();
    this.#renderValue();
  }

  /** Root element to mount in the DOM. */
  get element() {
    return this.#element;
  }

  /** Currently selected value (empty string when nothing is selected). */
  get value() {
    return this.#value;
  }

  /** Replace the option list, preserving the selection when still valid. */
  setOptions(options) {
    this.#options = [...options];
    if (this.#value && !this.#options.some((option) => option.value === this.#value)) {
      this.#value = '';
    }
    this.#renderList();
    this.#renderValue();
  }

  /** Select a value programmatically. */
  setValue(value) {
    const option = this.#options.find((candidate) => candidate.value === value);
    this.#value = option ? option.value : '';
    this.#renderValue();
    this.#renderList();
    this.#onChange?.(this.#value, option);
  }

  /** Clear the selection. */
  reset() {
    this.setValue('');
  }

  /** Close the menu and detach global listeners. */
  destroy() {
    this.close();
    this.#element.remove();
  }

  /** Close the dropdown. */
  close() {
    if (!this.#menu || this.#menu.classList.contains('is-hidden')) {
      return;
    }
    this.#menu.classList.add('is-hidden');
    this.#trigger.setAttribute('aria-expanded', 'false');
    if (openSelect === this) {
      openSelect = null;
    }
    if (this.#documentListener) {
      document.removeEventListener('click', this.#documentListener);
      this.#documentListener = null;
    }
  }

  #build() {
    this.#element = document.createElement('div');
    this.#element.className = 'select';
    this.#element.innerHTML = `
      <button type="button" class="select__trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="select__value"></span>
        ${icon('chevron-down')}
      </button>
      <div class="select__menu is-hidden">
        <div class="select__search">
          ${icon('search')}
          <input type="text" class="input" placeholder="Pesquisar..." aria-label="Pesquisar opções" />
        </div>
        <div class="select__list custom-scroll" role="listbox"></div>
      </div>`;

    this.#trigger = this.#element.querySelector('.select__trigger');
    this.#valueElement = this.#element.querySelector('.select__value');
    this.#menu = this.#element.querySelector('.select__menu');
    this.#searchInput = this.#element.querySelector('.select__search input');
    this.#list = this.#element.querySelector('.select__list');

    this.#trigger.addEventListener('click', () => this.#toggle());
    this.#searchInput.addEventListener('input', () => this.#renderList());
    this.#searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.close();
        this.#trigger.focus();
      }
    });
    this.#list.addEventListener('click', (event) => {
      const option = event.target.closest('.select__option');
      if (!option) {
        return;
      }
      this.setValue(option.dataset.value);
      this.close();
      this.#trigger.focus();
    });

    this.#renderList();
  }

  #toggle() {
    if (this.#menu.classList.contains('is-hidden')) {
      this.#open();
    } else {
      this.close();
    }
  }

  #open() {
    closeOpenSelect(this);
    openSelect = this;

    this.#searchInput.value = '';
    this.#renderList();
    this.#menu.classList.remove('is-hidden');
    this.#trigger.setAttribute('aria-expanded', 'true');

    window.requestAnimationFrame(() => this.#searchInput.focus());

    this.#documentListener = (event) => {
      if (!this.#element.contains(event.target)) {
        this.close();
      }
    };
    document.addEventListener('click', this.#documentListener);
  }

  #renderValue() {
    const option = this.#options.find((candidate) => candidate.value === this.#value);

    if (!option) {
      this.#valueElement.textContent = this.#placeholder;
      this.#valueElement.className = 'select__value select__value--placeholder';
      return;
    }

    const label = option.side ? `${option.label} (${option.side})` : option.label;
    this.#valueElement.textContent = label;
    this.#valueElement.className = 'select__value select__value--selected';
  }

  #renderList() {
    const term = this.#searchInput.value.trim().toLowerCase();
    const filtered = term
      ? this.#options.filter((option) =>
          `${option.label} ${option.meta ?? ''} ${option.side ?? ''}`.toLowerCase().includes(term),
        )
      : this.#options;

    if (filtered.length === 0) {
      this.#list.innerHTML = '<div class="select__empty">Nenhum item encontrado.</div>';
      return;
    }

    this.#list.innerHTML = filtered
      .map((option) => {
        const selected = option.value === this.#value;
        return `
          <button type="button" class="select__option${selected ? ' is-selected' : ''}"
                  role="option" aria-selected="${selected}" data-value="${escapeHtml(option.value)}">
            <span class="select__option-label">
              <span class="select__option-name">${escapeHtml(option.label)}</span>
              ${option.meta ? `<span class="select__option-meta">${escapeHtml(option.meta)}</span>` : ''}
            </span>
            ${option.side ? `<span class="select__option-side">${escapeHtml(option.side)}</span>` : ''}
          </button>`;
      })
      .join('');
  }
}