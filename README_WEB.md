# ESUS-APP - Base completa do Painel Administrativo Multi-tenant

Este pacote contém **duas aplicações separadas**:

- `backend-admin`: API NestJS para autenticação administrativa e CRUD de municípios/tenants
- `painel-admin`: painel web em Next.js para suporte configurar municípios, módulos e dados técnicos

## Estrutura sugerida

Você pode deixar assim na raiz do seu projeto:

```txt
ESUS-APP/
  backend/              -> backend atual do app mobile
  painel-admin/         -> painel antigo, se quiser manter
  backend-admin/        -> novo backend administrativo
  painel-admin-novo/    -> novo painel administrativo
```

## 1) Rodando o backend administrativo

Entre na pasta:

```bash
cd backend-admin
```

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
copy .env.example .env
```

Edite o `.env` com as credenciais do seu PostgreSQL.

Instale as dependências:

```bash
npm install
```

Suba a API:

```bash
npm run start:dev
```

A API sobe em:

```txt
http://localhost:3333
```

### Login administrativo padrão

Use os valores definidos no `.env`:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 2) Rodando o painel web

Entre na pasta:

```bash
cd painel-admin
```

Copie o arquivo de exemplo:

```bash
cp .env.local.example .env.local
```

No Windows PowerShell:

```powershell
copy .env.local.example .env.local
```

Instale as dependências:

```bash
npm install
```

Suba o painel:

```bash
npm run dev
```

O painel sobe em:

```txt
http://localhost:3001
```

## O que esta base já entrega

- login administrativo com JWT
- listagem de municípios
- cadastro de município
- edição de município
- ativação e desativação de tenant
- exclusão de tenant
- módulos habilitados por município
- armazenamento criptografado da senha do banco
- layout em roxo seguindo o padrão visual do app

## O que pode ser o próximo passo

- perfis por usuário administrativo
- auditoria de alterações
- teste de conexão por município
- integração do app mobile com a resolução de tenant pelo backend central
- feature flags mais detalhadas
- permissões por perfil e por tela
