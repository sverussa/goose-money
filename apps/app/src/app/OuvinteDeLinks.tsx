import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { trocarCodigo } from '@/data/auth';
import { aoAbrirLink, lerLinkDeRetorno, ROTAS_DE_RETORNO } from '@/plataforma/deepLink';

/**
 * Links dos e-mails do Auth (T03-08). Desktop: `goosemoney://redefinir-senha?code=…` troca o
 * código pela sessão e abre a tela de nova senha; a janela vem para a frente pelo lado nativo
 * (lib.rs). No navegador, o Supabase troca o código sozinho e o link expirado é tratado em
 * `main.tsx`.
 */
export function OuvinteDeLinks() {
  const navegar = useNavigate();

  useEffect(() => {
    let vivo = true;
    let parar: () => void = () => undefined;
    void aoAbrirLink((url) => {
      const link = lerLinkDeRetorno(url);
      if (!link || !ROTAS_DE_RETORNO.has(link.rota)) return;
      const trocou =
        !link.erro && link.codigo !== null ? trocarCodigo(link.codigo) : Promise.resolve(false);
      void trocou.then((ok) => navegar(ok ? `/${link.rota}` : `/${link.rota}?invalido=1`));
    }).then((p) => {
      if (vivo) parar = p;
      else p();
    });
    return () => {
      vivo = false;
      parar();
    };
  }, [navegar]);

  return null;
}
