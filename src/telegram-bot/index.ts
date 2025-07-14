
import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import { DatabaseManager } from './database/DatabaseManager';
import { NarrativeEngine } from './narrative/NarrativeEngine';
import { GamificationSystem } from './gamification/GamificationSystem';
import { AdminPanel } from './admin/AdminPanel';
import { MessageHandler } from './handlers/MessageHandler';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const PORT = process.env.PORT || 3000;

class TelegramQuestBot {
  private bot: TelegramBot;
  private app: express.Application;
  private db: DatabaseManager;
  private narrative: NarrativeEngine;
  private gamification: GamificationSystem;
  private admin: AdminPanel;
  private messageHandler: MessageHandler;

  constructor() {
    this.bot = new TelegramBot(BOT_TOKEN, { polling: true });
    this.app = express();
    this.db = new DatabaseManager();
    this.narrative = new NarrativeEngine(this.db);
    this.gamification = new GamificationSystem(this.db);
    this.admin = new AdminPanel(this.db, this.bot);
    this.messageHandler = new MessageHandler(this.bot, this.db, this.narrative, this.gamification);
    
    this.initializeBot();
    this.setupWebServer();
  }

  private async initializeBot() {
    await this.db.initialize();
    console.log('✅ Base de datos inicializada');

    // Comando de inicio
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const username = msg.from?.username || msg.from?.first_name || 'Aventurero';

      if (userId) {
        await this.db.createUser(userId, username, chatId);
        await this.messageHandler.handleStart(chatId, userId, username);
      }
    });

    // Manejo de mensajes de texto
    this.bot.on('message', async (msg) => {
      if (!msg.text?.startsWith('/')) {
        await this.messageHandler.handleMessage(msg);
      }
    });

    // Manejo de callbacks de botones inline
    this.bot.on('callback_query', async (query) => {
      await this.messageHandler.handleCallback(query);
    });

    // Comandos del bot
    this.bot.onText(/\/perfil/, (msg) => this.messageHandler.handleProfile(msg));
    this.bot.onText(/\/ranking/, (msg) => this.messageHandler.handleRanking(msg));
    this.bot.onText(/\/logros/, (msg) => this.messageHandler.handleAchievements(msg));
    this.bot.onText(/\/inventario/, (msg) => this.messageHandler.handleInventory(msg));
    this.bot.onText(/\/ayuda/, (msg) => this.messageHandler.handleHelp(msg));

    console.log('🤖 Bot de Telegram iniciado correctamente');
  }

  private setupWebServer() {
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // Panel de administración
    this.app.use('/admin', this.admin.getRouter());
    
    this.app.listen(PORT, () => {
      console.log(`🌐 Servidor web ejecutándose en puerto ${PORT}`);
    });
  }

  public async start() {
    console.log('🚀 Iniciando Bot Quest Inmersivo...');
  }
}

// Inicializar el bot
const questBot = new TelegramQuestBot();
questBot.start();

export default TelegramQuestBot;
