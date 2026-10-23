/* ============================================================
   Player.js — Capa: entities
   El jugador: nave estelar con movimiento, apuntado, disparo, vida
   y sistema dinámico de aditamentos/mejoras cada 3 oleadas.
   ============================================================ */

class Player extends Sprite {
    constructor(x, y) {
        super(x, y, 42, 42, "assets/player.png", "#4cc9f0");

        this.baseSpeed = 285;
        this.speed = this.baseSpeed;
        this.maxHealth = 100;
        this.health = 100;

        this.angle = -Math.PI / 2;
        this.baseFireRate = 0.14;
        this.fireRate = this.baseFireRate;
        this.fireCooldown = 0;

        this.invulnerable = 0;
        this.hitFlash = 0;
        this.recoil = 0;
        this.hurt = false;

        /* Sistema de mejoras por aditamentos (cada 3 oleadas) */
        this.upgradeLevel = 1;

        /* Drones centinelas orbitales (Nivel 4+) */
        this.droneAngle = 0;
        this.droneCooldown = 0;

        /* Poderes momentáneos de superpastillas */
        this.buffs = {
            rapidFire: 0,
            shield: 0,
            multishot: 0,
            speed: 0,
        };

        this.animTimer = 0;
    }

    setUpgradeLevel(level) {
        this.upgradeLevel = Math.max(1, level);

        /* Ajuste de estadísticas base según el nivel de aditamentos */
        switch (this.upgradeLevel) {
            case 1:
                this.baseSpeed = 285;
                this.baseFireRate = 0.14;
                break;
            case 2: // Oleada 3+: Cañones dobles y alas estabilizadoras
                this.baseSpeed = 300;
                this.baseFireRate = 0.13;
                break;
            case 3: // Oleada 6+: Cañones triples y reactores auxiliares
                this.baseSpeed = 315;
                this.baseFireRate = 0.11;
                break;
            case 4: // Oleada 9+: Dron centinela y 4 cañones
                this.baseSpeed = 330;
                this.baseFireRate = 0.098;
                break;
            case 5: // Oleada 12+: Drones gemelos y cañón hiperlumínico
            default:
                this.baseSpeed = 345;
                this.baseFireRate = 0.082;
                break;
        }

        this.speed = this.baseSpeed;
        this.fireRate = this.baseFireRate;
    }

    update(dt, engine) {
        const input = engine.input;
        this.animTimer += dt;

        /* --- Actualización de poderes momentáneos --- */
        if (this.buffs.rapidFire > 0) this.buffs.rapidFire -= dt;
        if (this.buffs.multishot > 0) this.buffs.multishot -= dt;
        if (this.buffs.speed > 0) this.buffs.speed -= dt;
        if (this.buffs.shield > 0) {
            this.buffs.shield -= dt;
            this.invulnerable = Math.max(this.invulnerable, 0.2);
        }

        /* --- Velocidad con modificadores --- */
        let currentSpeed = this.baseSpeed;
        if (this.buffs.speed > 0) currentSpeed *= 1.4;
        this.speed = currentSpeed;

        /* --- Cadencia con modificadores --- */
        let currentFireRate = this.baseFireRate;
        if (this.buffs.rapidFire > 0) currentFireRate *= 0.45; // Más del doble de velocidad
        this.fireRate = currentFireRate;

        /* --- Movimiento --- */
        const move = input.getMoveVector();
        this.velocity.x = move.x * this.speed;
        this.velocity.y = move.y * this.speed;

        super.update(dt);
        this.clampTo(engine.canvas.width, engine.canvas.height);

        /* --- Apuntado hacia el ratón --- */
        this.angle = Math.atan2(
            input.mouse.y - this.centerY,
            input.mouse.x - this.centerX
        );

        /* --- Temporizadores --- */
        if (this.fireCooldown > 0) this.fireCooldown -= dt;
        if (this.invulnerable > 0) this.invulnerable -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 60);

        /* --- Disparo del jugador --- */
        const wantsToShoot = input.mouse.down || input.isDown("Space");
        if (wantsToShoot && this.fireCooldown <= 0) {
            this.shoot(engine);
            this.fireCooldown = this.fireRate;
        }

        /* --- Drones centinelas orbitales (Nivel 4+) --- */
        if (this.upgradeLevel >= 4) {
            this.updateDrones(dt, engine);
        }
    }

    updateDrones(dt, engine) {
        this.droneAngle += dt * 3.2;
        this.droneCooldown -= dt;

        if (this.droneCooldown <= 0) {
            /* Buscar el enemigo vivo más cercano */
            let nearestEnemy = null;
            let minDist = 320;

            for (const entity of engine.entities) {
                if (entity instanceof Enemy && !entity.dead) {
                    const dist = Vector.distance(this.center, entity.center);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestEnemy = entity;
                    }
                }
            }

            if (nearestEnemy) {
                const droneCount = this.upgradeLevel >= 5 ? 2 : 1;
                for (let i = 0; i < droneCount; i++) {
                    const dAngle = this.droneAngle + (i * Math.PI);
                    const droneX = this.centerX + Math.cos(dAngle) * 52;
                    const droneY = this.centerY + Math.sin(dAngle) * 52;

                    const shootAngle = Math.atan2(
                        nearestEnemy.centerY - droneY,
                        nearestEnemy.centerX - droneX
                    );

                    const p = new Projectile(
                        droneX,
                        droneY,
                        shootAngle,
                        860,
                        18,
                        "player"
                    );
                    p.color = "#00f5d4"; // Láser cian de apoyo
                    engine.add(p);
                }

                this.droneCooldown = this.upgradeLevel >= 5 ? 0.32 : 0.46;
            }
        }
    }

    shoot(engine) {
        const cx = this.centerX;
        const cy = this.centerY;
        const baseAngle = this.angle;
        const speed = 820;
        const dmg = 25 + (this.upgradeLevel - 1) * 3;

        const forward = Vector.fromAngle(baseAngle, 28);
        const perp = new Vector(-Math.sin(baseAngle), Math.cos(baseAngle));

        /* Caso A: Buff de Disparo Penta-Láser activo */
        if (this.buffs.multishot > 0) {
            const spreadAngles = [-0.34, -0.17, 0, 0.17, 0.34];
            for (const a of spreadAngles) {
                const proj = new Projectile(cx + forward.x, cy + forward.y, baseAngle + a, speed * 1.1, dmg * 1.1, "player");
                proj.color = "#e056fd";
                engine.add(proj);
            }
        }
        /* Caso B: Nivel 1 (Cañón central básico) */
        else if (this.upgradeLevel === 1) {
            const p = new Projectile(cx + forward.x, cy + forward.y, baseAngle, speed, dmg, "player");
            engine.add(p);
        }
        /* Caso C: Nivel 2 (Doble cañón paralelo en alas) */
        else if (this.upgradeLevel === 2) {
            const offset = 9;
            const p1 = new Projectile(cx + forward.x + perp.x * offset, cy + forward.y + perp.y * offset, baseAngle, speed, dmg, "player");
            const p2 = new Projectile(cx + forward.x - perp.x * offset, cy + forward.y - perp.y * offset, baseAngle, speed, dmg, "player");
            p1.color = "#70d6ff";
            p2.color = "#70d6ff";
            engine.add(p1);
            engine.add(p2);
        }
        /* Caso D: Nivel 3 (Cañón triple en abanico) */
        else if (this.upgradeLevel === 3) {
            const p1 = new Projectile(cx + forward.x, cy + forward.y, baseAngle, speed, dmg, "player");
            const p2 = new Projectile(cx + forward.x + perp.x * 10, cy + forward.y + perp.y * 10, baseAngle + 0.18, speed, dmg * 0.9, "player");
            const p3 = new Projectile(cx + forward.x - perp.x * 10, cy + forward.y - perp.y * 10, baseAngle - 0.18, speed, dmg * 0.9, "player");
            p1.color = "#ffd166";
            p2.color = "#06d6a0";
            p3.color = "#06d6a0";
            engine.add(p1);
            engine.add(p2);
            engine.add(p3);
        }
        /* Caso E: Nivel 4 (Cuádruple cañón) */
        else if (this.upgradeLevel === 4) {
            const p1 = new Projectile(cx + forward.x + perp.x * 6, cy + forward.y + perp.y * 6, baseAngle, speed, dmg, "player");
            const p2 = new Projectile(cx + forward.x - perp.x * 6, cy + forward.y - perp.y * 6, baseAngle, speed, dmg, "player");
            const p3 = new Projectile(cx + forward.x + perp.x * 16, cy + forward.y + perp.y * 16, baseAngle + 0.22, speed, dmg * 0.85, "player");
            const p4 = new Projectile(cx + forward.x - perp.x * 16, cy + forward.y - perp.y * 16, baseAngle - 0.22, speed, dmg * 0.85, "player");
            p1.color = "#4cc9f0";
            p2.color = "#4cc9f0";
            p3.color = "#b5179e";
            p4.color = "#b5179e";
            engine.add(p1);
            engine.add(p2);
            engine.add(p3);
            engine.add(p4);
        }
        /* Caso F: Nivel 5+ (Pentacañón Titán Hiperlumínico) */
        else {
            const spread = [-0.3, -0.15, 0, 0.15, 0.3];
            for (let i = 0; i < spread.length; i++) {
                const off = (i - 2) * 6;
                const p = new Projectile(
                    cx + forward.x + perp.x * off,
                    cy + forward.y + perp.y * off,
                    baseAngle + spread[i],
                    speed * 1.15,
                    dmg,
                    "player"
                );
                p.color = i === 2 ? "#ffffff" : "#48cae4";
                engine.add(p);
            }
        }

        this.recoil = 6 + Math.min(3, this.upgradeLevel);
        engine.shake = Math.min(5, engine.shake + 1.2);
    }

    takeDamage(amount) {
        if (this.invulnerable > 0 || this.dead) return;

        this.health -= amount;
        this.invulnerable = 0.5;
        this.hitFlash = 0.22;

        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }

    draw(ctx) {
        const cx = this.centerX;
        const cy = this.centerY;
        const isMoving = this.velocity.x !== 0 || this.velocity.y !== 0;

        /* Sombra proyectada */
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + this.height * 0.42, this.width * 0.46, this.height * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        /* --- FUEGO DE PROPULSORES ESTELARES (Detrás del cuerpo) --- */
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.angle);

        const flameFlicker = Math.sin(this.animTimer * 28) * 3;
        const flameLen = (isMoving ? 22 : 12) + flameFlicker;
        const thrusterY = this.upgradeLevel >= 2 ? 10 : 0;

        /* Propulsor central */
        ctx.fillStyle = "rgba(76, 201, 240, 0.85)";
        ctx.shadowColor = "#4cc9f0";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-16, -4);
        ctx.lineTo(-16 - flameLen, 0);
        ctx.lineTo(-16, 4);
        ctx.closePath();
        ctx.fill();

        /* Propulsores laterales gemelos (Nivel >= 3) */
        if (this.upgradeLevel >= 3) {
            ctx.fillStyle = "rgba(255, 209, 102, 0.9)";
            ctx.shadowColor = "#ffd166";
            ctx.beginPath();
            ctx.moveTo(-13, -thrusterY - 3);
            ctx.lineTo(-13 - flameLen * 0.8, -thrusterY);
            ctx.lineTo(-13, -thrusterY + 3);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-13, thrusterY - 3);
            ctx.lineTo(-13 - flameLen * 0.8, thrusterY);
            ctx.lineTo(-13, thrusterY + 3);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        /* --- ADITAMENTO 1: ALAS CIBERNÉTICAS (Nivel >= 2) --- */
        if (this.upgradeLevel >= 2) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.angle);

            /* Alas afiladas con alerones de energía */
            ctx.fillStyle = "#1e293b";
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1.8;

            /* Ala izquierda */
            ctx.beginPath();
            ctx.moveTo(-8, -12);
            ctx.lineTo(8, -26);
            ctx.lineTo(-14, -28);
            ctx.lineTo(-16, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            /* Ala derecha */
            ctx.beginPath();
            ctx.moveTo(-8, 12);
            ctx.lineTo(8, 26);
            ctx.lineTo(-14, 28);
            ctx.lineTo(-16, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            /* Cañones montados en las alas */
            ctx.fillStyle = "#64748b";
            ctx.fillRect(4 - this.recoil * 0.5, -24, 18, 4.5);
            ctx.fillRect(4 - this.recoil * 0.5, 19.5, 18, 4.5);

            /* Luces de navegación en la punta de las alas */
            ctx.fillStyle = "#38bdf8";
            ctx.shadowColor = "#38bdf8";
            ctx.shadowBlur = 8;
            ctx.fillRect(6, -26, 4, 3);
            ctx.fillRect(6, 23, 4, 3);

            ctx.restore();
        }

        /* --- ADITAMENTO 2: BLINDAJE ANGULAR Y REACTORES (Nivel >= 3) --- */
        if (this.upgradeLevel >= 3) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.angle);

            /* Placas frontales de titanio */
            ctx.fillStyle = "#334155";
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.moveTo(10, -14);
            ctx.lineTo(20, -18);
            ctx.lineTo(16, -8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(10, 14);
            ctx.lineTo(20, 18);
            ctx.lineTo(16, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            /* Disipadores térmicos dorados */
            ctx.fillStyle = "#fbbf24";
            ctx.fillRect(-6, -17, 8, 2.5);
            ctx.fillRect(-6, 14.5, 8, 2.5);

            ctx.restore();
        }

        /* Cuerpo principal de la nave */
        super.draw(ctx);

        /* --- CAÑONES PRINCIPALES FRONTALES CON RETROCESO --- */
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.angle);

        /* Si el buff de hiper-cadencia está activo, cañones al rojo vivo */
        const isFurious = this.buffs.rapidFire > 0;
        ctx.fillStyle = isFurious ? "#ffedd5" : "#cbd5e1";
        ctx.shadowColor = isFurious ? "#f97316" : "rgba(100, 150, 255, 0.4)";
        ctx.shadowBlur = isFurious ? 16 : 4;

        /* Cañón central */
        ctx.fillRect(12 - this.recoil, -4.5, 26, 9);
        ctx.fillStyle = isFurious ? "#ea580c" : "#64748b";
        ctx.fillRect(12 - this.recoil, -4.5, 9, 9);

        /* Cañones dobles pesados si Nivel >= 4 */
        if (this.upgradeLevel >= 4) {
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect(10 - this.recoil, -12, 22, 5);
            ctx.fillRect(10 - this.recoil, 7, 22, 5);
        }

        /* Núcleo de reactor central pulsante */
        const pulse = Math.sin(this.animTimer * 6) * 0.2 + 0.8;
        ctx.fillStyle = this.upgradeLevel >= 5 ? "#e056fd" : "#38bdf8";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10 * pulse;
        ctx.beginPath();
        ctx.arc(-2, 0, 4.5 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        /* --- ADITAMENTO 3: DRONES CENTINELAS ORBITALES (Nivel >= 4) --- */
        if (this.upgradeLevel >= 4) {
            const droneCount = this.upgradeLevel >= 5 ? 2 : 1;
            for (let i = 0; i < droneCount; i++) {
                const dAngle = this.droneAngle + (i * Math.PI);
                const dx = cx + Math.cos(dAngle) * 52;
                const dy = cy + Math.sin(dAngle) * 52;

                ctx.save();
                /* Línea de enlace de energía con la nave */
                ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 4]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(dx, dy);
                ctx.stroke();
                ctx.setLineDash([]);

                /* Cuerpo del micro-dron (Rombo cibernético) */
                ctx.translate(dx, dy);
                ctx.rotate(dAngle + Math.PI / 2);

                ctx.fillStyle = "#0f172a";
                ctx.strokeStyle = "#00f5d4";
                ctx.lineWidth = 1.8;
                ctx.shadowColor = "#00f5d4";
                ctx.shadowBlur = 10;

                ctx.beginPath();
                ctx.moveTo(0, -9);
                ctx.lineTo(7, 0);
                ctx.lineTo(0, 9);
                ctx.lineTo(-7, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                /* Ojo sensor del dron */
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        /* --- ADITAMENTO 4: ANILLO CUÁNTICO TITÁN (Nivel >= 5) --- */
        if (this.upgradeLevel >= 5) {
            ctx.save();
            ctx.strokeStyle = "rgba(224, 86, 253, 0.4)";
            ctx.lineWidth = 1.6;
            ctx.setLineDash([6, 8]);
            ctx.beginPath();
            ctx.arc(cx, cy, 38, 0, Math.PI * 2);
            ctx.stroke();

            /* Nodos del anillo */
            for (let k = 0; k < 4; k++) {
                const nodeAngle = this.animTimer * 1.5 + (k * Math.PI / 2);
                const nx = cx + Math.cos(nodeAngle) * 38;
                const ny = cy + Math.sin(nodeAngle) * 38;
                ctx.fillStyle = "#e056fd";
                ctx.shadowColor = "#e056fd";
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(nx, ny, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        /* --- Destello al recibir daño --- */
        if (this.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.85, this.hitFlash * 3);
            ctx.fillStyle = "#ff4d5e";
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.58, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /* --- ESCUDO DE ENERGÍA (Por daño o por Superpastilla) --- */
        if ((this.invulnerable > 0 || this.buffs.shield > 0) && !this.dead) {
            ctx.save();
            const isPowerShield = this.buffs.shield > 0;
            const shieldAlpha = isPowerShield ? 0.9 : Math.min(0.8, this.invulnerable * 1.6);
            const shieldColor = isPowerShield ? "#00f5d4" : "#7fdcff";

            ctx.globalAlpha = shieldAlpha;
            ctx.strokeStyle = shieldColor;
            ctx.lineWidth = isPowerShield ? 3.5 : 2;
            ctx.shadowColor = shieldColor;
            ctx.shadowBlur = isPowerShield ? 20 : 8;

            /* Esfera exterior */
            ctx.beginPath();
            ctx.arc(cx, cy, this.width * 0.76, 0, Math.PI * 2);
            ctx.stroke();

            /* Hexágonos de campo de fuerza si es escudo de superpastilla */
            if (isPowerShield) {
                const rot = this.animTimer * 2;
                for (let h = 0; h < 6; h++) {
                    const ha = rot + (h * Math.PI / 3);
                    const hx = cx + Math.cos(ha) * (this.width * 0.76);
                    const hy = cy + Math.sin(ha) * (this.width * 0.76);
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath();
                    ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
    }
}
