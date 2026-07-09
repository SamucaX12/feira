# EcoScan AI — Feira de Ciências

Sistema de classificação de resíduos com webcam + dashboard em tempo real.

## Materiais detectados

| Material | Lixeira |
|----------|---------|
| Garrafa PET | 🟡 Amarela (Reciclável) |
| Papel / Papelão | 🟡 Amarela (Reciclável) |
| Lata / Alumínio | 🟡 Amarela (Reciclável) |
| Orgânico | 🟤 Marrom |
| Pedra / Rejeito | ⚪ Cinza |

O app detecta **automaticamente** pela câmera e mostra onde jogar + confirma o descarte.

## Sem webcam — só celular

No PC (PowerShell):

```powershell
cd feira-ciencias
npm run dev:celular
```

Ou:

```powershell
.\scripts\start-celular.ps1
```

No **celular** (mesma Wi-Fi do PC):

1. Abra `https://SEU-IP-DO-PC:3000` (o script mostra o IP)
2. Aceite o aviso de certificado (é local, seguro pra demo)
3. Toque em **Ativar câmera** e permita
4. Aponte a câmera traseira pro resíduo e toque no material

> Câmera no celular **não funciona** em `http://192.168...` — precisa do HTTPS (`dev:celular`).

## Rodar AGORA (modo feira, sem config)

```powershell
cd feira-ciencias
npm install
npm run dev
```

Abra **http://localhost:3000**

- **Webcam** funciona no modo demo
- **4 botões** registram Plástico, Papel, Metal, Orgânico
- **Dashboard** atualiza na hora
- **Reset** zera contadores entre apresentações
- **Sem MongoDB** — dados ficam em memória enquanto o servidor roda

## Apresentação na feira

1. Mostre um objeto (garrafa, folha, lata, banana)
2. Aponte para a câmera
3. Clique no material correto
4. Mostre o gráfico subindo no dashboard

## IA automática (opcional)

1. Treine em [Teachable Machine](https://teachablemachine.withgoogle.com/) com 4 classes: `Plastico`, `Papel`, `Metal`, `Organico`
2. Exporte **TensorFlow.js → Upload (shareable link)**
3. Crie `.env.local`:

```env
NEXT_PUBLIC_TM_MODEL_URL=https://teachablemachine.withgoogle.com/models/SEU_ID/
```

4. Reinicie `npm run dev` — o scanner passa a classificar sozinho

## MongoDB (opcional, para persistir)

```env
MONGODB_URI=mongodb+srv://...
```

## Build produção

```powershell
npm run build
npm start
```
