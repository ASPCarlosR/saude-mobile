/**
 * Valida o CPF usando a regra matemática padrão.
 */
export function validarCPF(cpf: string): boolean {
  const limpo = cpf.replace(/[^\d]+/g, '');
  if (limpo.length !== 11 || !!limpo.match(/(\d)\1{10}/)) return false;

  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma = soma + parseInt(limpo.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(limpo.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) soma = soma + parseInt(limpo.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if ((resto === 10) || (resto === 11)) resto = 0;
  if (resto !== parseInt(limpo.substring(10, 11))) return false;

  return true;
}

/**
 * Valida o Cartão Nacional de Saúde (CNS) usando as regras 
 * oficiais do e-SUS APS (Módulo 11).
 */
export function validarCNS(cns: string): boolean {
  const limpo = cns.replace(/[^\d]+/g, '');
  if (limpo.length !== 15) return false;

  // CNS iniciados em 1 ou 2 (Gerados)
  if (['1', '2'].includes(limpo[0])) {
    let pis = limpo.substring(0, 11);
    let soma = 0;
    for (let i = 0, j = 15; i < 11; i++, j--) soma += parseInt(pis[i]) * j;
    let resto = soma % 11;
    let dv = 11 - resto;
    if (dv === 11) dv = 0;
    
    if (dv === 10) {
      soma = 0;
      for (let i = 0, j = 15; i < 11; i++, j--) soma += parseInt(pis[i]) * j;
      soma += 2;
      dv = 11 - (soma % 11);
      return limpo === (pis + "001" + String(dv));
    }
    return limpo === (pis + "000" + String(dv));
  } 
  
  // CNS iniciados em 7, 8 ou 9 (Provisórios)
  if (['7', '8', '9'].includes(limpo[0])) {
    let soma = 0;
    for (let i = 0, j = 15; i < 15; i++, j--) soma += parseInt(limpo[i]) * j;
    return (soma % 11) === 0;
  }
  return false;
}