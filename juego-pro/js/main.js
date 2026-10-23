/* ============================================================
   main.js — Orquestador del juego: Starfall Defense
   Une todas las capas: motor, jugador con aditamentos, enemigos,
   superpastillas de curación/poderes, HUD y ciclo de juego.
   ============================================================ */

(() => {
    "use strict";

    /* ---------- 1. Infraestructura ---------- */
    const canvas = document.getElementById("game-canvas");
    const engine = new Engine(canvas);
    const input = new Input(canvas);

    engine.input = input;

    /* ---------- 2. Estado del juego ---------- */
    const particles = [];
    const floatingTexts = [];

    const game = {
        score: 0,
        best: 0,
        wave: 0,
        mode: "playing", // playing | wavebreak | gameover
        waveBreakTimer: 0,
        spawnQueue: [],
        pillSpawnTimer: 18,
        banner: null,
        time: 0,
        totalKills: 0,
    };

    /* Migración / Carga de récord */
    try {
        game.best = Number(
            localStorage.getItem("starfall_defense_best") ||
            localStorage.getItem("fortnite_new_best") ||
            0
        ) || 0;
    } catch (error) {
        game.best = 0;
    }

    /* ============================================================
       3. Textos flotantes y Sistema de partículas
       ============================================================ */

    function addFloatingText(text, x, y, color = "#ffffff", size = 15) {
        floatingTexts.push({
            text,
            x,
            y,
            vy: -42,
            color,
            size,
            life: 1.3,
            maxLife: 1.3,
        });
    }

    function updateFloatingTexts(dt) {
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.life -= dt;
            if (ft.life <= 0) {
                floatingTexts.splice(i, 1);
            }
        }
    }

    function drawFloatingTexts(ctx) {
        for (const ft of floatingTexts) {
            const alpha = Math.max(0, ft.life / ft.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${ft.size}px "Segoe UI", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            /* Sombra de texto */
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);

            /* Texto coloreado con brillo */
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 10;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    function burst(x, y, color, count, speed, size) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = speed * (0.25 + Math.random() * 0.75);

            particles.push({
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 0.25 + Math.random() * 0.45,
                maxLife: 0.7,
                size: size * (0.5 + Math.random()),
                color,
            });
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const drag = Math.pow(0.02, dt);

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= drag;
            p.vy *= drag;
            p.life -= dt;

            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function drawParticles(ctx) {
        for (const p of particles) {
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    /* ============================================================
       4. Aparición de Superpastillas
       ============================================================ */

    function spawnSuperPill(type = null, x = null, y = null) {
        const margin = 80;
        let px = x;
        let py = y;

        if (px === null || py === null) {
            px = margin + Math.random() * (canvas.width - margin * 2);
            py = margin + Math.random() * (canvas.height - margin * 2);

            /* Evitar aparecer encima del jugador */
            const player = engine.player;
            if (player && Vector.distance(new Vector(px, py), player.center) < 180) {
                px = (px + canvas.width / 2) % (canvas.width - margin * 2) + margin;
            }
        }

        const pill = new SuperPill(px, py, type);
        engine.add(pill);

        /* Destello de teletransporte / aparición */
        burst(px, py, pill.info.color, 14, 180, 3.5);
    }

    /* ============================================================
       5. Reglas: oleadas, enemigos y mejoras de nave
       ============================================================ */

    function spawnEnemy() {
        const margin = 50;
        let x = 0;
        let y = 0;

        for (let attempt = 0; attempt < 30; attempt++) {
            const side = Math.floor(Math.random() * 4);

            if (side === 0)      { x = Math.random() * canvas.width; y = -margin; }
            else if (side === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
            else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; }
            else                 { x = -margin; y = Math.random() * canvas.height; }

            const player = engine.player;
            const farEnough = !player ||
                Vector.distance(new Vector(x, y), player.center) > 240;

            if (farEnough) break;
        }

        const health = 40 + (game.wave - 1) * 12;
        const speed = Math.min(220, 92 + (game.wave - 1) * 7 + Math.random() * 20);

        engine.add(new Enemy(x - 18, y - 18, { health, speed }));
    }

    function startWave() {
        game.wave += 1;

        const count = Math.min(4 + (game.wave - 1) * 2, 24);

        game.spawnQueue = [];
        for (let i = 0; i < count; i++) {
            game.spawnQueue.push(i * 0.38);
        }

        game.mode = "playing";

        /* --- Verificación de mejora de nave (cada 3 oleadas) --- */
        const player = engine.player;
        const targetLevel = 1 + Math.floor((game.wave - 1) / 3);

        if (player && targetLevel > player.upgradeLevel) {
            player.setUpgradeLevel(targetLevel);

            const upgradeNames = [
                "Nave Estándar",
                "Cañones Dobles y Alas Estabilizadoras",
                "Cañones Triples y Reactores de Pulso",
                "Dron Centinela Orbital y Blindaje Pesado",
                "Pentacañón Titán y Drones Gemelos",
            ];
            const name = upgradeNames[targetLevel - 1] || "Hiper-Mejora Titán";

            game.banner = {
                title: `¡NAVE MEJORADA: NIVEL ${targetLevel}!`,
                subtitle: `${name} acoplados`,
                time: 3.2,
                duration: 3.2,
            };

            /* Efecto visual de mejora */
            burst(player.centerX, player.centerY, "#38bdf8", 35, 340, 5);
            burst(player.centerX, player.centerY, "#ffd166", 25, 260, 4);
            engine.shake = 8;
            player.invulnerable = Math.max(player.invulnerable, 2.5);
            addFloatingText(`¡NIVEL ${targetLevel} DESBLOQUEADO!`, player.centerX, player.centerY - 35, "#38bdf8", 18);
        } else {
            game.banner = {
                title: `OLEADA ${game.wave}`,
                subtitle: `${count} invasores estelares detectados`,
                time: 2.2,
                duration: 2.2,
            };
        }

        /* Garantizar al menos una Superpastilla al inicio de cada oleada */
        spawnSuperPill();
    }

    function updateSpawnQueue(dt) {
        for (let i = game.spawnQueue.length - 1; i >= 0; i--) {
            game.spawnQueue[i] -= dt;

            if (game.spawnQueue[i] <= 0) {
                game.spawnQueue.splice(i, 1);
                spawnEnemy();
            }
        }
    }

    /* ============================================================
       6. Colisiones (Proyectiles vs Enemigos y Superpastillas)
       ============================================================ */

    function handleCollisions() {
        const enemies = engine.entities.filter(
            (e) => e instanceof Enemy && !e.dead
        );
        const pills = engine.entities.filter(
            (e) => e instanceof SuperPill && !e.dead
        );
        const projectiles = engine.entities.filter(
            (e) => e instanceof Projectile && !e.dead && e.owner === "player"
        );
        const player = engine.player;

        /* Proyectiles vs Enemigos */
        for (const projectile of projectiles) {
            for (const enemy of enemies) {
                if (projectile.dead || enemy.dead) continue;
                if (!projectile.intersects(enemy)) continue;

                projectile.dead = true;
                enemy.takeDamage(projectile.damage);

                burst(projectile.centerX, projectile.centerY, "#ffe066", 6, 220, 3);

                if (enemy.dead) {
                    game.score += enemy.scoreValue + game.wave * 2;
                    game.totalKills += 1;

                    burst(enemy.centerX, enemy.centerY, "#ef476f", 18, 320, 4);
                    engine.shake = Math.min(8, engine.shake + 3.5);

                    /* Probabilidad de soltar una Superpastilla al morir */
                    if (Math.random() < 0.16) {
                        spawnSuperPill(null, enemy.centerX, enemy.centerY);
                    }
                }
                break;
            }
        }

        /* Proyectiles vs Superpastillas (Destruibles para curarse u obtener poderes) */
        for (const projectile of projectiles) {
            if (projectile.dead) continue;

            for (const pill of pills) {
                if (pill.dead) continue;
                if (!projectile.intersects(pill)) continue;

                projectile.dead = true;
                pill.takeDamage(projectile.damage);

                burst(projectile.centerX, projectile.centerY, pill.info.color, 8, 200, 3.5);

                if (pill.dead) {
                    /* Destrucción de la Superpastilla y activación de recompensa */
                    burst(pill.centerX, pill.centerY, pill.info.color, 28, 300, 4.5);
                    burst(pill.centerX, pill.centerY, "#ffffff", 14, 240, 3);
                    engine.shake = Math.min(9, engine.shake + 4);

                    addFloatingText(pill.info.rewardText, pill.centerX, pill.centerY - 12, pill.info.color, 16);

                    if (player && !player.dead) {
                        switch (pill.type) {
                            case "health":
                                player.health = Math.min(player.maxHealth, player.health + 15);
                                burst(player.centerX, player.centerY, "#2ee66b", 16, 220, 3.5);
                                break;
                            case "rapidFire":
                                player.buffs.rapidFire = 8;
                                burst(player.centerX, player.centerY, "#ffd166", 18, 240, 4);
                                break;
                            case "shield":
                                player.buffs.shield = 6;
                                player.invulnerable = Math.max(player.invulnerable, 6);
                                burst(player.centerX, player.centerY, "#00f5d4", 20, 250, 4);
                                break;
                            case "multishot":
                                player.buffs.multishot = 8;
                                burst(player.centerX, player.centerY, "#e056fd", 22, 260, 4);
                                break;
                            case "nova":
                                /* Detonación masiva: daña a todos los enemigos en pantalla */
                                engine.shake = 12;
                                for (const em of enemies) {
                                    em.takeDamage(60);
                                    burst(em.centerX, em.centerY, "#ff3366", 12, 250, 3.5);
                                    if (em.dead) {
                                        game.score += em.scoreValue + game.wave * 2;
                                        game.totalKills += 1;
                                    }
                                }
                                burst(canvas.width / 2, canvas.height / 2, "#ff3366", 45, 420, 5);
                                break;
                        }
                    }
                }
                break;
            }
        }

        /* Feedback al recibir daño el jugador */
        if (player && player.hurt) {
            player.hurt = false;
            burst(player.centerX, player.centerY, "#ff5c7a", 12, 260, 3.5);
            engine.shake = Math.min(10, engine.shake + 6);
        }
    }

    /* ============================================================
       7. Actualización global del juego
       ============================================================ */

    function updateGame(dt) {
        game.time += dt;

        if (game.mode === "gameover") {
            if (input.wasPressed("KeyR")) resetGame();
            return;
        }

        if (game.banner) {
            game.banner.time -= dt;
            if (game.banner.time <= 0) game.banner = null;
        }

        /* Generador temporizado de superpastillas durante la partida */
        game.pillSpawnTimer -= dt;
        if (game.pillSpawnTimer <= 0) {
            const activePills = engine.entities.filter(
                (e) => e instanceof SuperPill && !e.dead
            ).length;

            if (activePills < 2) {
                spawnSuperPill();
            }
            game.pillSpawnTimer = 20 + Math.random() * 8;
        }

        /* --- Oleada en curso --- */
        if (game.mode === "playing") {
            updateSpawnQueue(dt);

            const enemiesAlive = engine.entities.some(
                (e) => e instanceof Enemy && !e.dead
            );

            if (!enemiesAlive && game.spawnQueue.length === 0) {
                game.mode = "wavebreak";
                game.waveBreakTimer = 2.4;

                const player = engine.player;
                if (player && !player.dead) {
                    player.health = Math.min(player.maxHealth, player.health + 15);
                }

                game.banner = {
                    title: "OLEADA SUPERADA",
                    subtitle: "+15 HP · Preparando siguiente sector",
                    time: 2.2,
                    duration: 2.2,
                };
            }
        }

        /* --- Descanso entre oleadas --- */
        else if (game.mode === "wavebreak") {
            game.waveBreakTimer -= dt;
            if (game.waveBreakTimer <= 0) startWave();
        }

        /* --- Muerte del jugador --- */
        if (engine.player && engine.player.dead && game.mode !== "gameover") {
            triggerGameOver();
        }
    }

    function triggerGameOver() {
        game.mode = "gameover";
        engine.shake = 12;

        if (game.score > game.best) {
            game.best = game.score;
            try {
                localStorage.setItem("starfall_defense_best", String(game.best));
            } catch (error) { /* almacenamiento no disponible */ }
        }

        const player = engine.player;
        if (player) {
            burst(player.centerX, player.centerY, "#4cc9f0", 35, 380, 5);
        }
    }

    function resetGame() {
        engine.clear();
        engine.paused = false;
        engine.shake = 0;
        particles.length = 0;
        floatingTexts.length = 0;

        game.score = 0;
        game.wave = 0;
        game.mode = "playing";
        game.spawnQueue = [];
        game.pillSpawnTimer = 18;
        game.waveBreakTimer = 0;
        game.banner = null;
        game.time = 0;
        game.totalKills = 0;

        const player = new Player(canvas.width / 2 - 21, canvas.height / 2 - 21);
        engine.player = player;
        engine.add(player);

        startWave();
    }

    /* ============================================================
       8. Dibujo: fondo del espacio exterior
       ============================================================ */

    function drawBackground(ctx) {
        const w = canvas.width;
        const h = canvas.height;

        /* Degradado cósmico profundo */
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, "#050716");
        gradient.addColorStop(0.5, "#0d1330");
        gradient.addColorStop(1, "#180e38");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        /* Rejilla holográfica animada */
        const grid = 52;
        const offset = (game.time * 12) % grid;

        ctx.strokeStyle = "rgba(100, 160, 255, 0.065)";
        ctx.lineWidth = 1;

        for (let x = -grid + offset; x < w + grid; x += grid) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        for (let y = -grid + offset; y < h + grid; y += grid) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        /* Nebulosas sutiles */
        const glow = ctx.createRadialGradient(
            w * 0.45, h * 0.4, 80,
            w * 0.45, h * 0.4, Math.max(w, h) * 0.7
        );
        glow.addColorStop(0, "rgba(90, 120, 255, 0.12)");
        glow.addColorStop(0.6, "rgba(180, 80, 255, 0.06)");
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);

        /* Viñeta cinematográfica */
        const vignette = ctx.createRadialGradient(
            w / 2, h / 2, Math.min(w, h) * 0.35,
            w / 2, h / 2, Math.max(w, h) * 0.72
        );
        vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
        vignette.addColorStop(1, "rgba(0, 0, 0, 0.6)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
    }

    /* ============================================================
       9. Dibujo: HUD, Poderes Activos y Pantallas
       ============================================================ */

    function roundRect(ctx, x, y, w, h, r) {
        const radius = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    function drawHUD(ctx) {
        const player = engine.player;
        const w = canvas.width;
        const h = canvas.height;
        const font = (weight, size) =>
            `${weight} ${size}px "Segoe UI", system-ui, -apple-system, sans-serif`;

        ctx.textBaseline = "middle";

        /* ----- Barra de vida ----- */
        const barX = 26;
        const barY = 26;
        const barW = 240;
        const barH = 20;

        ctx.fillStyle = "rgba(5, 8, 24, 0.72)";
        roundRect(ctx, barX - 6, barY - 6, barW + 12, barH + 12, 10);
        ctx.fill();

        ctx.strokeStyle = "rgba(122, 162, 255, 0.35)";
        ctx.lineWidth = 1;
        roundRect(ctx, barX - 6, barY - 6, barW + 12, barH + 12, 10);
        ctx.stroke();

        if (player) {
            const ratio = Math.max(0, Math.min(1, player.health / player.maxHealth));
            const low = ratio <= 0.35;

            const hpGradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            hpGradient.addColorStop(0, low ? "#ff4d4d" : "#2ee66b");
            hpGradient.addColorStop(1, low ? "#ff9b9b" : "#8bffb0");

            ctx.fillStyle = hpGradient;
            roundRect(ctx, barX, barY, Math.max(0, barW * ratio), barH, 6);
            ctx.fill();

            ctx.fillStyle = "#eaf2ff";
            ctx.font = font(700, 11.5);
            ctx.textAlign = "left";
            ctx.fillText(
                `FUSELAJE  ${Math.ceil(player.health)} / ${player.maxHealth}`,
                barX + 10,
                barY + barH / 2 + 0.5
            );

            /* Insignia de Nivel de Nave y Aditamentos */
            const badgeX = barX;
            const badgeY = barY + barH + 14;
            ctx.fillStyle = "rgba(5, 8, 24, 0.75)";
            roundRect(ctx, badgeX - 6, badgeY, 150, 24, 6);
            ctx.fill();
            ctx.strokeStyle = "#38bdf8";
            roundRect(ctx, badgeX - 6, badgeY, 150, 24, 6);
            ctx.stroke();

            ctx.fillStyle = "#38bdf8";
            ctx.font = font(800, 11);
            ctx.fillText(`NAVE NV. ${player.upgradeLevel} · ADITAMENTOS`, badgeX + 4, badgeY + 12);
        }

        /* ----- Puntuación y Récord ----- */
        ctx.fillStyle = "rgba(5, 8, 24, 0.72)";
        roundRect(ctx, w - 226, 20, 200, 54, 10);
        ctx.fill();

        ctx.strokeStyle = "rgba(122, 162, 255, 0.35)";
        roundRect(ctx, w - 226, 20, 200, 54, 10);
        ctx.stroke();

        ctx.fillStyle = "#ffe066";
        ctx.font = font(700, 10.5);
        ctx.textAlign = "left";
        ctx.fillText("PUNTOS", w - 210, 39);

        ctx.fillStyle = "#ffffff";
        ctx.font = font(800, 23);
        ctx.fillText(String(game.score).padStart(4, "0"), w - 210, 60);

        ctx.fillStyle = "#8b9dc3";
        ctx.font = font(600, 10);
        ctx.textAlign = "right";
        ctx.fillText(`RÉCORD ${game.best}`, w - 36, 60);

        /* ----- Oleada en Centro Superior ----- */
        ctx.fillStyle = "rgba(5, 8, 24, 0.72)";
        roundRect(ctx, w / 2 - 85, 20, 170, 36, 10);
        ctx.fill();

        ctx.strokeStyle = "rgba(122, 162, 255, 0.35)";
        roundRect(ctx, w / 2 - 85, 20, 170, 36, 10);
        ctx.stroke();

        ctx.fillStyle = "#b6c4ff";
        ctx.font = font(700, 13);
        ctx.textAlign = "center";
        ctx.fillText(`OLEADA ${game.wave}`, w / 2, 38);

        /* ----- Indicadores de Poderes Momentáneos Activos ----- */
        if (player) {
            const activeBuffs = [];
            if (player.buffs.rapidFire > 0) {
                activeBuffs.push({ label: "HIPER-CADENCIA", time: player.buffs.rapidFire, color: "#ffd166", icon: "⚡" });
            }
            if (player.buffs.shield > 0) {
                activeBuffs.push({ label: "ESCUDO CUÁNTICO", time: player.buffs.shield, color: "#00f5d4", icon: "🛡" });
            }
            if (player.buffs.multishot > 0) {
                activeBuffs.push({ label: "PENTA-LÁSER", time: player.buffs.multishot, color: "#e056fd", icon: "⁂" });
            }

            let buffY = 66;
            for (const b of activeBuffs) {
                const buffW = 160;
                const buffH = 22;
                const bx = w / 2 - buffW / 2;

                ctx.fillStyle = "rgba(10, 15, 36, 0.85)";
                roundRect(ctx, bx, buffY, buffW, buffH, 6);
                ctx.fill();

                ctx.strokeStyle = b.color;
                ctx.lineWidth = 1.2;
                roundRect(ctx, bx, buffY, buffW, buffH, 6);
                ctx.stroke();

                ctx.fillStyle = b.color;
                ctx.font = font(700, 10.5);
                ctx.textAlign = "center";
                ctx.fillText(`${b.icon} ${b.label}: ${b.time.toFixed(1)}s`, w / 2, buffY + buffH / 2);

                buffY += 28;
            }
        }

        /* ----- Banner Central de Anuncio ----- */
        if (game.banner) {
            const b = game.banner;
            const fadeWindow = b.duration * 0.25;
            const fade = Math.max(
                0,
                Math.min(1, (b.duration - b.time) / fadeWindow, b.time / fadeWindow)
            );

            ctx.save();
            ctx.globalAlpha = fade;
            ctx.textAlign = "center";

            ctx.fillStyle = "#ffffff";
            ctx.font = font(800, 38);
            ctx.shadowColor = "rgba(80, 180, 255, 0.9)";
            ctx.shadowBlur = 28;
            ctx.fillText(b.title, w / 2, h / 2 - 60);
            ctx.shadowBlur = 0;

            ctx.fillStyle = "#a5c2ff";
            ctx.font = font(600, 15);
            ctx.fillText(b.subtitle, w / 2, h / 2 - 20);
            ctx.restore();
        }

        /* ----- Mira Láser Personalizada ----- */
        if (game.mode !== "gameover" && !engine.paused) {
            const mx = input.mouse.x;
            const my = input.mouse.y;

            ctx.save();
            ctx.strokeStyle = "rgba(140, 210, 255, 0.95)";
            ctx.lineWidth = 1.8;

            ctx.beginPath();
            ctx.arc(mx, my, 10, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(mx - 18, my); ctx.lineTo(mx - 5, my);
            ctx.moveTo(mx + 5, my);  ctx.lineTo(mx + 18, my);
            ctx.moveTo(mx, my - 18); ctx.lineTo(mx, my - 5);
            ctx.moveTo(mx, my + 5);  ctx.lineTo(mx, my + 18);
            ctx.stroke();
            ctx.restore();
        }

        /* ----- Pausa ----- */
        if (engine.paused) {
            ctx.fillStyle = "rgba(4, 6, 18, 0.74)";
            ctx.fillRect(0, 0, w, h);

            ctx.textAlign = "center";
            ctx.fillStyle = "#ffffff";
            ctx.font = font(800, 48);
            ctx.shadowColor = "rgba(120, 160, 255, 0.8)";
            ctx.shadowBlur = 24;
            ctx.fillText("PAUSA", w / 2, h / 2 - 12);
            ctx.shadowBlur = 0;

            ctx.fillStyle = "#9fb2ff";
            ctx.font = font(600, 14);
            ctx.fillText("Pulsa P para reanudar la misión", w / 2, h / 2 + 28);
        }

        /* ----- Pantalla de Fin de Juego ----- */
        if (game.mode === "gameover") {
            ctx.fillStyle = "rgba(4, 6, 18, 0.82)";
            ctx.fillRect(0, 0, w, h);

            ctx.textAlign = "center";

            ctx.fillStyle = "#ff5c7a";
            ctx.font = font(800, 52);
            ctx.shadowColor = "rgba(255, 60, 100, 0.6)";
            ctx.shadowBlur = 32;
            ctx.fillText("NAVE DESTRUIDA", w / 2, h / 2 - 58);
            ctx.shadowBlur = 0;

            ctx.fillStyle = "#ffffff";
            ctx.font = font(700, 22);
            ctx.fillText(`Puntuación Final: ${game.score}`, w / 2, h / 2 + 6);

            ctx.fillStyle = "#9fb2ff";
            ctx.font = font(600, 14);
            ctx.fillText(
                `Oleada alcanzada: ${game.wave} · Nivel de Nave: ${player ? player.upgradeLevel : 1} · Récord: ${game.best}`,
                w / 2,
                h / 2 + 40
            );

            ctx.fillStyle = "#ffffff";
            ctx.font = font(700, 15);
            ctx.fillText("Pulsa R para reiniciar", w / 2, h / 2 + 86);
        }
    }

    /* ============================================================
       10. Conexión de hooks y arranque
       ============================================================ */

    engine.onUpdate = updateGame;
    engine.onAfterUpdate = (dt) => {
        updateParticles(dt);
        updateFloatingTexts(dt);
        handleCollisions();
    };
    engine.onRenderBackground = drawBackground;
    engine.onRenderForeground = (ctx) => {
        drawParticles(ctx);
        drawFloatingTexts(ctx);
    };
    engine.onRenderHUD = drawHUD;

    /* Pausa con la tecla P */
    window.addEventListener("keydown", (event) => {
        if (event.code === "KeyP" && game.mode !== "gameover") {
            engine.paused = !engine.paused;
        }
    });

    resetGame();
    engine.start();

    /* Hooks de depuración globales */
    window.__starfall = { engine, game, input };
    window.__fortnite = window.__starfall;
})();
