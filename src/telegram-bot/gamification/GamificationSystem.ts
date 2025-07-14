
import { DatabaseManager } from '../database/DatabaseManager';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

export interface UserStats {
  decisionsTotal: number;
  chaptersCompleted: number;
  treasuresFound: number;
  daysActive: number;
  achievements: number;
}

export class GamificationSystem {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  async getUserProfile(userId: number): Promise<{
    user: any;
    stats: UserStats;
    achievements: Achievement[];
    rank: number;
  } | null> {
    const user = await this.db.getUser(userId);
    if (!user) return null;

    const stats = this.calculateUserStats(user);
    const achievements = await this.getUserAchievements(userId);
    const rank = await this.getUserRank(userId);

    return { user, stats, achievements, rank };
  }

  private calculateUserStats(user: any): UserStats {
    const stats = JSON.parse(user.stats || '{}');
    
    return {
      decisionsTotal: stats.decisionsTotal || 0,
      chaptersCompleted: stats.chaptersCompleted || 0,
      treasuresFound: stats.treasuresFound || 0,
      daysActive: this.calculateDaysActive(user.createdAt),
      achievements: JSON.parse(user.achievements || '[]').length
    };
  }

  private calculateDaysActive(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private async getUserAchievements(userId: number): Promise<Achievement[]> {
    const user = await this.db.getUser(userId);
    if (!user) return [];

    const userAchievements = JSON.parse(user.achievements || '[]');
    const allAchievements = await this.db.getAllAchievements();

    return allAchievements
      .filter(achievement => userAchievements.includes(achievement.id))
      .map(achievement => ({
        ...achievement,
        unlockedAt: new Date().toISOString() // Simplificado para el ejemplo
      }));
  }

  private async getUserRank(userId: number): Promise<number> {
    const ranking = await this.db.getRanking(1000);
    const userIndex = ranking.findIndex(user => user.id === userId);
    return userIndex + 1;
  }

  async checkAchievements(userId: number): Promise<Achievement[]> {
    const user = await this.db.getUser(userId);
    if (!user) return [];

    const newAchievements: Achievement[] = [];
    const stats = this.calculateUserStats(user);

    // Verificar logros automáticos
    if (user.level >= 5 && !await this.hasAchievement(userId, 'first_milestone')) {
      if (await this.db.unlockAchievement(userId, 'first_milestone')) {
        newAchievements.push(await this.getAchievementById('first_milestone'));
      }
    }

    if (stats.decisionsTotal >= 10 && !await this.hasAchievement(userId, 'decision_maker')) {
      if (await this.db.unlockAchievement(userId, 'decision_maker')) {
        newAchievements.push(await this.getAchievementById('decision_maker'));
      }
    }

    return newAchievements;
  }

  private async hasAchievement(userId: number, achievementId: string): Promise<boolean> {
    const user = await this.db.getUser(userId);
    if (!user) return false;

    const achievements = JSON.parse(user.achievements || '[]');
    return achievements.includes(achievementId);
  }

  private async getAchievementById(achievementId: string): Promise<Achievement> {
    const allAchievements = await this.db.getAllAchievements();
    return allAchievements.find(a => a.id === achievementId) || {
      id: achievementId,
      name: 'Logro Desconocido',
      description: 'Descripción no disponible',
      icon: '❓',
      points: 0,
      rarity: 'common' as const
    };
  }

  formatUserProfile(profile: any): string {
    const { user, stats, achievements, rank } = profile;
    
    const levelBar = this.createLevelBar(user.experience % 100);
    const rankIcon = this.getRankIcon(rank);
    
    return `
🎭 **PERFIL DE AVENTURERO** 🎭

${rankIcon} **${user.username}**
📊 Nivel: **${user.level}** ${levelBar}
⭐ Exp: **${user.experience}** (+${100 - (user.experience % 100)} para subir)
💰 Monedas: **${user.coins}**
🏆 Ranking: **#${rank}**

📈 **ESTADÍSTICAS:**
🎯 Decisiones tomadas: **${stats.decisionsTotal}**
📚 Capítulos completados: **${stats.chaptersCompleted}**
💎 Tesoros encontrados: **${stats.treasuresFound}**
📅 Días activo: **${stats.daysActive}**
🏅 Logros desbloqueados: **${stats.achievements}**

🏆 **LOGROS RECIENTES:**
${achievements.slice(-3).map(a => `${a.icon} ${a.name}`).join('\n') || 'Sin logros aún'}
    `.trim();
  }

  private createLevelBar(progress: number): string {
    const filled = Math.floor(progress / 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
  }

  private getRankIcon(rank: number): string {
    if (rank === 1) return '👑';
    if (rank <= 3) return '🥉';
    if (rank <= 10) return '⭐';
    if (rank <= 50) return '🌟';
    return '✨';
  }

  formatRanking(users: any[]): string {
    let ranking = '🏆 **RANKING DE AVENTUREROS** 🏆\n\n';
    
    users.forEach((user, index) => {
      const position = index + 1;
      const icon = position === 1 ? '👑' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';
      
      ranking += `${icon} **#${position}** ${user.username}\n`;
      ranking += `   📊 Nivel ${user.level} | ⭐ ${user.experience} exp | 💰 ${user.coins}\n\n`;
    });
    
    return ranking;
  }
}
