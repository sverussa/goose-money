import '@fontsource-variable/roboto-flex';
import './app/tema.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router';

import { ConfiguracaoIncompleta } from '@/app/ConfiguracaoIncompleta';
import { ComponentesDev } from '@/app/dev/ComponentesDev';
import { TemaDev } from '@/app/dev/TemaDev';
import { resultadoEnv } from '@/app/env';
import { InicioProvisorio } from '@/app/InicioProvisorio';
import { LoginProvisorio } from '@/app/LoginProvisorio';
import { OuvinteDeLinks } from '@/app/OuvinteDeLinks';
import { PrivacidadeProvider } from '@/app/providers/privacidade';
import { SessaoProvider } from '@/app/providers/sessao';
import { TemaProvider } from '@/app/providers/tema';
import { RotaProtegida } from '@/app/RotaProtegida';
import { aplicarTemaEscuro } from '@/app/tema/gerarTemaEscuro';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EsqueciSenha } from '@/features/acesso/EsqueciSenha';
import { RedefinirSenha } from '@/features/acesso/RedefinirSenha';
import { retornoComErro } from '@/plataforma/deepLink';
import { clienteDeConsultas } from '@/queries/cliente';

// Link do Auth expirado ou já usado (T03-08): o Auth troca o `#/<rota>` pelo erro e só mantém
// `?retorno=`. Antes de o roteador ler a URL, ela volta para a rota, com o aviso de link inválido.
const rotaComErro = retornoComErro(window.location.search);
if (rotaComErro)
  window.history.replaceState(null, '', `${window.location.pathname}#/${rotaComErro}?invalido=1`);

aplicarTemaEscuro();

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <TemaProvider>
      <TooltipProvider>
        {resultadoEnv.ok ? (
          <QueryClientProvider client={clienteDeConsultas}>
            <HashRouter>
              <SessaoProvider>
                <PrivacidadeProvider>
                  <OuvinteDeLinks />
                  <Routes>
                    <Route path="/login" element={<LoginProvisorio />} />
                    <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                    <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                    {import.meta.env.DEV && <Route path="/dev/tema" element={<TemaDev />} />}
                    {import.meta.env.DEV && (
                      <Route path="/dev/componentes" element={<ComponentesDev />} />
                    )}
                    <Route element={<RotaProtegida />}>
                      {/* T04-05 cria as rotas do menu; até lá, toda rota autenticada é a provisória. */}
                      <Route path="*" element={<InicioProvisorio />} />
                    </Route>
                  </Routes>
                </PrivacidadeProvider>
              </SessaoProvider>
            </HashRouter>
            <Toaster />
          </QueryClientProvider>
        ) : (
          <ConfiguracaoIncompleta variaveis={resultadoEnv.invalidas} />
        )}
      </TooltipProvider>
    </TemaProvider>
  </StrictMode>,
);
