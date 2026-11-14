/**
 * Domain vocabulary.
 *
 * Enumerations are frozen so that business states cannot be mutated at runtime.
 */

/** Lifecycle state of a physical tool box. */
export const BoxStatus = Object.freeze({
  AVAILABLE: 'Disponível',
  ALLOCATED: 'Alocada',
});

/** Lifecycle state of an active allocation. */
export const AllocationStatus = Object.freeze({
  ACTIVE: 'Ativa',
});

/** Lifecycle state of a completed service record. */
export const ServiceStatus = Object.freeze({
  COMPLETED: 'Concluído',
});

/** Status of a user profile. */
export const ProfileStatus = Object.freeze({
  ACTIVE: 'Ativo',
});

/** Access levels available to a user profile. */
export const AccessLevel = Object.freeze({
  ADMIN: 'Administrador',
  WAREHOUSE: 'Almoxarife',
  OPERATOR: 'Operador',
});

/** Tab identifiers used by the router. */
export const ViewId = Object.freeze({
  ALLOCATIONS: 'alocacoes',
  TOOLS: 'ferramentas',
  BOXES: 'caixas',
  HISTORY: 'historico',
  PROFILES: 'perfis',
});

/** State scopes broadcast after a mutation. */
export const StateScope = Object.freeze({
  TOOLS: 'tools',
  BOXES: 'boxes',
  ALLOCATIONS: 'allocations',
  HISTORY: 'history',
  PROFILES: 'profiles',
  ALL: 'all',
});