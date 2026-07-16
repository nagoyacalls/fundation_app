# Departamento Pessoal — Numeralle

Camada de organização e indicadores sobre os e-mails do Outlook: cada e-mail
vira uma **demanda** rastreável, atribuída a uma empresa pelo domínio do
remetente e classificada por tipo. Contrato de engenharia em `CLAUDE.md`.

## Rodando localmente

Pré-requisitos: **Node 20+** e **Docker** (ou um Postgres 16 local).

```bash
# 1. Clonar e instalar
git clone https://github.com/nagoyacalls/fundation_app.git
cd fundation_app
npm install

# 2. Postgres via Docker
docker run -d --name dp-postgres -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fundation_app postgres:16

# 3. Variáveis de ambiente
cp .env.example .env
# preencha AUTH_SECRET e TOKEN_ENCRYPTION_KEY (gerador multiplataforma):
node -e "console.log('AUTH_SECRET=\"'+require('crypto').randomBytes(32).toString('base64')+'\"')"
node -e "console.log('TOKEN_ENCRYPTION_KEY=\"'+require('crypto').randomBytes(32).toString('base64')+'\"')"

# 4. Migrations + regras iniciais de classificação
npx prisma migrate deploy
npx prisma db seed

# 5. (opcional, recomendado para conhecer o app) dados de demonstração
node scripts/seed-demo.mjs

# 6. Subir
npm run dev
```

Abra <http://localhost:3000>.

### Entrando sem Entra ID (modo desenvolvimento)

O login real é via Microsoft Entra ID. Para desenvolvimento local, gere uma
sessão de analista fictício:

```bash
node scripts/dev-session.mjs
```

Siga as instruções impressas (colar uma linha no console do navegador).
Os dois scripts de desenvolvimento **se recusam a rodar** se `DATABASE_URL`
não for local — não existem em produção.

### Login real (Entra ID)

Crie um app registration no Entra com redirect URI
`<origin>/api/auth/callback/microsoft-entra-id` e permissões delegadas
`openid, profile, email, offline_access, Mail.Read`. Preencha no `.env`:
`AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` e
`AUTH_MICROSOFT_ENTRA_ID_ISSUER` (com o tenant ID). O sync do Outlook roda
via cron chamando `GET /api/sync` com header
`Authorization: Bearer <CRON_SECRET>`.

## Verificação

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Concluído significa os quatro passando, nesta ordem (`CLAUDE.md`).

## Referências

- Estado e próximos passos: `ROADMAP.md`
- Domínio, prazos, sync e interface: `docs/`
