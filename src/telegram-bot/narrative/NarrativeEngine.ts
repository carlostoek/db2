
import { DatabaseManager } from '../database/DatabaseManager';

export interface Scene {
  id: number;
  title: string;
  description: string;
  image?: string;
  choices: Choice[];
  rewards?: Reward[];
  requirements?: Requirement[];
}

export interface Choice {
  id: string;
  text: string;
  nextScene: number;
  effects?: Effect[];
}

export interface Effect {
  type: 'experience' | 'coins' | 'item' | 'achievement';
  value: any;
}

export interface Reward {
  type: 'experience' | 'coins' | 'item';
  amount: number;
  name?: string;
}

export interface Requirement {
  type: 'level' | 'item' | 'achievement';
  value: any;
}

export class NarrativeEngine {
  private db: DatabaseManager;
  private chapters: Map<number, Scene[]> = new Map();

  constructor(db: DatabaseManager) {
    this.db = db;
    this.initializeStories();
  }

  private initializeStories() {
    // Capítulo 1: El Despertar del Héroe
    const chapter1: Scene[] = [
      {
        id: 1,
        title: "🌅 El Despertar",
        description: "Te despiertas en una misteriosa cabaña en el bosque. La luz del amanecer se filtra por las ventanas rotas. No recuerdas cómo llegaste aquí, pero sientes que algo importante te espera afuera.",
        choices: [
          {
            id: "explore_cabin",
            text: "🏠 Explorar la cabaña",
            nextScene: 2,
            effects: [{ type: 'experience', value: 10 }]
          },
          {
            id: "leave_immediately",
            text: "🚪 Salir inmediatamente",
            nextScene: 3,
            effects: [{ type: 'coins', value: 20 }]
          }
        ],
        rewards: [{ type: 'experience', amount: 5 }]
      },
      {
        id: 2,
        title: "🔍 Secretos de la Cabaña",
        description: "Al explorar la cabaña, encuentras un cofre oculto bajo las tablas del suelo. Dentro hay una antigua daga élfica y un mapa misterioso que muestra la ubicación de un tesoro perdido.",
        choices: [
          {
            id: "take_dagger",
            text: "⚔️ Tomar la daga",
            nextScene: 4,
            effects: [
              { type: 'item', value: 'daga_elfica' },
              { type: 'achievement', value: 'treasure_hunter' }
            ]
          },
          {
            id: "study_map",
            text: "🗺️ Estudiar el mapa",
            nextScene: 5,
            effects: [{ type: 'experience', value: 25 }]
          }
        ]
      },
      {
        id: 3,
        title: "🌲 El Bosque Encantado",
        description: "Sales de la cabaña y te encuentras en un bosque mágico. Los árboles parecen susurrar secretos antiguos. Un sendero serpenteante se divide en dos direcciones.",
        choices: [
          {
            id: "north_path",
            text: "⬆️ Sendero del Norte",
            nextScene: 6,
            effects: [{ type: 'experience', value: 15 }]
          },
          {
            id: "south_path",
            text: "⬇️ Sendero del Sur",
            nextScene: 7,
            effects: [{ type: 'coins', value: 30 }]
          }
        ]
      },
      {
        id: 4,
        title: "⚔️ El Poder de la Daga",
        description: "La daga élfica vibra con energía mágica en tus manos. Sientes como tu fuerza interior se despierta. De repente, escuchas rugidos en la distancia.",
        choices: [
          {
            id: "investigate_roars",
            text: "🦁 Investigar los rugidos",
            nextScene: 8,
            effects: [{ type: 'experience', value: 20 }]
          },
          {
            id: "hide_and_wait",
            text: "🫥 Esconderse y esperar",
            nextScene: 9,
            effects: [{ type: 'coins', value: 15 }]
          }
        ]
      }
    ];

    // Capítulo 2: La Prueba del Valor
    const chapter2: Scene[] = [
      {
        id: 1,
        title: "🏰 La Torre Misteriosa",
        description: "Llegas a una imponente torre de piedra que se alza hacia las nubes. Una inscripción antigua dice: 'Solo los valientes pueden ascender'.",
        requirements: [{ type: 'level', value: 3 }],
        choices: [
          {
            id: "climb_tower",
            text: "🧗 Escalar la torre",
            nextScene: 2,
            effects: [{ type: 'experience', value: 50 }]
          },
          {
            id: "find_another_way",
            text: "🔍 Buscar otra entrada",
            nextScene: 3,
            effects: [{ type: 'coins', value: 40 }]
          }
        ]
      }
    ];

    this.chapters.set(1, chapter1);
    this.chapters.set(2, chapter2);
  }

  async getCurrentScene(userId: number): Promise<Scene | null> {
    const user = await this.db.getUser(userId);
    if (!user) return null;

    const chapter = this.chapters.get(user.currentChapter);
    if (!chapter) return null;

    return chapter.find(scene => scene.id === user.currentScene) || null;
  }

  async processChoice(userId: number, choiceId: string): Promise<{
    nextScene: Scene | null;
    effects: Effect[];
    levelUp?: boolean;
    newLevel?: number;
  }> {
    const currentScene = await this.getCurrentScene(userId);
    if (!currentScene) return { nextScene: null, effects: [] };

    const choice = currentScene.choices.find(c => c.id === choiceId);
    if (!choice) return { nextScene: null, effects: [] };

    // Procesar efectos
    const effects = choice.effects || [];
    let levelUpInfo = { levelUp: false, newLevel: 1 };

    for (const effect of effects) {
      switch (effect.type) {
        case 'experience':
          levelUpInfo = await this.db.addExperience(userId, effect.value);
          break;
        case 'coins':
          await this.db.addCoins(userId, effect.value);
          break;
        case 'achievement':
          await this.db.unlockAchievement(userId, effect.value);
          break;
        case 'item':
          await this.addItemToInventory(userId, effect.value);
          break;
      }
    }

    // Actualizar escena actual
    const user = await this.db.getUser(userId);
    if (user) {
      await this.db.updateUser(userId, {
        currentScene: choice.nextScene
      });

      // Guardar progreso
      await this.db.saveProgress(userId, user.currentChapter, choice.nextScene, [choiceId]);
    }

    // Obtener siguiente escena
    const chapter = this.chapters.get(user?.currentChapter || 1);
    const nextScene = chapter?.find(scene => scene.id === choice.nextScene) || null;

    return {
      nextScene,
      effects,
      levelUp: levelUpInfo.levelUp,
      newLevel: levelUpInfo.newLevel
    };
  }

  private async addItemToInventory(userId: number, itemId: string): Promise<void> {
    const user = await this.db.getUser(userId);
    if (!user) return;

    const inventory = JSON.parse(user.inventory || '[]');
    inventory.push({
      id: itemId,
      name: this.getItemName(itemId),
      obtainedAt: new Date().toISOString()
    });

    await this.db.updateUser(userId, {
      inventory: JSON.stringify(inventory)
    });
  }

  private getItemName(itemId: string): string {
    const items: { [key: string]: string } = {
      'daga_elfica': '🗡️ Daga Élfica',
      'mapa_tesoro': '🗺️ Mapa del Tesoro',
      'pocion_vida': '🧪 Poción de Vida',
      'amuleto_poder': '🔮 Amuleto de Poder'
    };
    return items[itemId] || '❓ Objeto Misterioso';
  }

  getChapterCount(): number {
    return this.chapters.size;
  }

  getSceneCount(chapterId: number): number {
    return this.chapters.get(chapterId)?.length || 0;
  }
}
