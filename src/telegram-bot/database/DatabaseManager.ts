
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';

export interface User {
  id: number;
  username: string;
  chatId: number;
  level: number;
  experience: number;
  coins: number;
  currentChapter: number;
  currentScene: number;
  createdAt: string;
  lastActive: string;
  inventory: string; // JSON string
  achievements: string; // JSON string
  stats: string; // JSON string
}

export interface UserProgress {
  userId: number;
  chapterId: number;
  sceneId: number;
  choices: string; // JSON string
  completedAt?: string;
}

export class DatabaseManager {
  private db!: Database;

  async initialize() {
    this.db = await open({
      filename: './quest_bot.db',
      driver: sqlite3.Database
    });

    await this.createTables();
  }

  private async createTables() {
    // Tabla de usuarios
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL,
        chatId INTEGER UNIQUE NOT NULL,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 100,
        currentChapter INTEGER DEFAULT 1,
        currentScene INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastActive DATETIME DEFAULT CURRENT_TIMESTAMP,
        inventory TEXT DEFAULT '[]',
        achievements TEXT DEFAULT '[]',
        stats TEXT DEFAULT '{}'
      )
    `);

    // Tabla de progreso
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        chapterId INTEGER,
        sceneId INTEGER,
        choices TEXT DEFAULT '[]',
        completedAt DATETIME,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);

    // Tabla de logros
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT DEFAULT '⭐',
        points INTEGER DEFAULT 0,
        rarity TEXT DEFAULT 'common'
      )
    `);

    // Insertar logros predeterminados
    await this.insertDefaultAchievements();
  }

  private async insertDefaultAchievements() {
    const achievements = [
      { id: 'first_steps', name: 'Primeros Pasos', description: 'Completa tu primera aventura', icon: '👣', points: 50, rarity: 'common' },
      { id: 'decision_maker', name: 'Tomador de Decisiones', description: 'Toma 10 decisiones importantes', icon: '🤔', points: 100, rarity: 'common' },
      { id: 'explorer', name: 'Explorador', description: 'Descubre 5 lugares secretos', icon: '🗺️', points: 200, rarity: 'uncommon' },
      { id: 'wise_one', name: 'El Sabio', description: 'Alcanza el nivel 10', icon: '🧙‍♂️', points: 500, rarity: 'rare' },
      { id: 'treasure_hunter', name: 'Cazatesoros', description: 'Encuentra 3 tesoros legendarios', icon: '💰', points: 300, rarity: 'uncommon' },
      { id: 'legend', name: 'Leyenda Viviente', description: 'Completa todas las historias', icon: '👑', points: 1000, rarity: 'legendary' }
    ];

    for (const achievement of achievements) {
      await this.db.run(
        'INSERT OR IGNORE INTO achievements (id, name, description, icon, points, rarity) VALUES (?, ?, ?, ?, ?, ?)',
        [achievement.id, achievement.name, achievement.description, achievement.icon, achievement.points, achievement.rarity]
      );
    }
  }

  async createUser(id: number, username: string, chatId: number): Promise<void> {
    await this.db.run(
      'INSERT OR IGNORE INTO users (id, username, chatId) VALUES (?, ?, ?)',
      [id, username, chatId]
    );
  }

  async getUser(userId: number): Promise<User | undefined> {
    return await this.db.get('SELECT * FROM users WHERE id = ?', [userId]);
  }

  async updateUser(userId: number, updates: Partial<User>): Promise<void> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    await this.db.run(
      `UPDATE users SET ${fields}, lastActive = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, userId]
    );
  }

  async addExperience(userId: number, exp: number): Promise<{ levelUp: boolean; newLevel: number }> {
    const user = await this.getUser(userId);
    if (!user) return { levelUp: false, newLevel: 1 };

    const newExp = user.experience + exp;
    const newLevel = Math.floor(newExp / 100) + 1;
    const levelUp = newLevel > user.level;

    await this.updateUser(userId, {
      experience: newExp,
      level: newLevel
    });

    return { levelUp, newLevel };
  }

  async addCoins(userId: number, coins: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      await this.updateUser(userId, {
        coins: user.coins + coins
      });
    }
  }

  async saveProgress(userId: number, chapterId: number, sceneId: number, choices: any[]): Promise<void> {
    await this.db.run(
      'INSERT INTO user_progress (userId, chapterId, sceneId, choices) VALUES (?, ?, ?, ?)',
      [userId, chapterId, sceneId, JSON.stringify(choices)]
    );
  }

  async getRanking(limit: number = 10): Promise<User[]> {
    return await this.db.all(
      'SELECT * FROM users ORDER BY level DESC, experience DESC LIMIT ?',
      [limit]
    );
  }

  async unlockAchievement(userId: number, achievementId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const achievements = JSON.parse(user.achievements || '[]');
    if (achievements.includes(achievementId)) return false;

    achievements.push(achievementId);
    await this.updateUser(userId, {
      achievements: JSON.stringify(achievements)
    });

    return true;
  }

  async getAllAchievements(): Promise<any[]> {
    return await this.db.all('SELECT * FROM achievements ORDER BY points ASC');
  }
}
