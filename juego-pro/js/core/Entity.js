/* ============================================================
   Entity.js — Capa: core
   Clase base de TODO lo que existe en el mundo del juego.
   Solo conoce posición, tamaño y colisiones. No sabe dibujar
   nada bonito ni nada de la lógica concreta del juego.
   ============================================================ */

class Entity {
    constructor(x = 0, y = 0, width = 32, height = 32) {
        this.position = new Vector(x, y);
        this.velocity = new Vector(0, 0);
        this.width = width;
        this.height = height;
        this.dead = false;
        this.color = "#ffffff";
    }

    /* Accesos cómodos a la posición */
    get x() { return this.position.x; }
    set x(value) { this.position.x = value; }

    get y() { return this.position.y; }
    set y(value) { this.position.y = value; }

    get centerX() { return this.position.x + this.width / 2; }
    get centerY() { return this.position.y + this.height / 2; }

    get center() {
        return new Vector(this.centerX, this.centerY);
    }

    /**
     * Movimiento base: posición += velocidad * tiempo.
     * dt está en segundos, así el juego va igual a 60 que a 144 FPS.
     */
    update(dt) {
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
    }

    /** Dibujo por defecto: un rectángulo. Las clases hijas lo mejoran. */
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    }

    /** Colisión por cajas (AABB). Suficiente para este juego. */
    intersects(other) {
        return (
            this.position.x < other.position.x + other.width &&
            this.position.x + this.width > other.position.x &&
            this.position.y < other.position.y + other.height &&
            this.position.y + this.height > other.position.y
        );
    }

    /** Mantiene la entidad dentro de los límites del lienzo. */
    clampTo(width, height) {
        this.position.x = Math.max(0, Math.min(width - this.width, this.position.x));
        this.position.y = Math.max(0, Math.min(height - this.height, this.position.y));
    }
}
