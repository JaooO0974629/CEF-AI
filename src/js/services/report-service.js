import { escapeHtml } from '../core/dom.js';
import { formatDate, formatDateTime } from '../core/format.js';

/**
 * Builds print-ready HTML documents.
 *
 * Reports are pure functions of the current domain state, which keeps printing
 * deterministic and independent from the DOM.
 */
export class ReportService {
  #inventory;
  #clock;

  /**
   * @param {object} dependencies
   * @param {import('./inventory-service.js').InventoryService} dependencies.inventory
   * @param {() => Date} [dependencies.clock]
   */
  constructor({ inventory, clock = () => new Date() }) {
    this.#inventory = inventory;
    this.#clock = clock;
  }

  /** Print guide for an active allocation. */
  allocationGuide(allocation) {
    const items = allocation.itens
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.ferramentaId)}</td>
          <td>${escapeHtml(item.nome)}</td>
          <td class="print-table__center">${escapeHtml(item.quantidade)}</td>
        </tr>`,
      )
      .join('');

    return `
      <header class="print-document__header">
        <div>
          <h1 class="print-document__brand">CEF - SISTEMA DE ALOCAÇÃO DE FERRAMENTAS</h1>
          <p class="print-document__subtitle">Comprovante de Saída / Guia de Serviço</p>
        </div>
        <div class="print-document__meta">
          <p class="print-document__code">${escapeHtml(allocation.id)}</p>
          <p class="print-document__date">Emissão: ${escapeHtml(formatDateTime(this.#clock()))}</p>
        </div>
      </header>

      <table class="print-table">
        <tbody>
          <tr>
            <td class="print-table__label">Empresa / Solicitante:</td>
            <td>${escapeHtml(allocation.empresa)}</td>
          </tr>
          <tr>
            <td class="print-table__label">Caixa de Ferramentas:</td>
            <td>${escapeHtml(allocation.codigoCaixa)} - ${escapeHtml(allocation.nomeCaixa)}</td>
          </tr>
          <tr>
            <td class="print-table__label">Data de Abertura:</td>
            <td>${escapeHtml(formatDate(allocation.dataAbertura))}</td>
          </tr>
          <tr>
            <td class="print-table__label">Devolução Prevista:</td>
            <td>${escapeHtml(formatDate(allocation.dataExpiracao))}</td>
          </tr>
        </tbody>
      </table>

      <h3 class="print-document__section-title">Itens da Caixa de Ferramentas</h3>
      <table class="print-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th class="print-table__center">Quantidade</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>

      <h3 class="print-document__section-title">Assinaturas dos Designados</h3>
      <div class="print-signatures">
        ${this.#renderSignatures(allocation.pessoas)}
      </div>`;
  }

  /** Full stock report. */
  stockReport() {
    const rows = this.#inventory
      .listTools()
      .map(
        (tool) => `<tr>
          <td>${escapeHtml(tool.id)}</td>
          <td>${escapeHtml(tool.nome)}</td>
          <td>${escapeHtml(tool.categoria)}</td>
          <td class="print-table__center">${escapeHtml(tool.total)}</td>
          <td class="print-table__center">${escapeHtml(tool.disponivel)}</td>
          <td class="print-table__center">${escapeHtml(tool.alocadas)}</td>
          <td class="print-table__center">${escapeHtml(tool.quebradas)}</td>
        </tr>`,
      )
      .join('');

    return `
      <header class="print-document__header">
        <div>
          <h1 class="print-document__brand">CEF - RELATÓRIO GERAL DE ESTOQUE DE FERRAMENTAS</h1>
          <p class="print-document__subtitle">Posição atual do inventário</p>
        </div>
        <div class="print-document__meta">
          <p class="print-document__date">${escapeHtml(formatDateTime(this.#clock()))}</p>
        </div>
      </header>

      <table class="print-table print-table--accent">
        <thead>
          <tr>
            <th>Código</th>
            <th>Ferramenta</th>
            <th>Categoria</th>
            <th class="print-table__center">Total</th>
            <th class="print-table__center">Disponíveis</th>
            <th class="print-table__center">Alocadas</th>
            <th class="print-table__center">Quebradas</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  /** Detailed report of a completed service. */
  serviceReport(record) {
    const rows = record.itens
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.ferramentaId)}</td>
          <td>${escapeHtml(item.nome)}</td>
          <td class="print-table__center">${escapeHtml(item.quantidade)}</td>
        </tr>`,
      )
      .join('');

    return `
      <header class="print-document__header">
        <div>
          <h1 class="print-document__brand">CEF - RELATÓRIO DETALHADO DE SERVIÇO CONCLUÍDO</h1>
          <p class="print-document__subtitle">Ordem de Serviço: <strong>${escapeHtml(record.id)}</strong></p>
        </div>
        <div class="print-document__meta">
          <p class="print-document__date">${escapeHtml(formatDateTime(this.#clock()))}</p>
        </div>
      </header>

      <div class="print-summary">
        <p><strong>Empresa/Serviço:</strong> ${escapeHtml(record.empresa)}</p>
        <p><strong>Caixa de Ferramentas:</strong> ${escapeHtml(record.codigoCaixa)} - ${escapeHtml(record.nomeCaixa)}</p>
        <p><strong>Data de Abertura:</strong> ${escapeHtml(formatDate(record.dataAbertura))}</p>
        <p><strong>Data de Devolução Final:</strong> ${escapeHtml(formatDate(record.dataDevolucao))}</p>
        <p><strong>Status do Serviço:</strong> ${escapeHtml(record.status)}</p>
        <p><strong>Observações:</strong> ${escapeHtml(record.observacoes || 'Sem observações adicionais.')}</p>
      </div>

      <h3 class="print-document__section-title">Itens Utilizados no Serviço</h3>
      <table class="print-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição do Item</th>
            <th class="print-table__center">Qtd</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  #renderSignatures(people) {
    if (!Array.isArray(people) || people.length === 0) {
      return `<div class="print-signature">Assinatura do Recebedor / Empresa</div>`;
    }

    return people
      .map(
        (person) => `<div class="print-signature">
          <span class="print-signature__name">${escapeHtml(person.nome)}</span><br />
          <span class="print-signature__doc">CPF/RE: ${escapeHtml(person.doc || 'Assinatura Registrada')}</span>
        </div>`,
      )
      .join('');
  }
}