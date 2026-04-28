# backend-admin

Backend administrativo separado do app mobile.

## Rodar

1. Copie `.env.example` para `.env`
2. Ajuste credenciais do PostgreSQL
3. Rode:

```bash
npm install
npm run start:dev
```

API base: `http://localhost:3333/api`

## Rotas

- `POST /api/admin/auth/login`
- `GET /api/admin/municipios`
- `GET /api/admin/municipios/:id`
- `POST /api/admin/municipios`
- `PUT /api/admin/municipios/:id`
- `DELETE /api/admin/municipios/:id`
