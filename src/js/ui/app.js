import { escapeHtml } from '../core/dom.js';
import { ViewId } from '../domain/enums.js';
import { icon } from './components/icons.js';
import { AllocationsView } from './views/allocations-view.js';
import { BoxesView } from './views/boxes-view.js';
import { HistoryView } from './views/history-view.js';
import { ProfilesView } from './views/profiles-view.js';
import { ToolsView } from './views/tools-view.js';

const TABS = [
  { id: ViewId.ALLOCATIONS, label: 'Alocações', iconName: 'clipboard' },
  { id: ViewId.TOOLS, label: 'Estoque Ferramentas', iconName: 'wrench' },
  { id: ViewId.BOXES, label: 'Caixas de Ferramentas', iconName: 'package' },
  { id: ViewId.HISTORY, label: 'Histórico', iconName: 'clock' },
  { id: ViewId.PROFILES, label: 'Perfis', iconName: 'users' },
];

/**
 * Composition root for the presentation layer.
 *
 * Owns the tab shell, the view lifecycle and the binding between domain state
 * changes and view refreshes.
 */
export class App {
  #inventory;
  #reports;
  #bus;
  #viewRoot;
  #tabList;
  #views = new Map();
  #containers = new Map();
  #tabButtons = new Map();
  #activeViewId = null;
  #unsubscribe = null;

  constructor({ inventory, reports, bus }) {
    this.#inventory = inventory;
    this.#reports = reports;
    this.#bus = bus;
  }

  /** Mount the interface and activate the initial tab. */
  start() {
    this.#viewRoot = document.getElementById('view-root');
    this.#tabList = document.getElementById('tab-list');

    this.#renderTabs();
    this.#mountViews();

    this.#unsubscribe = this.#bus.on('state:changed', () => this.#renderAll());
    window.addEventListener('hashchange', this.#handleRoute);
    this.#handleRoute();
  }

  /** Tear down listeners (useful for tests). */
  stop() {
    this.#unsubscribe?.();
    window.removeEventListener('hashchange', this.#handleRoute);
    for (const view of this.#views.values()) {
      view.destroy();
    }
  }

  #renderTabs() {
    this.#tabList.innerHTML = TABS.map(
      (tab) => `
        <button type="button" class="tab-button" role="tab" id="tab-${tab.id}"
                data-view="${tab.id}" aria-controls="view-${tab.id}" aria-selected="false">
          ${icon(tab.iconName)} ${escapeHtml(tab.label)}
        </button>`,
    ).join('');

    this.#tabList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-view]');
      if (button) {
        this.#navigate(button.dataset.view);
      }
    });

    for (const tab of TABS) {
      this.#tabButtons.set(tab.id, this.#tabList.querySelector(`[data-view="${tab.id}"]`));
    }
  }

  #mountViews() {
    const dependencies = { inventory: this.#inventory, reports: this.#reports };
    const factories = {
      [ViewId.ALLOCATIONS]: () => new AllocationsView(dependencies),
      [ViewId.TOOLS]: () => new ToolsView(dependencies),
      [ViewId.BOXES]: () => new BoxesView(dependencies),
      [ViewId.HISTORY]: () => new HistoryView(dependencies),
      [ViewId.PROFILES]: () => new ProfilesView(dependencies),
    };

    for (const tab of TABS) {
      const container = document.createElement('section');
      container.className = 'view';
      container.id = `view-${tab.id}`;
      container.setAttribute('role', 'tabpanel');
      container.setAttribute('aria-labelledby', `tab-${tab.id}`);
      container.hidden = true;

      const view = factories[tab.id]();
      view.mount(container);

      this.#viewRoot.appendChild(container);
      this.#views.set(tab.id, view);
      this.#containers.set(tab.id, container);
    }
  }

  #renderAll() {
    for (const view of this.#views.values()) {
      view.render();
    }
  }

  #handleRoute = () => {
    const requested = window.location.hash.replace(/^#\/?/, '');
    const target = TABS.some((tab) => tab.id === requested) ? requested : TABS[0].id;
    this.#activate(target);
  };

  #navigate(viewId) {
    if (window.location.hash === `#/${viewId}`) {
      this.#activate(viewId);
    } else {
      window.location.hash = `#/${viewId}`;
    }
  }

  #activate(viewId) {
    if (this.#activeViewId === viewId) {
      this.#views.get(viewId)?.render();
      return;
    }

    this.#activeViewId = viewId;

    for (const [id, container] of this.#containers) {
      const active = id === viewId;
      container.hidden = !active;

      const button = this.#tabButtons.get(id);
      if (button) {
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      }
    }

    this.#views.get(viewId)?.render();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}