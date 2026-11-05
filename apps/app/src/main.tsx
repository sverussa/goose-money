import { VERSAO_CORE } from '@goose-money/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router';

function Inicio() {
  return (
    <main>
      <h1>Goose Money</h1>
      <p>Core {VERSAO_CORE}</p>
    </main>
  );
}

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
