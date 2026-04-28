import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { SN, Turno } from '@types/index';

// ---- UUID -----------------------------------------------
export const gerarGUID = (): string => uuidv4();

// ATENÇÃO: GUIDs do Genexus têm espaço no final — sempre trim
export const limparGUID = (guid: string): string => guid?.trim() ?? '';

// ---- S/N ------------------------------------------------
export const snParaBool = (v: SN | string | undefined): boolean =>
  v?.trim() === 'S';

export const boolParaSN = (v: boolean): SN => (v ? 'S' : 'N');

// ---- Turno ----------------------------------------------
// JSON Genexus usa M/T/N — XML e-SUS usa 1/2/3
export const TURNO_PARA_ESUS: Record<Turno, number> = {
  M: 1,
  T: 2,
  N: 3,
};

export const ESUS_PARA_TURNO: Record<number, Turno> = {
  1: 'M',
  2: 'T',
  3: 'N',
};

// ---- Datas ----------------------------------------------
// e-SUS usa Unix timestamp em milissegundos
export const dateParaTimestampMs = (date: Date | string): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return d.getTime();
};

export const timestampMsParaDate = (ms: number): Date => new Date(ms);

export const formatarDataBR = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy');
};

export const formatarDataHoraBR = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm');
};

export const dataAtualDDMMYYYY = (): string => format(new Date(), 'dd/MM/yyyy');
export const horaAtualHHMM = (): string => format(new Date(), 'HH:mm');
export const dataHoraAtual = (): string => format(new Date(), 'dd/MM/yyyy HH:mm');

export const formatarDataSegura = (isoOuYMD: string): string => {
  if (!isoOuYMD) return '--';
  if (isoOuYMD.includes('T')) return format(parseISO(isoOuYMD), 'dd/MM/yyyy');
  if (isoOuYMD.includes('-')) return isoOuYMD.split('-').reverse().join('/');
  return isoOuYMD;
}

export const formatarDataHoraSegura = (isoStr: string): string => {
  if (!isoStr) return '--';
  if (isoStr.includes('T')) return format(parseISO(isoStr), 'dd/MM/yyyy HH:mm');
  return formatarDataSegura(isoStr);
}

// ---- Máscaras de exibição --------------------------------
export const formatarCPF = (cpf: string): string => {
  const n = cpf.replace(/\D/g, '');
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatarCNS = (cns: string): string => {
  const n = cns.replace(/\D/g, '');
  return n.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
};

export const formatarTelefone = (tel: string, ddd?: number): string => {
  const n = tel.replace(/\D/g, '');
  const d = ddd ? `(${ddd}) ` : '';
  if (n.length === 9) return `${d}${n.slice(0, 5)}-${n.slice(5)}`;
  if (n.length === 8) return `${d}${n.slice(0, 4)}-${n.slice(4)}`;
  return `${d}${n}`;
};

// ---- Validações -----------------------------------------
export const cpfValido = (cpf: string): boolean => {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(n[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(n[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(n[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(n[10]);
};

export const cnsValido = (cns: string): boolean => {
  const n = cns.replace(/\D/g, '');
  return n.length === 15 && /^[1-9]/.test(n);
};

// ---- Lote -----------------------------------------------
// Número de lote sequencial — o backend incrementa, mas o app
// pode usar um valor local provisório baseado no timestamp
export const gerarNumLoteProvisorio = (): number =>
  Math.floor(Date.now() / 1000) % 1000000;
