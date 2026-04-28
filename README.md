# App e-SUS Mobile

App mobile para Atenção Básica à Saúde (ABS/ESF) construído com Expo + React Native.
Substitui o app Genexus mantendo compatibilidade total com o banco de dados existente.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Mobile | Expo 52 + React Native 0.76 |
| Navegação | Expo Router 4 (file-based) |
| Banco offline | WatermelonDB + SQLite |
| Estado global | Zustand |
| Auth | JWT + expo-secure-store + expo-local-authentication |
| Backend | NestJS + TypeORM |
| Banco online | PostgreSQL (tabelas sd* existentes) |
| GPS | expo-location |
| Assinatura | react-native-signature-canvas |

---

## Instalação

```bash
# Instalar dependências do app
npm install

# Rodar no Android
npm run android

# Rodar no iOS
npm run ios
```

---

## Configuração

Crie um arquivo `.env` na raiz:

```
EXPO_PUBLIC_API_URL=http://seu-servidor:3000
```

---

## Migração do banco

Execute o script antes de rodar o app pela primeira vez:

```bash
psql -U postgres -d seu_banco -f backend/migration.sql
```

O script **só adiciona colunas e índices** — zero impacto no Genexus.

---

## Estrutura de pastas

```
app/
├── (auth)/login.tsx          # Tela de login + biometria
├── (tabs)/
│   ├── home.tsx              # Dashboard principal
│   ├── indicadores.tsx       # Indicadores APS
│   ├── transporte.tsx        # Módulo de transporte
│   └── agendamento.tsx       # Visualização de vagas
└── fichas/
    ├── visita-domiciliar.tsx # Visita com fluxo em grupo
    ├── cadastro-individual.tsx
    ├── cadastro-domiciliar.tsx
    ├── atendimento-individual.tsx
    ├── atendimento-odonto.tsx
    ├── atividade-coletiva.tsx
    └── vacina.tsx

src/
├── db/
│   ├── schema.ts             # Schema WatermelonDB
│   ├── models/               # Models por entidade
│   └── index.ts              # Instância do database
├── sync/
│   └── index.ts              # Serviço de sincronização
├── xml/
│   └── visitaDomiciliar.ts   # Gerador XML e-SUS tipo 8
├── auth/
│   └── index.ts              # JWT + biometria + device ID
├── store/
│   └── index.ts              # Zustand stores
├── types/
│   └── index.ts              # Tipos TypeScript + payloads
└── utils/
    └── conversoes.ts         # S/N, turno, datas, UUID

backend/
├── src/sync/
│   └── sync.service.ts       # Handler NestJS de sync
└── migration.sql             # Migração do banco
```

---

## Fluxo de sincronização

```
App offline
  └─ Registra visita → salva no SQLite com GUID
  └─ Usuário aperta "Sincronizar"
  └─ Monta payload JSON (mesmo formato Genexus)
  └─ POST /sync → API NestJS
       └─ INSERT em mbsincronizacao (origem='M')
       └─ Para cada registro:
            └─ upsert por GUID na tabela sd*
            └─ INSERT em mbsincronizacaoregistros
            └─ Retorna int id gerado
  └─ App atualiza int_id no SQLite local
```

---

## Indicadores APS implementados

| Indicador | Fonte | Meta MS |
|---|---|---|
| Hipertensos acompanhados | visita com hipertensao=S nos últimos 6 meses | 60% |
| Diabéticos acompanhados | visita com diabetes=S nos últimos 6 meses | 60% |
| Gestantes em pré-natal | visita com gestante=S no último mês | 80% |
| Cobertura de visitas | famílias com alguma visita no mês | 75% |

---

## Sprints seguintes

- [ ] Sprint 2: Cadastro Individual + Cadastro Domiciliar
- [ ] Sprint 3: Atendimento Individual + Odontológico
- [ ] Sprint 4: Atividade Coletiva + Vacina
- [ ] Sprint 5: Geração XML e-SUS (todos os tipos)
- [ ] Sprint 6: Testes e homologação e-SUS PEC
