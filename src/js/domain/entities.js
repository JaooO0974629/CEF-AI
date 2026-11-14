import { ValidationError } from './errors.js';
import { AccessLevel, AllocationStatus, BoxStatus, ProfileStatus, ServiceStatus } from './enums.js';
import {
  requireChronologicalOrder,
  requireIsoDate,
  requireNonNegativeInteger,
  requireOneOf,
  requirePositiveInteger,
  requireText,
} from './validation.js';

/**
 * Entity factories.
 *
 * Each factory validates its input and returns a plain, serialisable object.
 * Services and repositories never receive partially constructed entities.
 */

/**
 * Create a tool inventory record.
 * `alocadas` is always derived from the other counters.
 */
export function createTool(input) {
  const nome = requireText(input.nome, 'Nome da ferramenta');
  const categoria = requireText(input.categoria, 'Categoria');
  const total = requireNonNegativeInteger(input.total, 'Quantidade total');
  const disponivel = requireNonNegativeInteger(input.disponivel, 'Quantidade disponível');
  const quebradas = requireNonNegativeInteger(input.quebradas, 'Quantidade quebrada');
  const alocadas = total - disponivel - quebradas;

  if (alocadas < 0) {
    throw new ValidationError('A soma de disponíveis e quebradas não pode exceder o total.');
  }

  return {
    id: requireText(input.id, 'Código'),
    nome,
    categoria,
    total,
    disponivel,
    quebradas,
    alocadas,
  };
}

/** Apply partial changes to a tool and recompute derived counters. */
export function applyToolChanges(tool, changes) {
  const merged = {
    ...tool,
    nome: changes.nome ?? tool.nome,
    categoria: changes.categoria ?? tool.categoria,
    total: changes.total ?? tool.total,
    disponivel: changes.disponivel ?? tool.disponivel,
    quebradas: changes.quebradas ?? tool.quebradas,
  };

  const total = requireNonNegativeInteger(merged.total, 'Quantidade total');
  const disponivel = requireNonNegativeInteger(merged.disponivel, 'Quantidade disponível');
  const quebradas = requireNonNegativeInteger(merged.quebradas, 'Quantidade quebrada');

  if (disponivel + quebradas > total) {
    throw new ValidationError('A soma de disponíveis e quebradas não pode exceder o total.');
  }

  return {
    ...tool,
    nome: requireText(merged.nome, 'Nome da ferramenta'),
    categoria: requireText(merged.categoria, 'Categoria'),
    total,
    disponivel,
    quebradas,
    alocadas: total - disponivel - quebradas,
  };
}

/** Create a physical tool box. */
export function createToolBox(input) {
  const status = requireOneOf(input.status ?? BoxStatus.AVAILABLE, Object.values(BoxStatus), 'Status');

  return {
    id: requireText(input.id, 'Código da caixa').toUpperCase(),
    nome: requireText(input.nome, 'Nome da caixa'),
    status,
  };
}

/** Create a user profile. */
export function createProfile(input) {
  const nivel = requireOneOf(
    input.nivel ?? AccessLevel.OPERATOR,
    Object.values(AccessLevel),
    'Nível de acesso',
  );

  return {
    id: requireText(input.id, 'Código do perfil'),
    nome: requireText(input.nome, 'Nome'),
    doc: requireText(input.doc, 'CPF/RE'),
    cargo: requireText(input.cargo, 'Cargo'),
    nivel,
    status: ProfileStatus.ACTIVE,
  };
}

/** Apply partial changes to a profile. */
export function applyProfileChanges(profile, changes) {
  return {
    ...profile,
    nome: changes.nome !== undefined ? requireText(changes.nome, 'Nome') : profile.nome,
    doc: changes.doc !== undefined ? requireText(changes.doc, 'CPF/RE') : profile.doc,
    cargo: changes.cargo !== undefined ? requireText(changes.cargo, 'Cargo') : profile.cargo,
    nivel:
      changes.nivel !== undefined
        ? requireOneOf(changes.nivel, Object.values(AccessLevel), 'Nível de acesso')
        : profile.nivel,
  };
}

/** Validate and normalise an allocation item list. */
export function createAllocationItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Selecione pelo menos uma ferramenta para a alocação.');
  }

  const aggregated = new Map();

  for (const item of items) {
    const ferramentaId = requireText(item.ferramentaId, 'Ferramenta');
    const quantidade = requirePositiveInteger(item.quantidade, 'Quantidade');
    const previous = aggregated.get(ferramentaId) ?? 0;
    aggregated.set(ferramentaId, previous + quantidade);
  }

  return [...aggregated.entries()].map(([ferramentaId, quantidade]) => ({
    ferramentaId,
    quantidade,
  }));
}

/** Create an active allocation. */
export function createAllocation(input) {
  const dataAbertura = requireIsoDate(input.dataAbertura, 'Data de abertura');
  const dataExpiracao = requireIsoDate(input.dataExpiracao, 'Devolução prevista');
  requireChronologicalOrder(dataAbertura, dataExpiracao, 'Data de abertura', 'Devolução prevista');

  return {
    id: requireText(input.id, 'ID da alocação'),
    empresa: requireText(input.empresa, 'Empresa / Solicitante'),
    caixaId: requireText(input.caixaId, 'Caixa de ferramentas'),
    codigoCaixa: requireText(input.codigoCaixa, 'Código da caixa'),
    nomeCaixa: requireText(input.nomeCaixa, 'Nome da caixa'),
    dataAbertura,
    dataExpiracao,
    status: AllocationStatus.ACTIVE,
    pessoas: Array.isArray(input.pessoas) ? input.pessoas : [],
    itens: createAllocationItems(input.itens),
  };
}

/** Create a completed service record from a finalised allocation. */
export function createServiceRecord(input) {
  const dataDevolucao = requireIsoDate(input.dataDevolucao, 'Data de devolução');

  return {
    id: requireText(input.id, 'ID do serviço'),
    empresa: requireText(input.empresa, 'Empresa / Serviço'),
    dataAbertura: requireIsoDate(input.dataAbertura, 'Data de abertura'),
    dataDevolucao,
    codigoCaixa: requireText(input.codigoCaixa, 'Código da caixa'),
    nomeCaixa: requireText(input.nomeCaixa, 'Nome da caixa'),
    status: ServiceStatus.COMPLETED,
    pessoas: Array.isArray(input.pessoas) ? input.pessoas : [],
    itens: Array.isArray(input.itens) ? input.itens : [],
    observacoes: typeof input.observacoes === 'string' ? input.observacoes : '',
  };
}