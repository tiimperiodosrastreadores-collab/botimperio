# Bot Império — Assistente Interno

Chatbot da **Império dos Rastreadores** com chat web e **WhatsApp via QR Code** (Evolution API — gratuito).

> **Comece aqui:** leia o [GUIA-RAPIDO.md](./GUIA-RAPIDO.md) — só 5 passos para colocar online.

## O que você precisa

| Serviço | Custo | Função |
|---------|-------|--------|
| [GitHub](https://github.com/tiimperiodosrastreadores-collab/botimperio) | Grátis | Código |
| [Vercel](https://vercel.com) | Grátis | Chat web online |
| [Render](https://render.com) | Grátis | Evolution API (QR Code do Zap) |
| [OpenAI](https://platform.openai.com) | Pago por uso | Inteligência do bot |
| Docker Desktop | Grátis | Testar Zap localmente |

---

## Passo a passo completo

### PASSO 1 — Subir código no GitHub

O repositório já está em: https://github.com/tiimperiodosrastreadores-collab/botimperio

```bash
git init
git add .
git commit -m "Bot Império com WhatsApp QR Code"
git branch -M main
git remote add origin https://github.com/tiimperiodosrastreadores-collab/botimperio.git
git push -u origin main
```

---

### PASSO 2 — Deploy do chat na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório `botimperio`
3. Em **Environment Variables**, adicione:

| Variável | Valor |
|----------|--------|
| `OPENAI_API_KEY` | sua chave OpenAI |
| `OPENAI_ASSISTANT_ID` | ID do assistente |
| `INTERNAL_PASSWORD` | senha da equipe |
| `NEXT_PUBLIC_APP_URL` | `https://seu-projeto.vercel.app` |
| `EVOLUTION_API_URL` | URL do Render (passo 3) |
| `EVOLUTION_API_KEY` | `imperio2025api` |
| `EVOLUTION_INSTANCE_NAME` | `botimperio` |

4. Clique em **Deploy**
5. Teste: `https://seu-projeto.vercel.app` → login com a senha

---

### PASSO 3 — Evolution API no Render (QR Code grátis)

A Evolution API mantém a conexão com o WhatsApp. Ela **não roda na Vercel** — vai no Render.

1. Crie conta em [render.com](https://render.com)
2. **New → Web Service**
3. Escolha **Deploy an existing image from a Docker registry**
4. Preencha:
   - **Image URL:** `atendai/evolution-api:v2.2.3`
   - **Name:** `evolution-botimperio`
   - **Plan:** Free
5. Em **Environment Variables**:

| Variável | Valor |
|----------|--------|
| `AUTHENTICATION_API_KEY` | `imperio2025api` |
| `SERVER_URL` | `https://evolution-botimperio.onrender.com` (sua URL do Render) |
| `DEL_INSTANCE` | `false` |

6. Em **Disk**, adicione um disco persistente (1 GB) — importante para não perder a sessão do Zap
7. **Deploy**

Anote a URL do Render (ex: `https://evolution-botimperio.onrender.com`) e coloque na Vercel em `EVOLUTION_API_URL`.

---

### PASSO 4 — Conectar o WhatsApp (QR Code)

1. Acesse o chat web: `https://seu-projeto.vercel.app`
2. Faça login
3. Clique em **WhatsApp** no topo (ou acesse `/admin/whatsapp`)
4. Aparece o **QR Code**
5. No celular:
   - Abra o **WhatsApp**
   - **Menu (⋮) → Aparelhos conectados → Conectar aparelho**
   - Escaneie o QR Code
6. Quando conectar, a tela mostra **WhatsApp conectado!**

Pronto — mensagens enviadas para esse número serão respondidas pelo bot.

---

### PASSO 5 — Testar

Mande uma mensagem de outro celular para o número conectado:

> "Qual configuração do LV-12 4G interno?"

O bot deve responder com os comandos SMS formatados.

---

## Testar tudo no seu PC (antes de subir)

### 1. Instalar Docker Desktop

Baixe em [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)

### 2. Subir a Evolution API

```bash
docker compose up -d
```

### 3. Subir o bot

```bash
npm install
npm run dev
```

### 4. Conectar o Zap

1. Acesse http://localhost:3000
2. Login: `imperio2025`
3. Clique em **WhatsApp**
4. Escaneie o QR Code

> Para webhook local funcionar com mensagens recebidas, use [ngrok](https://ngrok.com) apontando para a porta 3000 e atualize `NEXT_PUBLIC_APP_URL` no `.env.local`.

---

## Como alimentar o bot

Edite arquivos em `knowledge/`:

```
knowledge/
├── assistente-rastreadores.md
├── faq.md
├── processos.md
└── politicas.md
```

Faça commit e a Vercel redeploya automaticamente.

---

## Estrutura

```
app/
├── admin/whatsapp/       # Tela do QR Code
├── api/whatsapp/
│   ├── webhook/          # Recebe mensagens do Zap
│   ├── qrcode/           # Gera QR Code
│   ├── status/           # Status da conexão
│   └── restart/          # Reconectar / desconectar
├── api/chat/             # Chat web
└── login/
lib/
├── evolution.ts          # Integração WhatsApp QR
├── openai.ts
├── persona.ts
└── rag.ts
docker-compose.yml        # Evolution API local
```

---

## Segurança

- Não commite `.env.local`
- Use `WHATSAPP_ALLOWED_NUMBERS` para limitar quem o bot responde
- O chat web exige senha interna
- WhatsApp via QR é para uso interno — evite spam para não ser bloqueado
