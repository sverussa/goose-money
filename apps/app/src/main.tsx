import '@fontsource-variable/roboto-flex';
import './app/tema.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router';

import { ConfiguracaoIncompleta } from '@/app/ConfiguracaoIncompleta';
import { resultadoEnv } from '@/app/env';
import { InicioProvisorio } from '@/app/InicioProvisorio';
import { LoginProvisorio } from '@/app/LoginProvisorio';
import { SessaoProvider } from '@/app/providers/sessao';
import { RotaProtegida } from '@/app/RotaProtegida';
import { clienteDeConsultas } from '@/queries/cliente';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado');

createRoot(raiz).render(
  <StrictMode>
    {resultadoEnv.ok ? (
      <QueryClientProvider client={clienteDeConsultas}>
        <HashRouter>
          <SessaoProvider>
            <Routes>
              <Route path="/login" element={<LoginProvisorio />} />
              <Route element={<RotaProtegida />}>
                {/* T04-05 cria as rotas do menu; até lá, toda rota autenticada é a provisória. */}
                <Route path="*" element={<InicioProvisorio />} />
              </Route>
            </Routes>
          </SessaoProvider>
        </HashRouter>
      </QueryClientProvider>
    ) : (
      <ConfiguracaoIncompleta variaveis={resultadoEnv.invalidas} />
    )}
  </StrictMode>,
);
