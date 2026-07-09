# Deploy na Vercel (apresentação na escola)

## No notebook do professor

**Não precisa baixar nada.** Só abrir o link do site no Chrome:
`https://seu-projeto.vercel.app`

Funciona em notebook e celular. A câmera pede permissão no navegador (normal).

Seu PC pode ficar em casa — o site roda na nuvem da Vercel.

---

## Deploy em 5 minutos

### 1. Criar conta
- Acesse [vercel.com](https://vercel.com) e entre com GitHub ou e-mail

### 2. Subir o projeto
- **Add New → Project**
- Se tiver GitHub: importe a pasta `feira-ciencias`
- **Sem GitHub:** instale a CLI e rode na pasta do projeto:

```powershell
cd "c:\Users\fkdhtk\Downloads\hidden basic new\feira-ciencias"
npx vercel
```

Siga as perguntas (Enter em tudo). No fim aparece o link.

### 3. Variável de ambiente (obrigatório para IA)

Em **Vercel → seu projeto → Settings → Environment Variables**:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_TM_MODEL_URL` | `https://teachablemachine.withgoogle.com/models/-5I1Vxwti/` |

Marque **Production**, **Preview** e **Development**. Salve e clique **Redeploy**.

### 4. Pronto

Abra o link `https://xxxx.vercel.app` no celular da equipe na apresentação.

---

## Na feira

1. Abre o link no celular (HTTPS da Vercel — câmera funciona direto)
2. Toca **Ativar câmera** e permite
3. Aponta pro resíduo → IA detecta → mostra a lixeira

No notebook do professor: mesmo link, pode mostrar o dashboard na tela grande.
