# Base Técnica - Assistente Império dos Rastreadores

## LV-12 4G INTERNO

Pacote padrão:

```
SERVER,0,95.216.72.142,5023,0#
APN,smart.m2m.vivo.com.br,vivo,vivo#
TIMER,60,3600#
SZCS#SLPDISCONNECT=0
```

Problema comum offline:

```
SZCS#GT06SEL=1
SZCS#SLPDISCONNECT=0
```

## LV-12 4G USB LATERAL

Pacote padrão:

```
ADMINIP123456 95.216.72.142 5023
APN123456 smart.m2m.vivo.com.br vivo vivo
fix060s99m***n123456
```

Problema de travamento:

```
OTA123456 120.31.136.83 8001
DRV123456 2
SLEEP123456 OFF
```

## Mini Rastreador / WEBTAG

Não aceita comandos SMS.
Ativação: retirar plástico da bateria.
Cadastro via QR Code no WebTag.
Comunicação via Bluetooth.
Não tem GPS nem chip de internet — depende de iPhones com Bluetooth, internet e localização.
Mostra apenas a última localização detectada.

## Biblioteca de Comandos Universais (#)

- RELAY,1# → Bloquear
- RELAY,0# → Desbloquear
- STATUS# → Status
- WHERE# → Localização
- FACTORY# → Reset fábrica
- RESET# → Reset software

## Comandos LV-12 USB (senha 123456)

- RELAY123456 1 → Bloquear
- RELAY123456 0 → Desbloquear
- STATUS123456 → Status
- SMSLINK123456 → Localização

## APNs Comuns

- APN,smart.m2m.vivo.com.br,vivo,vivo# → Vivo M2M
- APN,claro.com.br,claro,claro# → Claro M2M
- APN,m2m.tim.com.br,tim,tim# → TIM M2M
- APN,gprs.oi.com.br,oi,oi# → Oi

## Protocolo de Emergência (Roubo/Furto)

```
RELAY,1#
STATUS#
WHERE#
```

Ou para USB: RELAY123456 1, STATUS123456, SMSLINK123456.
Passar dados à polícia. Não interagir com criminosos.

## Protocolo de Diagnóstico

1. Confirmar modelo e sintoma.
2. Checar LEDs e interpretar sinais.
3. Enviar STATUS# para verificar rede/GPS.
4. Testar reset se necessário.

## Protocolo de Teste em Bancada

- Alimentação mínima: 9V a 36V.
- Chip com SMS ativo.
- Teste inicial: STATUS#

## Protocolo de Garantia

Testar equipamento. Se defeito confirmado, troca liberada.
Formulário de garantia: https://forms.gle/Dpkdn3mqsCK52iXw9

## Gestão e PIN

PIN de gestor para dados administrativos: IMPERIO2025

## Atendimento Humano

Para falar com responsável interno, encaminhar ao WhatsApp oficial da empresa.
