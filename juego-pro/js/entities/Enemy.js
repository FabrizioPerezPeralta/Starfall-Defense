/* ============================================================
   Enemy.js — Capa: entities
   IA sencilla: perseguir al jugador, separarse de sus aliados
   y dañar al contacto. No sabe nada de oleadas ni de puntajes.
   ============================================================ */

class Enemy extends Sprite {
    constructor(x, y, config = {}) {
        super(x, y, 36, 36, "assets/enemy.png", "#ef476f");

        this.speed = config.speed || 100;
        this.maxHealth = config.health || 40;
        this.health = this.maxHealth;

        this.damage = 8;
        this.scoreValue = 10;

        this.touchCooldown = 0;
        this.hitFlash = 0;
        this.wobble = Math.random() * Math.PI * 2;
        this.knockback = new Vector(0, 0);
    }

    update(dt, engine) {
        const player = engine.player;
        let vx = 0;
        let vy = 0;

        /* --- Persecución --- */
        if (player && !player.dead) {
            const dx = player.centerX - this.centerX;
            const dy = player.centerY - this.centerY;
            const distance = Math.hypot(dx, dy);

            if (distance > 0.001) {
                vx = (dx / distance) * this.speed;
                vy = (dy / distance) * this.speed;
            }
        }

        /* --- Separación entre enemigos (evita que se apilen) --- */
        for (const other of engine.entities) {
            if (other === this || !(other instanceof Enemy) || other.dead) continue;

            const ox = this.centerX - other.centerX;
            const oy = this.centerY - other.centerY;
            const d = Math.hypot(ox, oy);

            if (d > 0.001 && d < 42) {
                const force = ((42 - d) / 42) * this.speed * 1.3;
                vx += (ox / d) * force;
                vy += (oy / d) * force;
            }
        }

        this.velocity.x = vx + this.knockback.x;
        this.velocity.y = vy + this.knockback.y;

        /* El empuje se disipa con el tiempo */
        const damping = Math.pow(0.002, dt);
        this.knockback.x *= damping;
        this.knockback.y *= damping;

        super.update(dt);

        this.wobble += dt * 8;
        if (this.touchCooldown > 0) this.touchCooldown -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;

        /* --- Daño por contacto --- */
        if (player && !player.dead && this.intersects(player) && this.touchCooldown <= 0) {
            player.takeDamage(this.damage);
            player.hurt = true;
            this.touchCooldown = 0.8;

            const push = Vector.sub(this.center, player.center);
            if (push.magnitude() < 0.001) push.set(1, 0);
            push.normalize().scale(280);
            this.knockback.x = push.x;
            this.knockback.y = push.y;
        }
    }

    takeDamage(amount) {
        if (this.dead) return;

        this.health -= amount;
        this.hitFlash = 0.1;

        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }

    draw(ctx) {
        const bob = Math.sin(this.wobble) * 1.5;

        /* Sombra */
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(
            this.centerX,
            this.centerY + this.height * 0.38,
            this.width * 0.4,
            this.height * 0.16,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();

        /* Cuerpo con pequeño balanceo */
        ctx.save();
        ctx.translate(0, bob);
        super.draw(ctx);
        ctx.restore();

        /* Destello al recibir daño */
        if (this.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.85, this.hitFlash * 6);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY + bob, this.width * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /* Barra de vida */
        if (this.health < this.maxHealth && !this.dead) {
            const w = this.width * 0.9;
            const x = this.centerX - w / 2;
            const y = this.y - 10;
            const ratio = this.health / this.maxHealth;

            ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
            ctx.fillRect(x, y, w, 4);

            ctx.fillStyle = ratio > 0.5 ? "#ffd166" : "#ff6b6b";
            ctx.fillRect(x, y, w * ratio, 4);
        }
    }
}
