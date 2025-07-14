
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../database/DatabaseManager';

export class AdminPanel {
  private db: DatabaseManager;
  private bot: TelegramBot;
  private router: express.Router;

  constructor(db: DatabaseManager, bot: TelegramBot) {
    this.db = db;
    this.bot = bot;
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Dashboard principal
    this.router.get('/', async (req, res) => {
      const stats = await this.getGeneralStats();
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quest Bot - Panel Admin</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                .container { max-width: 1200px; margin: 0 auto; }
                .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .stat { display: inline-block; margin: 10px 15px; text-align: center; }
                .stat-number { font-size: 2em; font-weight: bold; color: #4CAF50; }
                .stat-label { color: #666; }
                .btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
                .btn:hover { background: #45a049; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 Quest Bot - Panel de Administración</h1>
                
                <div class="card">
                    <h2>📊 Estadísticas Generales</h2>
                    <div class="stat">
                        <div class="stat-number">${stats.totalUsers}</div>
                        <div class="stat-label">Usuarios Totales</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${stats.activeToday}</div>
                        <div class="stat-label">Activos Hoy</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${stats.totalDecisions}</div>
                        <div class="stat-label">Decisiones Tomadas</div>
                    </div>
                    <div class="stat">
                        <div class="stat-number">${stats.averageLevel}</div>
                        <div class="stat-label">Nivel Promedio</div>
                    </div>
                </div>

                <div class="card">
                    <h2>🎮 Acciones Rápidas</h2>
                    <button class="btn" onclick="broadcastMessage()">📢 Enviar Mensaje Global</button>
                    <button class="btn" onclick="viewUsers()">👥 Ver Usuarios</button>
                    <button class="btn" onclick="viewRanking()">🏆 Ver Ranking</button>
                    <button class="btn" onclick="exportData()">💾 Exportar Datos</button>
                </div>

                <div class="card">
                    <h2>👑 Top 10 Jugadores</h2>
                    <table>
                        <tr><th>Posición</th><th>Usuario</th><th>Nivel</th><th>Experiencia</th><th>Monedas</th></tr>
                        ${stats.topPlayers.map((player: any, index: number) => `
                            <tr>
                                <td>#${index + 1}</td>
                                <td>${player.username}</td>
                                <td>${player.level}</td>
                                <td>${player.experience}</td>
                                <td>${player.coins}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>

            <script>
                function broadcastMessage() {
                    const message = prompt('Mensaje a enviar a todos los usuarios:');
                    if (message) {
                        fetch('/admin/broadcast', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ message })
                        }).then(() => alert('Mensaje enviado!'));
                    }
                }

                function viewUsers() {
                    window.location.href = '/admin/users';
                }

                function viewRanking() {
                    window.location.href = '/admin/ranking';
                }

                function exportData() {
                    window.location.href = '/admin/export';
                }
            </script>
        </body>
        </html>
      `);
    });

    // Enviar mensaje global
    this.router.post('/broadcast', async (req, res) => {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Mensaje requerido' });
      }

      try {
        const users = await this.db.getRanking(1000); // Obtener todos los usuarios
        let sent = 0;

        for (const user of users) {
          try {
            await this.bot.sendMessage(user.chatId, `📢 **MENSAJE DEL ADMINISTRADOR**\n\n${message}`, { parse_mode: 'Markdown' });
            sent++;
          } catch (error) {
            console.log(`Error enviando mensaje a ${user.username}: ${error}`);
          }
        }

        res.json({ success: true, sent });
      } catch (error) {
        res.status(500).json({ error: 'Error enviando mensajes' });
      }
    });

    // Lista de usuarios
    this.router.get('/users', async (req, res) => {
      const users = await this.db.getRanking(100);
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Usuarios - Quest Bot Admin</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                .container { max-width: 1200px; margin: 0 auto; }
                .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
                .btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>👥 Gestión de Usuarios</h1>
                <button class="btn" onclick="history.back()">← Volver</button>
                
                <div class="card">
                    <h2>Lista de Usuarios (${users.length})</h2>
                    <table>
                        <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Nivel</th>
                            <th>Experiencia</th>
                            <th>Monedas</th>
                            <th>Capítulo</th>
                            <th>Último Activo</th>
                        </tr>
                        ${users.map((user: any) => `
                            <tr>
                                <td>${user.id}</td>
                                <td>${user.username}</td>
                                <td>${user.level}</td>
                                <td>${user.experience}</td>
                                <td>${user.coins}</td>
                                <td>${user.currentChapter}-${user.currentScene}</td>
                                <td>${new Date(user.lastActive).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            </div>
        </body>
        </html>
      `);
    });

    // Exportar datos
    this.router.get('/export', async (req, res) => {
      try {
        const users = await this.db.getRanking(1000);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="quest-bot-data.json"');
        res.send(JSON.stringify(users, null, 2));
      } catch (error) {
        res.status(500).json({ error: 'Error exportando datos' });
      }
    });
  }

  private async getGeneralStats() {
    const users = await this.db.getRanking(1000);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      totalUsers: users.length,
      activeToday: users.filter(user => new Date(user.lastActive) >= today).length,
      totalDecisions: users.reduce((sum, user) => sum + (JSON.parse(user.stats || '{}').decisionsTotal || 0), 0),
      averageLevel: Math.round(users.reduce((sum, user) => sum + user.level, 0) / users.length) || 1,
      topPlayers: users.slice(0, 10)
    };
  }

  getRouter(): express.Router {
    return this.router;
  }
}
