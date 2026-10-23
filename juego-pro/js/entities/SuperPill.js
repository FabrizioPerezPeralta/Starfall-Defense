/* ============================================================
   SuperPill.js — Capa: entities
   Superpastillas destruibles en la arena. Al dispararles y romperlas,
   curan 15 HP al jugador u otorgan poderes momentáneos (Hiper-cadencia,
   Escudo de energía, Ráfaga penta-láser u Onda Nova).
   ============================================================ */

class SuperPill extends Entity {
    constructor(x, y, type = null) {
        super(x - 17, y - 11, 34, 22);

        /* Si no se especifica tipo, elegir según probabilidades */
        const types = [
            { type: "health", weight: 38 },     // Cura 15 HP
            { type: "rapidFire", weight: 22 },  // Hiper cadencia 8s
            { type: "shield", weight: 18 },     // Escudo invulnerable 6s
            { type: "multishot", weight: 12 },  // Disparo penta-láser 8s
            { type: "nova", weight: 10 },       // Onda expansiva en toda la pantalla
        ];

        if (!type) {
            const roll = Math.random() * 100;
            let sum = 0;
            for (const t of types) {
                sum += t.weight;
                if (roll <= sum) {
                    type = t.type;
                    break;
                }
            }
        }
        this.type = type || "health";

        this.health = 30;
        this.maxHealth = 30;
        this.lifeTime = 42; // Segundos antes de disiparse si no se destruye
        this.hitFlash = 0;
        this.wobble = Math.random() * Math.PI * 2;
        this.driftAngle = Math.random() * Math.PI * 2;
        this.driftSpeed = 12 + Math.random() * 14;

        /* Configuración visual según el tipo de superpastilla */
        this.info = this.getConfig(this.type);
    }

    getConfig(type) {
        switch (type) {
            case "health":
                return {
                    name: "Botiquín Estelar",
                    rewardText: "+15 HP REPARADO",
                    color: "#2ee66b",
                    glowColor: "rgba(46, 230, 107, 0.65)",
                    icon: "+",
                    bannerTitle: "¡CURACIÓN ESTELAR!",
                    bannerSub: "+15 HP restaurados al fuselaje"
                };
            case "rapidFire":
                return {
                    name: "Hiper-Cadencia",
                    rewardText: "¡HIPER-CADENCIA (8s)!",
                    color: "#ffd166",
                    glowColor: "rgba(255, 209, 102, 0.75)",
                    icon: "⚡",
                    bannerTitle: "¡FURIA ESTELAR!",
                    bannerSub: "Cadencia de disparo triplicada por 8s"
                };
            case "shield":
                return {
                    name: "Escudo Cuántico",
                    rewardText: "¡ESCUDO INVULNERABLE (6s)!",
                    color: "#00f5d4",
                    glowColor: "rgba(0, 245, 212, 0.75)",
                    icon: "🛡",
                    bannerTitle: "¡CAMPO DE FUERZA!",
                    bannerSub: "Invulnerabilidad absoluta por 6s"
                };
            case "multishot":
                return {
                    name: "Ráfaga Penta-Láser",
                    rewardText: "¡PENTA-LÁSER (8s)!",
                    color: "#e056fd",
                    glowColor: "rgba(224, 86, 253, 0.75)",
                    icon: "⁂",
                    bannerTitle: "¡PENTA-DISPARO!",
                    bannerSub: "5 proyectiles simultáneos por 8s"
                };
            case "nova":
                return {
                    name: "Onda Nova",
                    rewardText: "¡ONDA NOVA EXPANSIVA!",
                    color: "#ff3366",
                    glowColor: "rgba(255, 51, 102, 0.8)",
                    icon: "💥",
                    bannerTitle: "¡DETONACIÓN NOVA!",
                    bannerSub: "Onda expansiva barriendo la arena"
                };
            default:
                return {
                    name: "Cápsula",
                    rewardText: "+15 HP",
                    color: "#2ee66b",
                    glowColor: "rgba(46, 230, 107, 0.65)",
                    icon: "+",
                    bannerTitle: "¡CÁPSULA RECOGIDA!",
                    bannerSub: "+15 HP"
                };
        }
    }

    update(dt, engine) {
        this.wobble += dt * 3.5;
        this.lifeTime -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;

        if (this.lifeTime <= 0) {
            this.dead = true;
            return;
        }

        /* Movimiento de flotación suave y suave deriva */
        this.driftAngle += Math.sin(this.wobble * 0.5) * dt * 0.8;
        this.velocity.x = Math.cos(this.driftAngle) * this.driftSpeed;
        this.velocity.y = Math.sin(this.driftAngle) * this.driftSpeed + Math.sin(this.wobble) * 8;

        super.update(dt);

        /* Mantenerla dentro de la pantalla suavemente */
        const margin = 50;
        const w = engine.canvas.width;
        const h = engine.canvas.height;

        if (this.x < margin) {
            this.x = margin;
            this.driftAngle = Math.PI - this.driftAngle;
        } else if (this.x + this.width > w - margin) {
            this.x = w - margin - this.width;
            this.driftAngle = Math.PI - this.driftAngle;
        }

        if (this.y < margin) {
            this.y = margin;
            this.driftAngle = -this.driftAngle;
        } else if (this.y + this.height > h - margin) {
            this.y = h - margin - this.height;
            this.driftAngle = -this.driftAngle;
        }
    }

    takeDamage(amount) {
        if (this.dead) return;
        this.health -= amount;
        this.hitFlash = 0.15;

        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }

    draw(ctx) {
        const cx = this.centerX;
        const cy = this.centerY;
        const w = this.width;
        const h = this.height;
        const r = h / 2;

        /* Efecto de parpadeo suave cuando le quedan menos de 6 segundos */
        if (this.lifeTime < 6) {
            const blink = Math.floor(this.lifeTime * 6) % 2 === 0;
            if (blink) return;
        }

        ctx.save();
        ctx.translate(cx, cy);

        /* Ligera oscilación e inclinación orgánica */
        const tilt = Math.sin(this.wobble) * 0.14;
        ctx.rotate(tilt);

        /* Sombra proyectada */
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.beginPath();
        ctx.ellipse(0, h * 0.75, w * 0.55, h * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        /* Halo resplandeciente exterior */
        ctx.save();
        ctx.shadowColor = this.info.glowColor;
        ctx.shadowBlur = 18 + Math.sin(this.wobble * 2) * 6;

        /* Dibujar cuerpo de la pastilla (cápsula redondeada) */
        const x0 = -w / 2;
        const y0 = -h / 2;

        /* Mitad izquierda (Color del poder) */
        ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.info.color;
        ctx.beginPath();
        ctx.moveTo(x0 + r, y0);
        ctx.lineTo(0, y0);
        ctx.lineTo(0, y0 + h);
        ctx.lineTo(x0 + r, y0 + h);
        ctx.arc(x0 + r, 0, r, Math.PI / 2, (Math.PI * 3) / 2);
        ctx.closePath();
        ctx.fill();

        /* Mitad derecha (Blanco cibernético perla) */
        ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : "#f1f5f9";
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(x0 + w - r, y0);
        ctx.arc(x0 + w - r, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(0, y0 + h);
        ctx.closePath();
        ctx.fill();

        /* Anillo / banda central dorada / plateada con bisel */
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-2, y0 - 1, 4, h + 2);

        /* Brillo especular superior para aspecto 3D vítreo */
        ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
        ctx.beginPath();
        ctx.ellipse(0, y0 + 3.5, w * 0.38, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        /* Borde exterior fino de alta definición */
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(x0, y0, w, h, r);
        ctx.stroke();

        ctx.restore();

        /* Icono representativo en el centro */
        ctx.save();
        ctx.font = `bold 12px "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#000000";
        ctx.shadowBlur = 4;
        ctx.fillText(this.info.icon, 0, 0.5);
        ctx.restore();

        /* Anillo orbital de partículas de energía girando alrededor de la pastilla */
        const orbAngle = this.wobble * 2;
        const orbDist = w * 0.65;
        const ox = Math.cos(orbAngle) * orbDist;
        const oy = Math.sin(orbAngle) * (h * 0.7);

        ctx.fillStyle = this.info.color;
        ctx.shadowColor = this.info.glowColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        /* Barra de vida mini si ha recibido daño */
        if (this.health < this.maxHealth) {
            const barW = 28;
            const barH = 3.5;
            const barX = cx - barW / 2;
            const barY = cy - h / 2 - 9;
            const ratio = Math.max(0, this.health / this.maxHealth);

            ctx.save();
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

            ctx.fillStyle = this.info.color;
            ctx.fillRect(barX, barY, barW * ratio, barH);
            ctx.restore();
        }
    }
}
