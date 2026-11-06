import { type Centavos, centavos, menos } from '../dinheiro';
import type { Cartao } from '../modelo';

/** PROMPT 3.5: limite − max(0, Obrigações do cartão). */
export const limiteDisponivel = (cartao: Pick<Cartao, 'limite'>, obrigacoes: Centavos): Centavos =>
  menos(cartao.limite, obrigacoes > 0 ? obrigacoes : centavos(0));
