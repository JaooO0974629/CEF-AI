/**
 * Seed data used the first time the application runs (or when a collection is
 * missing from persistent storage). Each factory returns a fresh structure so
 * callers can never mutate the module-level defaults.
 */

import { AccessLevel, BoxStatus, ProfileStatus } from '../domain/enums.js';

export function createSeedTools() {
  return [
    { id: 'FR-101', nome: 'Chave de Impacto Pneumática 1/2"', categoria: 'Pneumática', total: 10, disponivel: 7, quebradas: 1 },
    { id: 'FR-102', nome: 'Esmerilhadeira Angular 7" Bosch', categoria: 'Elétrica', total: 6, disponivel: 4, quebradas: 0 },
    { id: 'FR-103', nome: 'Multímetro Digital Fluke 87V', categoria: 'Medição', total: 8, disponivel: 5, quebradas: 0 },
    { id: 'FR-104', nome: 'Máquina de Solda Inversora 200A', categoria: 'Soldagem', total: 5, disponivel: 2, quebradas: 1 },
    { id: 'FR-105', nome: 'Torquímetro de Estalo 20-200Nm', categoria: 'Medição/Torque', total: 12, disponivel: 10, quebradas: 0 },
  ].map((tool) => ({ ...tool, alocadas: tool.total - tool.disponivel - tool.quebradas }));
}

export function createSeedBoxes() {
  return [
    { id: 'CX-001', nome: 'Caixa Metálica Tramontina N° 1', status: BoxStatus.AVAILABLE },
    { id: 'CX-002', nome: 'Caixa Plástica Reforçada N° 2', status: BoxStatus.AVAILABLE },
    { id: 'CX-003', nome: 'Maleta Térmica de Ferramentas N° 3', status: BoxStatus.AVAILABLE },
  ];
}

export function createSeedProfiles() {
  return [
    {
      id: 'USR-01',
      nome: 'Carlos Oliveira',
      doc: '321.654.987-00',
      cargo: 'Almoxarife Chefe',
      nivel: AccessLevel.ADMIN,
      status: ProfileStatus.ACTIVE,
    },
    {
      id: 'USR-02',
      nome: 'Mariana Costa',
      doc: 'RE-8841',
      cargo: 'Técnica de Manutenção',
      nivel: AccessLevel.WAREHOUSE,
      status: ProfileStatus.ACTIVE,
    },
    {
      id: 'USR-03',
      nome: 'João Pedro Mendes',
      doc: '456.789.012-34',
      cargo: 'Operador de Campo',
      nivel: AccessLevel.OPERATOR,
      status: ProfileStatus.ACTIVE,
    },
  ];
}

export function createSeedAllocations() {
  return [
    {
      id: 'ALC-2024-001',
      empresa: 'Manutenção Usina Petroquímica - Setor B',
      dataAbertura: '2024-11-01',
      dataExpiracao: '2024-11-04',
      caixaId: 'CX-001',
      codigoCaixa: 'CX-001',
      nomeCaixa: 'Caixa Metálica Tramontina N° 1',
      status: 'Ativa',
      pessoas: [
        { nome: 'João Pedro Mendes', doc: '456.789.012-34' },
        { nome: 'Mariana Costa', doc: 'RE-8841' },
      ],
      itens: [
        { ferramentaId: 'FR-101', nome: 'Chave de Impacto Pneumática 1/2"', quantidade: 2 },
        { ferramentaId: 'FR-103', nome: 'Multímetro Digital Fluke 87V', quantidade: 1 },
      ],
    },
  ];
}

export function createSeedHistory() {
  return [
    {
      id: 'ALC-2024-000',
      empresa: 'Instalações Eletromecânicas Alfa',
      dataAbertura: '2024-10-15',
      dataDevolucao: '2024-10-25',
      codigoCaixa: 'CX-002',
      nomeCaixa: 'Caixa Plástica Reforçada N° 2',
      status: 'Concluído',
      pessoas: [{ nome: 'João Pedro Mendes', doc: '456.789.012-34' }],
      itens: [{ ferramentaId: 'FR-105', nome: 'Torquímetro de Estalo 20-200Nm', quantidade: 2 }],
      observacoes: 'Ferramentas devolvidas limpas e aferidas.',
    },
  ];
}