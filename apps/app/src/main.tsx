import '@fontsource-variable/roboto-flex';
import './app/tema.css';

import { VERSAO_CORE } from '@goose-money/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router';

import { ConfiguracaoIncompleta } from '@/app/ConfiguracaoIncompleta';
import { resultadoEnv } from '@/app/env';
import { Button } from '@/components/ui/button';

function Inicio() {
  return (
    <main>
      <h1>Goose Money</h1>
      <p>Core {VERSAO_CORE}</p>
      <Button>Lançar</Button>
    </main>
  );
}

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado');

createRoot(raiz).render(
  <StrictMode>
    {resultadoEnv.ok ? (
      <HashRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />
        </Routes>
      </HashRouter>
    ) : (
      <ConfiguracaoIncompleta variaveis={resultadoEnv.invalidas} />
    )}
  </StrictMode>,
);
