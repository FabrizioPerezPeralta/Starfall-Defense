/* ============================================================
   Input.js — Capa: engine
   Traduce eventos del navegador (teclado/ratón) a un estado
   simple que el resto del juego puede consultar.
   El juego nunca toca "window.addEventListener" directamente.
   ============================================================ */

class Input {
    constructor(canvas = null) {
        this.canvas = canvas;

        this.keys = Object.create(null);        // teclas mantenidas
        this.justPressed = Object.create(null); // pulsadas en este frame

        this.mouse = {
            x: canvas ? canvas.width / 2 : 0,
            y: canvas ? canvas.height / 2 : 0,
            down: false,
        };

        this._bindKeyboard();
        if (canvas) this._bindMouse();
    }

    _bindKeyboard() {
        const blocked = [
            "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyP",
        ];

        window.addEventListener("keydown", (event) => {
            if (!this.keys[event.code]) this.justPressed[event.code] = true;
            this.keys[event.code] = true;
            if (blocked.includes(event.code)) event.preventDefault();
        });

        window.addEventListener("keyup", (event) => {
            this.keys[event.code] = false;
        });

        /* Si la ventana pierde el foco, soltamos todo */
        window.addEventListener("blur", () => {
            this.keys = Object.create(null);
            this.mouse.down = false;
        });
    }

    _bindMouse() {
        const updatePosition = (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouse.x = (event.clientX - rect.left) * scaleX;
            this.mouse.y = (event.clientY - rect.top) * scaleY;
        };

        this.canvas.addEventListener("mousemove", updatePosition);

        this.canvas.addEventListener("mousedown", (event) => {
            updatePosition(event);
            if (event.button === 0) this.mouse.down = true;
        });

        window.addEventListener("mouseup", (event) => {
            if (event.button === 0) this.mouse.down = false;
        });

        this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    }

    isDown(code) {
        return !!this.keys[code];
    }

    wasPressed(code) {
        return !!this.justPressed[code];
    }

    /** Devuelve un vector normalizado según WASD / flechas. */
    getMoveVector() {
        const v = new Vector(0, 0);

        if (this.isDown("KeyA") || this.isDown("ArrowLeft")) v.x -= 1;
        if (this.isDown("KeyD") || this.isDown("ArrowRight")) v.x += 1;
        if (this.isDown("KeyW") || this.isDown("ArrowUp")) v.y -= 1;
        if (this.isDown("KeyS") || this.isDown("ArrowDown")) v.y += 1;

        return v.normalize();
    }

    /** Se llama al final de cada frame para limpiar las pulsaciones. */
    endFrame() {
        this.justPressed = Object.create(null);
    }
}
