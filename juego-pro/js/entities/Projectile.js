/* ============================================================
   Projectile.js — Capa: entities
   Bala/objeto que viaja en línea recta, con vida limitada.
   ============================================================ */

class Projectile extends Entity {
    constructor(x, y, angle, speed, damage, owner = "player") {
        super(x - 4, y - 4, 8, 8);

        this.velocity = Vector.fromAngle(angle, speed);
        this.damage = damage;
        this.owner = owner;
        this.life = 1.2;
        this.color = owner === "enemy" ? "#ff6b8a" : "#ffe066";
    }

    update(dt, engine) {
        super.update(dt);

        this.life -= dt;
        if (this.life <= 0) this.dead = true;

        const w = engine.canvas.width;
        const h = engine.canvas.height;
        if (this.x < -30 || this.y < -30 || this.x > w + 30 || this.y > h + 30) {
            this.dead = true;
        }
    }

    draw(ctx) {
        const cx = this.centerX;
        const cy = this.centerY;

        /* Estela */
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - this.velocity.x * 0.022, cy - this.velocity.y * 0.022);
        ctx.stroke();
        ctx.restore();

        /* Núcleo brillante */
        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
