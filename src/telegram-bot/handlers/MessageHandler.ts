
import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../database/DatabaseManager';
import { NarrativeEngine } from '../narrative/NarrativeEngine';
import { GamificationSystem } from '../gamification/GamificationSystem';

export class MessageHandler {
  private bot: TelegramBot;
  private db: DatabaseManager;
  private narrative: NarrativeEngine;
  private gamification: GamificationSystem;

  constructor(
    bot: TelegramBot,
    db: DatabaseManager,
    narrative: NarrativeEngine,
    gamification: GamificationSystem
  ) {
    this.bot = bot;
    this.db = db;
    this.narrative = narrative;
    this.gamification = gamification;
  }

  async handleStart(chatId: number, userId: number, username: string) {
    const welcomeMessage = `
🌟 **¡Bienvenido a Quest Bot Inmersivo!** 🌟

¡Hola **${username}**! Te doy la bienvenida a una aventura épica donde cada decisión que tomes cambiará tu destino.

🎭 **¿Qué te espera?**
• 📚 Historias inmersivas con múltiples finales
• ⚔️ Sistema de niveles y experiencia
• 💰 Monedas y objetos coleccionables
• 🏆 Logros y rankings competitivos
• 🎯 Decisiones que impactan la narrativa

🎮 **Comandos disponibles:**
/perfil - Ver tu perfil de aventurero
/ranking - Tabla de líderes
/logros - Tus logros desbloqueados
/inventario - Objetos que posees
/ayuda - Lista completa de comandos

🚀 **¡Tu aventura comienza AHORA!**
    `.trim();

    await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    
    // Mostrar primera escena
    await this.showCurrentScene(chatId, userId);
  }

  async handleMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    // Verificar si el usuario existe
    let user = await this.db.getUser(userId);
    if (!user) {
      await this.bot.sendMessage(chatId, '❌ Usuario no encontrado. Usa /start para comenzar.');
      return;
    }

    // Respuesta genérica para mensajes de texto libre
    const responses = [
      '🤔 Interesante... pero necesitas tomar una decisión usando los botones de la historia.',
      '📖 Tu aventura continúa... elige una opción de la escena actual.',
      '⚡ Las palabras tienen poder, pero las acciones definen tu destino. ¡Elige!',
      '🗣️ He escuchado tus palabras, aventurero. Ahora decide tu próximo paso.',
      '✨ El destino te escucha... usa los botones para continuar tu historia.'
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await this.bot.sendMessage(chatId, randomResponse);
    
    // Mostrar escena actual
    await this.showCurrentScene(chatId, userId);
  }

  async handleCallback(query: TelegramBot.CallbackQuery) {
    if (!query.data || !query.from || !query.message) return;

    const userId = query.from.id;
    const chatId = query.message.chat.id;
    const choiceId = query.data;

    await this.bot.answerCallbackQuery(query.id);

    // Procesar la elección
    const result = await this.narrative.processChoice(userId, choiceId);

    if (!result.nextScene) {
      await this.bot.sendMessage(chatId, '❌ Error: No se pudo procesar tu elección.');
      return;
    }

    // Mostrar efectos de la elección
    await this.showChoiceEffects(chatId, result.effects, result.levelUp, result.newLevel);

    // Verificar nuevos logros
    const newAchievements = await this.gamification.checkAchievements(userId);
    if (newAchievements.length > 0) {
      await this.showNewAchievements(chatId, newAchievements);
    }

    // Mostrar siguiente escena
    await this.showScene(chatId, result.nextScene);
  }

  private async showCurrentScene(chatId: number, userId: number) {
    const scene = await this.narrative.getCurrentScene(userId);
    if (scene) {
      await this.showScene(chatId, scene);
    }
  }

  private async showScene(chatId: number, scene: any) {
    const keyboard = {
      inline_keyboard: scene.choices.map((choice: any) => [
        { text: choice.text, callback_data: choice.id }
      ])
    };

    let message = `📖 **${scene.title}**\n\n${scene.description}\n\n💡 **¿Qué decides hacer?**`;

    if (scene.image) {
      try {
        await this.bot.sendPhoto(chatId, scene.image, {
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error) {
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    } else {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  }

  private async showChoiceEffects(chatId: number, effects: any[], levelUp?: boolean, newLevel?: number) {
    if (effects.length === 0 && !levelUp) return;

    let message = '✨ **Resultados de tu elección:**\n\n';

    for (const effect of effects) {
      switch (effect.type) {
        case 'experience':
          message += `⭐ +${effect.value} experiencia\n`;
          break;
        case 'coins':
          message += `💰 +${effect.value} monedas\n`;
          break;
        case 'item':
          message += `🎒 Objeto obtenido: ${effect.value}\n`;
          break;
        case 'achievement':
          message += `🏆 ¡Logro desbloqueado!\n`;
          break;
      }
    }

    if (levelUp && newLevel) {
      message += `\n🎉 **¡SUBISTE DE NIVEL!**\n🔥 Ahora eres nivel ${newLevel}`;
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  private async showNewAchievements(chatId: number, achievements: any[]) {
    for (const achievement of achievements) {
      const message = `
🏆 **¡NUEVO LOGRO DESBLOQUEADO!** 🏆

${achievement.icon} **${achievement.name}**
📝 ${achievement.description}
💎 +${achievement.points} puntos

🎊 ¡Sigue así, aventurero!
      `.trim();

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
  }

  async handleProfile(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    const profile = await this.gamification.getUserProfile(userId);
    if (!profile) {
      await this.bot.sendMessage(chatId, '❌ Perfil no encontrado. Usa /start para comenzar.');
      return;
    }

    const profileText = this.gamification.formatUserProfile(profile);
    await this.bot.sendMessage(chatId, profileText, { parse_mode: 'Markdown' });
  }

  async handleRanking(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const ranking = await this.db.getRanking(10);
    const rankingText = this.gamification.formatRanking(ranking);
    
    await this.bot.sendMessage(chatId, rankingText, { parse_mode: 'Markdown' });
  }

  async handleAchievements(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    const profile = await this.gamification.getUserProfile(userId);
    if (!profile) {
      await this.bot.sendMessage(chatId, '❌ Perfil no encontrado.');
      return;
    }

    let message = '🏆 **TUS LOGROS DESBLOQUEADOS** 🏆\n\n';
    
    if (profile.achievements.length === 0) {
      message += '📝 Aún no has desbloqueado ningún logro.\n¡Continúa tu aventura para obtener los primeros!';
    } else {
      profile.achievements.forEach(achievement => {
        const rarityColor = this.getRarityEmoji(achievement.rarity);
        message += `${rarityColor} ${achievement.icon} **${achievement.name}**\n`;
        message += `   📝 ${achievement.description}\n`;
        message += `   💎 ${achievement.points} puntos\n\n`;
      });
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async handleInventory(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    const user = await this.db.getUser(userId);
    if (!user) {
      await this.bot.sendMessage(chatId, '❌ Usuario no encontrado.');
      return;
    }

    const inventory = JSON.parse(user.inventory || '[]');
    let message = '🎒 **TU INVENTARIO** 🎒\n\n';

    if (inventory.length === 0) {
      message += '📦 Tu inventario está vacío.\n¡Explora y encuentra objetos increíbles!';
    } else {
      inventory.forEach((item: any, index: number) => {
        message += `${index + 1}. ${item.name}\n`;
        message += `   📅 Obtenido: ${new Date(item.obtainedAt).toLocaleDateString()}\n\n`;
      });
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  async handleHelp(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    
    const helpMessage = `
🆘 **AYUDA - QUEST BOT INMERSIVO** 🆘

🎮 **Comandos principales:**
/start - Iniciar/reiniciar aventura
/perfil - Ver tu perfil completo
/ranking - Tabla de líderes global
/logros - Tus logros desbloqueados
/inventario - Objetos que posees
/ayuda - Mostrar esta ayuda

🎯 **¿Cómo jugar?**
• Lee cada escena cuidadosamente
• Toma decisiones usando los botones
• Gana experiencia y monedas
• Desbloquea logros especiales
• Sube en el ranking global

💡 **Consejos:**
• Cada decisión afecta tu historia
• Explora diferentes caminos
• Colecciona objetos únicos
• Compite con otros jugadores

🌟 **¡Que disfrutes tu aventura!**
    `.trim();

    await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }

  private getRarityEmoji(rarity: string): string {
    const rarities: { [key: string]: string } = {
      'common': '⚪',
      'uncommon': '🟢',
      'rare': '🔵',
      'epic': '🟣',
      'legendary': '🟡'
    };
    return rarities[rarity] || '⚪';
  }
}
