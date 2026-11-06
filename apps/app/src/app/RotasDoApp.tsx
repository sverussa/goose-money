import { type ComponentType, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { EsqueciSenha } from '@/features/acesso/EsqueciSenha';
import { RedefinirSenha } from '@/features/acesso/RedefinirSenha';

import { ComponentesDev } from './dev/ComponentesDev';
import { TemaDev } from './dev/TemaDev';
import { LoginProvisorio } from './LoginProvisorio';
import { RotaProtegida } from './RotaProtegida';

/** Página carregada sob demanda (`React.lazy`), pelo nome exportado no módulo. */
function pagina<M extends Record<string, ComponentType>>(
  carregar: () => Promise<M>,
  nome: keyof M,
) {
  return lazy(async () => ({ default: (await carregar())[nome] as ComponentType }));
}

const Painel = pagina(() => import('@/features/painel/PainelPagina'), 'PainelPagina');
const Lancamentos = pagina(
  () => import('@/features/lancamentos/LancamentosPagina'),
  'LancamentosPagina',
);
const Contas = pagina(() => import('@/features/contas/ContasPagina'), 'ContasPagina');
const Extrato = pagina(() => import('@/features/contas/ExtratoPagina'), 'ExtratoPagina');
const Cartoes = pagina(() => import('@/features/cartoes/CartoesPagina'), 'CartoesPagina');
const Fatura = pagina(() => import('@/features/cartoes/FaturaPagina'), 'FaturaPagina');
const Dividas = pagina(() => import('@/features/dividas/DividasPagina'), 'DividasPagina');
const Divida = pagina(() => import('@/features/dividas/DividaPagina'), 'DividaPagina');
const Rendas = pagina(() => import('@/features/rendas/RendasPagina'), 'RendasPagina');
const GastosFixos = pagina(
  () => import('@/features/gastos-fixos/GastosFixosPagina'),
  'GastosFixosPagina',
);
const Configuracoes = pagina(
  () => import('@/features/configuracoes/ConfiguracoesPagina'),
  'ConfiguracoesPagina',
);

/**
 * Todas as rotas do app (5.1, T04-05). Cada tela da etapa 5 troca só a sua página em
 * `src/features/`, sem editar este arquivo.
 */
export function RotasDoApp() {
  return (
    <Routes>
      <Route path="/login" element={<LoginProvisorio />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      {import.meta.env.DEV && <Route path="/dev/tema" element={<TemaDev />} />}
      {import.meta.env.DEV && <Route path="/dev/componentes" element={<ComponentesDev />} />}
      <Route element={<RotaProtegida />}>
        <Route index element={<Painel />} />
        <Route path="lancamentos" element={<Lancamentos />} />
        <Route path="contas" element={<Contas />} />
        <Route path="contas/:id" element={<Extrato />} />
        <Route path="cartoes" element={<Cartoes />} />
        <Route path="cartoes/:id" element={<Fatura />} />
        <Route path="dividas" element={<Dividas />} />
        <Route path="dividas/:id" element={<Divida />} />
        <Route path="rendas" element={<Rendas />} />
        <Route path="gastos-fixos" element={<GastosFixos />} />
        {/* Atalho para a aba Projeções do Painel (5.1). */}
        <Route path="projecoes" element={<Navigate to="/?aba=projecoes" replace />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
