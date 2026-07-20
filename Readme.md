# 🤖 Raquel Staff - Dixel RP Forum Sync Bot

**Raquel Staff** es una solución automatizada diseñada para sincronizar la lista de la plantilla administrativa de la comunidad de **Dixel Roleplay** desde un canal de Discord hacia el foro (SMF) en tiempo real. 

El sistema funciona de manera híbrida: un bot de Discord escucha los cambios en la plantilla, resuelve las menciones asíncronas de usuarios y roles, y expone una API pública en Node.js/Express que renderiza una **imagen dinámica (PNG)** mediante Canvas. Esta imagen se incrusta en el foro mediante BBCode, eliminando la necesidad de editar manualmente el post ante cada cambio de staff.

---
<img width="568" height="369" alt="Captura de pantalla 2026-07-19 230534" src="https://github.com/user-attachments/assets/c8a58183-4457-4a78-94f2-c1e959529047" />

---
<img width="976" height="774" alt="Captura de pantalla 2026-07-19 230620" src="https://github.com/user-attachments/assets/d284ce19-15ea-4b5a-a19d-2b30f2826830" />

---

## 🚀 Arquitectura y Funcionamiento

1. **Escucha Activa (Discord.js):** Al iniciar, el bot lee el último mensaje del canal configurado. También se queda escuchando los eventos de creación (`messageCreate`) y edición (`messageUpdate`) en dicho canal.
2. **Procesamiento de Menciones (Parser Asíncrono):** Discord envía los roles como `<@&ID>` y los usuarios como `<@ID>`. El bot realiza un volcado previo de la caché de miembros del servidor (`guild.members.fetch()`) para traducir esos IDs a nombres y apodos reales en milisegundos.
3. **Servidor API (Express):** Levanta un endpoint público en `/api/staff.png`.
4. **Renderizado On-The-Fly (Canvas):** Cuando el foro solicita la imagen, el servidor calcula de forma dinámica el alto necesario basado en el número de rangos/usuarios actuales y "dibuja" un archivo PNG con un diseño oscuro personalizado que se envía directamente al navegador.

---

## 🛠️ Requisitos Previos

Antes de desplegar, asegúrate de tener instalado:
* **Node.js** v18 o superior.
* Una cuenta en **Discord Developer Portal**.
* Un entorno de hosting gratuito o VPS que soporte entornos de Node (ej. **Render.com**).

---

## 📦 Estructura del Proyecto

```text
dixel-staff-bot/
├── node_modules/
├── .env                  # Variables de entorno (Credenciales)
├── index.js              # Servidor Express, lógica del Bot y renderizado Canvas
├── package.json          # Dependencias del proyecto
└── README.md             # Documentación del sistema
