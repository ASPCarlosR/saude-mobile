// ============================================================
// ARQUIVO: src/utils/condicoesMorador.ts
// 
// Calcula quais checks de acompanhamento devem ser marcados
// automaticamente para cada morador, baseado nos dados do
// cadastro individual (sdpessoa) e na idade calculada.
// ============================================================

export interface CondicoesMorador {
  // Faixas etárias
  gestante: boolean;
  puerpera: boolean;        // sem dado no cadastro individual — deixa como false
  recemNasc: boolean;       // < 1 ano
  crianca: boolean;         // 1-9 anos
  pessoaIdosa: boolean;     // >= 60 anos

  // Condições de saúde do cadastro individual
  hipertensao: boolean;
  diabetes: boolean;
  asma: boolean;
  dpoc: boolean;
  cancer: boolean;
  hanseniase: boolean;
  tuberculose: boolean;
  sintResp: boolean;
  tabagista: boolean;
  acamados: boolean;
  vulnerSocial: boolean;
  saudeMental: boolean;
  usuarAlcool: boolean;
  outrasDrogas: boolean;
  reabilitacao: boolean;    // deficiência ou em reabilitação
  desnutricao: boolean;     // não tem dado direto no cadastro individual
  cronicas: boolean;        // outras doenças crônicas (AVC, infarto, etc.)
  acomBolsaFam: boolean;
}

// Dados que a API /familia retorna para cada morador
export interface DadosMorador {
  id: string;
  guid: string;
  nome: string;
  cns?: string;
  dtnasc?: string;         // YYYY-MM-DD
  sexo?: string;           // M / F
  microarea?: string;
  // Condições de saúde vindas do cadastro individual (sdpessoa)
  gestante?: string;        // S/N
  hipertensaoarterial?: string;
  diabetes?: string;
  doencaresp?: string;
  doencarespasma?: string;
  doencarespdpoc?: string;
  fumante?: string;
  hanseniase?: string;
  tuberculose?: string;
  cancer?: string;
  acamado?: string;
  domiciliado?: string;
  tratpsiquiatra?: string;
  dependentealcool?: string;
  dependentedroga?: string;
  deficiencia?: string;
  avcderrame?: string;
  infarto?: string;
  doencacardiaca?: string;
  doencarios?: string;
  internacao?: string;
  usuariobolsafamilia?: string;
}

/**
 * Calcula a idade em anos a partir de uma data de nascimento (YYYY-MM-DD)
 */
export function calcularIdadeAnos(dtnasc: string | undefined): number | null {
  if (!dtnasc || dtnasc === '0000-00-00') return null;
  const nasc = new Date(dtnasc);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mesAniversario = nasc.getMonth();
  const diaAniversario = nasc.getDate();
  if (
    hoje.getMonth() < mesAniversario ||
    (hoje.getMonth() === mesAniversario && hoje.getDate() < diaAniversario)
  ) {
    idade--;
  }
  return idade;
}

/**
 * Calcula a idade formatada para exibição ("X Anos", "X Meses", etc.)
 */
export function calcularIdadeTexto(dtnasc: string | undefined): string {
  if (!dtnasc || dtnasc === '0000-00-00') return '--';
  const nasc = new Date(dtnasc);
  const hoje = new Date();
  const idadeAnos = calcularIdadeAnos(dtnasc) ?? 0;
  if (idadeAnos < 1) {
    const meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
    return meses <= 0 ? 'Recém-nascido' : `${meses} Mese${meses > 1 ? 's' : ''}`;
  }
  return `${idadeAnos} Ano${idadeAnos > 1 ? 's' : ''}`;
}

const isS = (v: string | undefined) => v === 'S' || v === 's';

/**
 * Retorna as condições pré-preenchidas para um morador específico,
 * cruzando idade calculada + dados do cadastro individual.
 */
export function calcularCondicoesMorador(m: DadosMorador): CondicoesMorador {
  const idade = calcularIdadeAnos(m.dtnasc);

  // ── Faixas etárias ────────────────────────────────────────────────────
  const ehRecem   = idade !== null && idade < 1;
  const ehCrianca = idade !== null && idade >= 1 && idade <= 9;
  const ehIdoso   = idade !== null && idade >= 60;
  const ehGestante = isS(m.gestante) && m.sexo === 'F';

  // ── Condições de saúde do cadastro individual ─────────────────────────
  const temHipertensao  = isS(m.hipertensaoarterial);
  const temDiabetes     = isS(m.diabetes);
  const temAsma         = isS(m.doencarespasma) || (isS(m.doencaresp) && isS(m.doencarespasma));
  const temDpoc         = isS(m.doencarespdpoc);
  const temCancer       = isS(m.cancer);
  const temHanseniase   = isS(m.hanseniase);
  const temTuberculose  = isS(m.tuberculose);
  const temTabagismo    = isS(m.fumante);
  const temAcamado      = isS(m.acamado) || isS(m.domiciliado);
  const temSaudeMental  = isS(m.tratpsiquiatra);
  const temAlcool       = isS(m.dependentealcool);
  const temDrogas       = isS(m.dependentedroga);
  const temDeficiencia  = isS(m.deficiencia);
  const temBolsaFamilia = isS(m.usuariobolsafamilia);

  // "Outras doenças crônicas" = AVC, infarto, doença cardíaca, renal ou internação
  const temCronicas = isS(m.avcderrame) || isS(m.infarto) || 
                      isS(m.doencacardiaca) || isS(m.doencarios) || 
                      isS(m.internacao);

  return {
    // Faixas etárias
    gestante:    ehGestante,
    puerpera:    false,           // Puérpera não tem campo no cadastro individual — ACS decide
    recemNasc:   ehRecem,
    crianca:     ehCrianca,
    pessoaIdosa: ehIdoso,

    // Condições de saúde
    hipertensao:  temHipertensao,
    diabetes:     temDiabetes,
    asma:         temAsma,
    dpoc:         temDpoc,
    cancer:       temCancer,
    hanseniase:   temHanseniase,
    tuberculose:  temTuberculose,
    sintResp:     temTuberculose, // Sintomático respiratório é marcado junto com TB
    tabagista:    temTabagismo,
    acamados:     temAcamado,
    vulnerSocial: false,           // Vulnerabilidade social: ACS avalia no momento
    saudeMental:  temSaudeMental,
    usuarAlcool:  temAlcool,
    outrasDrogas: temDrogas,
    reabilitacao: temDeficiencia,
    desnutricao:  false,           // Não tem campo direto no cadastro individual
    cronicas:     temCronicas,
    acomBolsaFam: temBolsaFamilia,
  };
}