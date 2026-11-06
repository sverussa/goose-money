import '@fontsource-variable/roboto-flex';
import './app/tema.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';

import { ConfiguracaoIncompleta } from '@/app/ConfiguracaoIncompleta';
import { resultadoEnv } from '@/app/env';
import { OuvinteDeLinks } from '@/app/OuvinteDeLinks';
import { RotasDoApp } from '@/app/RotasDoApp';
import { PrivacidadeProvider } from '@/app/providers/privacidade';
import { SessaoProvider } from '@/app/providers/sessao';
import { TemaProvider } from '@/app/providers/tema';
import { aplicarTemaEscuro } from '@/app/tema/gerarTemaEscuro';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
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
                  <RotasDoApp />
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
