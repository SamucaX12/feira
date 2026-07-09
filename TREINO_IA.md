# Como melhorar a IA (Teachable Machine)

O alumínio confundindo com lata ou papel quase sempre é **falta de fotos de treino**.
O código agora tem filtros inteligentes, mas o modelo precisa de mais exemplos.

## Passo 1 — Organize suas fotos

Crie pastas com estes nomes **exatos** (como classes no TM):

```
training/
  Aluminio/    ← latinhas brilhantes, tampas, papel-alumínio
  Lata/        ← lata de milho, sardinha (mais escura)
  Papel/       ← folha branca, jornal
  Papelao/     ← caixas de delivery
  PET/         ← garrafas
  Pedra/       ← pedras, cerâmica
  Organico/    ← casca de banana, restos
```

**Dica:** coloque suas fotos novas em cada pasta. Quanto mais, melhor (mínimo 15–20 por classe).

## Passo 2 — Treinar no Teachable Machine

1. Abra https://teachablemachine.withgoogle.com/
2. **Image Project** → Standard image model
3. Crie as classes com os nomes acima
4. **Upload** das fotos de cada pasta
5. **Train Model**
6. **Export** → TensorFlow.js → **Upload (shareable link)**
7. Copie o link (ex: `https://teachablemachine.withgoogle.com/models/XXXXX/`)

## Passo 3 — Atualizar o site

No arquivo `.env.local`:

```env
NEXT_PUBLIC_TM_MODEL_URL=https://teachablemachine.withgoogle.com/models/SEU_ID/
```

Reinicie o servidor ou faça redeploy na Vercel.

## Dicas para alumínio não confundir

| Material | O que fotografar |
|----------|------------------|
| **Alumínio** | Latinha **brilhante**, refletindo luz, vários ângulos |
| **Lata** | Lata de **aço escura** (milho, ervilha), sem brilho forte |
| **Papel** | Folha **branca/bege**, sem reflexo metálico |
| **Papelão** | Caixa **marrom**, textura de papelão visível |

Na demo: fundo limpo, boa luz, objeto sozinho na câmera.

## Deploy na Vercel

Após retreinar, atualize a variável `NEXT_PUBLIC_TM_MODEL_URL` no painel da Vercel e redeploy.
