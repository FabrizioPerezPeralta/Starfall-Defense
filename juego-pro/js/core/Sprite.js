/* ============================================================
   Sprite.js — Capa: core
   Extiende Entity para añadir representación visual con imagen.
   Si la imagen no existe o falla, dibuja un rectángulo de color:
   el juego NUNCA se rompe por un asset faltante.
   ============================================================ */

class Sprite extends Entity {
    constructor(x, y, width, height, imageSrc = null, fallbackColor = "#ffffff") {
        super(x, y, width, height);
        this.color = fallbackColor;
        this.rotation = 0;
        this.alpha = 1;

        this.image = null;
        this.imageLoaded = false;

        if (imageSrc) {
            this.image = new Image();
            this.image.onload = () => { this.imageLoaded = true; };
            this.image.onerror = () => { this.imageLoaded = false; };
            this.image.src = imageSrc;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(this.rotation);

        if (this.imageLoaded && this.image) {
            ctx.drawImage(
                this.image,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
            );
        } else {
            /* Respaldo visual: rectángulo con borde */
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

            ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }

        ctx.restore();
    }
}
