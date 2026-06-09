# Guia Rápido — só o que VOCÊ precisa fazer

O projeto já está 100% pronto. Siga esta ordem:

---

## 1. Enviar pro GitHub (2 min)

Abra o terminal na pasta do projeto e rode:

```bash
git push -u origin main
```

> Se pedir login, use a conta da organização `tiimperiodosrastreadores-collab`.

Repositório: https://github.com/tiimperiodosrastreadores-collab/botimperio

---

## 2. Deploy na Vercel (5 min)

1. Acesse https://vercel.com/new
2. Importe o repositório **botimperio**
3. Antes de deployar, clique em **Environment Variables** e cole tudo abaixo:

| Variável | Valor |
|----------|--------|
| `OPENAI_API_KEY` | *(copie do seu `.env.local`)* |
| `OPENAI_ASSISTANT_ID` | `asst_6tfidzYPgr5BFn49brpfs3Cv` |
| `INTERNAL_PASSWORD` | `imperio2025` |
| `EVOLUTION_API_KEY` | `imperio2025api` |
| `EVOLUTION_INSTANCE_NAME` | `botimperio` |
| `EVOLUTION_API_URL` | *(preencher no passo 3)* |
| `NEXT_PUBLIC_APP_URL` | `https://SEU-PROJETO.vercel.app` |

4. Clique **Deploy**
5. Anote a URL gerada (ex: `https://botimperio.vercel.app`)

---

## 3. Evolution API no Render — Zap com QR Code (10 min)

1. Acesse https://dashboard.render.com
2. **New → Blueprint** (ou Web Service manual)
3. Conecte o GitHub e use o arquivo `render.yaml` deste projeto
   - **OU** crie manualmente:
     - **Image:** `atendai/evolution-api:v2.2.3`
     - **Plan:** Free
     - Variáveis: `AUTHENTICATION_API_KEY=imperio2025api`, `DEL_INSTANCE=false`
     - `SERVER_URL` = URL do Render (ex: `https://evolution-botimperio.onrender.com`)
     - Adicione **Disk** de 1 GB
4. Após deploy, copie a URL do Render
5. Volte na **Vercel → Settings → Environment Variables**:
   - `EVOLUTION_API_URL` = URL do Render
   - `NEXT_PUBLIC_APP_URL` = URL da Vercel
6. **Redeploy** na Vercel

---

## 4. Vercel Blob — upload de conhecimento (2 min)

1. Vercel → seu projeto → **Storage** → **Create Blob**
2. Conecte ao projeto (adiciona `BLOB_READ_WRITE_TOKEN` automaticamente)
3. **Redeploy**

---

## 5. Conectar o WhatsApp — QR Code (1 min)

1. Acesse sua URL da Vercel
2. Login: **imperio2025**
3. Clique **WhatsApp**
4. Escaneie o QR Code:
   - WhatsApp → Menu → Aparelhos conectados → Conectar aparelho

Pronto! O bot responde no Zap.

---

## 6. Atualizar conhecimento do bot

1. Login no chat
2. Clique **Conhecimento**
3. Envie arquivos `.md` ou `.txt`
4. Pronto — sem redeploy

---

## Testar localmente (opcional)

```powershell
.\scripts\iniciar-local.ps1
```

Acesse http://localhost:3000

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| QR Code não aparece | Aguarde 1 min (Render free hiberna) e atualize a página |
| Bot não responde no Zap | Verifique `EVOLUTION_API_URL` na Vercel |
| Upload não funciona | Crie o Vercel Blob (passo 4) |
| Erro OpenAI | Verifique `OPENAI_API_KEY` na Vercel |
