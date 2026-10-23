/* ============================================================
   Engine.js — Capa: engine
   Dueño del Game Loop. No conoce al jugador ni a los enemigos:
   solo mantiene una lista de entidades y las actualiza/dibuja.
   ============================================================ */

class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.entities = [];

        /* Referencias que main.js asigna explícitamente */
        this.input = null;
        this.player = null;

        /* Estado del bucle */
        this.running = false;
        this.paused = false;
        this.lastTime = 0;
        this.dt = 0;
        this.elapsed = 0;
        this.shake = 0;

        /* Ganchos (hooks): el motor no sabe qué se dibuja */
        this.onUpdate = null;
        this.onAfterUpdate = null;
        this.onRenderBackground = null;
        this.onRenderForeground = null;
        this.onRenderHUD = null;

        this._loop = this.loop.bind(this);
    }

    add(entity) {
        this.entities.push(entity);
        return entity;
    }

    addAll(list) {
        for (const entity of list) this.add(entity);
    }

    clear() {
        this.entities.length = 0;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this._loop);
    }

    stop() {
        this.running = false;
    }

    /** Corazón del juego: se ejecuta ~60 veces por segundo. */
    loop(now) {
        if (!this.running) return;

        let dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        /* Protecciones: pestañas minimizadas o saltos de tiempo */
        if (!Number.isFinite(dt) || dt < 0) dt = 0;
        if (dt > 0.05) dt = 0.05;

        this.dt = dt;

        if (!this.paused) {
            this.elapsed += dt;

            /* 1. Lógica global (oleadas, HUD, etc.) */
            if (this.onUpdate) this.onUpdate(dt);

            /* 2. Actualizar entidades */
            for (const entity of this.entities) {
                if (!entity.dead) entity.update(dt, this);
            }

            /* 3. Eliminar entidades muertas */
            this.entities = this.entities.filter((entity) => !entity.dead);

            /* 4. Colisiones y efectos (después de mover) */
            if (this.onAfterUpdate) this.onAfterUpdate(dt);
        }

        /* 5. Dibujar */
        this.render();

        /* 6. Limpiar entradas de un solo frame */
        if (this.input) this.input.endFrame();

        requestAnimationFrame(this._loop);
    }

    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);

        /* Fondo oscuro base (evita huecos al hacer screen shake) */
        ctx.fillStyle = "#05060d";
        ctx.fillRect(0, 0, width, height);

        ctx.save();

        /* Sacudida de pantalla */
        if (this.shake > 0.2) {
            ctx.translate(
                (Math.random() - 0.5) * this.shake,
                (Math.random() - 0.5) * this.shake
            );
        }
        this.shake *= 0.88;
        if (this.shake < 0.2) this.shake = 0;

        /* Capas de dibujo */
        if (this.onRenderBackground) this.onRenderBackground(ctx);

        /* Orden por Y para una falsa profundidad (2.5D) */
        const sorted = this.entities.slice().sort((a, b) => a.y - b.y);
        for (const entity of sorted) entity.draw(ctx);

        if (this.onRenderForeground) this.onRenderForeground(ctx);

        ctx.restore();

        /* HUD fijo: no se mueve con la sacudida */
        if (this.onRenderHUD) this.onRenderHUD(ctx);
    }
}
