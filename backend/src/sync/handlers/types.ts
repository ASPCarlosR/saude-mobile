// Tabelas que o app mobile pode sincronizar
export enum TabelaSincro {
  VISITA    = 'sdvisitadomiciliar',
  PESSOA    = 'sdpessoa',
  DOMICILIO = 'sddomicilio',
}

// Um registro individual enviado pelo app
export interface RegistroSync {
  tabelaSincro: TabelaSincro;
  chaveMobile:  string;       // ID local do WatermelonDB
  registroGuid: string;       // GUID do registro
  dados:        Record<string, any>; // campos do registro
}

// Sessão de sincronização enviada pelo app
export interface SessaoSync {
  deviceId:   string;
  appVersao:  string;
  registros:  RegistroSync[];
}

// Resposta individual por registro
export interface RespostaRegistro {
  guid:   string;
  intId:  number | null;  // ID gerado no banco do servidor
  status: 'S' | 'E';     // S = sucesso, E = erro
  erro?:  string;
}

// Resposta geral da sincronização
export interface RespostaSync {
  sessaoId:  number;
  status:    'S' | 'E';
  registros: RespostaRegistro[];
}