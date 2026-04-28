export type Permissoes = Record<string, boolean>;

export type AdminUser = {
  email: string;
  nome: string;
  role?: string;
};

export type Municipio = {
  id: number;
  nome: string;
  slug: string;
  ativo: boolean;
  app_port: number;
  api_base_url: string | null;
  permissoes: Permissoes;
  db_host?: string | null;
  db_port?: number | null;
  db_name?: string | null;
  db_user?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MunicipioFormData = {
  nome: string;
  slug: string;
  ativo: boolean;
  app_port: number;
  api_base_url: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_pass: string;
  permissoes: Permissoes;
};

export type LoginPayload = {
  email: string;
  senha: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AdminUser;
};
