
# 🤖 Quest Bot Inmersivo - Bot de Telegram

Bot funcional de Telegram con sistema de narrativa inmersiva, gamificación completa y panel de administración.

## 🚀 Características

### 📖 Sistema Narrativo
- Historias ramificadas con múltiples finales
- Decisiones que impactan la narrativa
- Múltiples capítulos y escenas
- Sistema de progreso personalizado

### 🎮 Gamificación Completa
- Sistema de niveles y experiencia
- Monedas virtuales y economía
- Logros desbloqueables
- Rankings competitivos
- Inventario de objetos
- Estadísticas detalladas

### 🛠️ Panel de Administración
- Dashboard con estadísticas en tiempo real
- Gestión de usuarios
- Mensajes broadcast
- Exportación de datos
- Top jugadores

## 📋 Instalación y Configuración

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Bot de Telegram
1. Habla con @BotFather en Telegram
2. Crea un nuevo bot con `/newbot`
3. Copia el token que te proporciona
4. Configura la variable de entorno:

```bash
export TELEGRAM_BOT_TOKEN="tu_token_aqui"
```

### 3. Ejecutar el Bot

**Desarrollo:**
```bash
npm run bot:dev
```

**Producción:**
```bash
npm run bot
```

## 🎯 Comandos del Bot

- `/start` - Iniciar aventura
- `/perfil` - Ver perfil de jugador
- `/ranking` - Tabla de líderes
- `/logros` - Logros desbloqueados
- `/inventario` - Objetos coleccionados
- `/ayuda` - Lista completa de comandos

## 🌐 Panel de Administración

Accede a `http://localhost:3000/admin` para:
- Ver estadísticas generales
- Gestionar usuarios
- Enviar mensajes globales
- Exportar datos

## 📊 Base de Datos

El bot utiliza SQLite para almacenar:
- **Usuarios**: Perfiles, niveles, experiencia
- **Progreso**: Decisiones y capítulos completados
- **Logros**: Sistema de achievements
- **Estadísticas**: Métricas de juego

## 🎨 Personalización

### Agregar Nuevas Historias
Edita `src/telegram-bot/narrative/NarrativeEngine.ts`:

```typescript
const newChapter: Scene[] = [
  {
    id: 1,
    title: "Tu Nueva Historia",
    description: "Descripción inmersiva...",
    choices: [
      {
        id: "choice_1",
        text: "Opción 1",
        nextScene: 2,
        effects: [{ type: 'experience', value: 20 }]
      }
    ]
  }
];
```

### Crear Nuevos Logros
Modifica `DatabaseManager.ts` en `insertDefaultAchievements()`:

```typescript
{
  id: 'nuevo_logro',
  name: 'Nombre del Logro',
  description: 'Descripción del logro',
  icon: '🏆',
  points: 100,
  rarity: 'rare'
}
```

## 🔧 Configuración Avanzada

### Variables de Entorno
```bash
TELEGRAM_BOT_TOKEN=tu_token_del_bot
PORT=3000                    # Puerto del servidor web
NODE_ENV=production         # Entorno de ejecución
```

### Webhooks (Producción)
Para producción, configura webhooks en lugar de polling:

```typescript
const bot = new TelegramBot(BOT_TOKEN, { webHook: true });
bot.setWebHook(`https://tu-dominio.com/bot${BOT_TOKEN}`);
```

## 📈 Monitoreo y Logs

El bot incluye logging automático de:
- Usuarios nuevos
- Decisiones tomadas
- Errores del sistema
- Estadísticas de uso

## 🛡️ Seguridad

- Token del bot nunca expuesto en el código
- Validación de entrada de usuarios
- Rate limiting automático
- Sanitización de mensajes

## 🚀 Despliegue

### Heroku
```bash
git push heroku main
heroku config:set TELEGRAM_BOT_TOKEN=tu_token
```

### VPS/Servidor
```bash
pm2 start src/telegram-bot/index.ts --name quest-bot
```

## 🎯 Roadmap

- [ ] Sistema de comercio entre jugadores
- [ ] Eventos temporales
- [ ] Clanes y guilds
- [ ] Minijuegos integrados
- [ ] Sistema de crafting
- [ ] Marketplace de objetos

## 📞 Soporte

¿Necesitas ayuda? El bot incluye:
- Sistema de ayuda integrado (`/ayuda`)
- Documentación completa
- Panel de administración intuitivo

¡Tu aventura épica comienza ahora! 🎮✨
