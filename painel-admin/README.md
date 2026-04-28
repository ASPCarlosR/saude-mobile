# Painel Admin funcional

## Como usar
1. Extraia esta pasta sobre o seu `painel-admin` ou em uma pasta nova.
2. Rode `npm install`.
3. Copie `.env.local.example` para `.env.local`.
4. Ajuste `NEXT_PUBLIC_API_URL` para a URL do backend.
5. Rode `npm run dev`.

## O que já faz
- Layout no padrão do sistema de referência
- Menu superior funcional com os menus do seu software
- Sidebar lateral
- Listagem real de municípios
- Criação real de municípios
- Edição real de municípios
- Ativar/Desativar município
- A listagem não expõe host, banco e usuário

## Observação de segurança
O frontend não deve mostrar credenciais de banco. O ideal é o backend também deixar de retornar `db_pass` nas respostas e salvar a senha criptografada no banco central.
