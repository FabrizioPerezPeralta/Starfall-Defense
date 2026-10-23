/* ============================================================
   Vector.js — Capa: utils
   Utilidad matemática reutilizable. No conoce el juego:
   solo sabe sumar, restar, normalizar y medir distancias.
   ============================================================ */

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    copy() {
        return new Vector(this.x, this.y);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    scale(factor) {
        this.x *= factor;
        this.y *= factor;
        return this;
    }

    magnitude() {
        return Math.hypot(this.x, this.y);
    }

    /** Devuelve la longitud al valor 1 (dirección pura). */
    normalize() {
        const m = this.magnitude();
        if (m > 0.00001) {
            this.x /= m;
            this.y /= m;
        }
        return this;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    distanceTo(v) {
        return Math.hypot(this.x - v.x, this.y - v.y);
    }

    /* ---------- Operaciones estáticas (no mutan) ---------- */

    static add(a, b) {
        return new Vector(a.x + b.x, a.y + b.y);
    }

    static sub(a, b) {
        return new Vector(a.x - b.x, a.y - b.y);
    }

    static distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    /** Vector unitario a partir de un ángulo (radianes). */
    static fromAngle(angle, length = 1) {
        return new Vector(Math.cos(angle) * length, Math.sin(angle) * length);
    }

    /** Punto aleatorio dentro de un rectángulo. */
    static random(minX, minY, maxX, maxY) {
        return new Vector(
            minX + Math.random() * (maxX - minX),
            minY + Math.random() * (maxY - minY)
        );
    }

    /** Limita la longitud de un vector sin cambiar su dirección. */
    static clampMagnitude(v, max) {
        const m = v.magnitude();
        if (m > max && m > 0.00001) {
            v.x = (v.x / m) * max;
            v.y = (v.y / m) * max;
        }
        return v;
    }
}
