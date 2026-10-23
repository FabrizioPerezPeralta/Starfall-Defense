# Starfall Defense — Space Battle Royale 2D

Juego espacial de acción y supervivencia con vista cenital, escrito en **JavaScript puro**
(sin librerías ni frameworks) y organizado con una **arquitectura por capas**.

---

## Cómo jugar

### Opción 1 — Doble clic (lo más rápido)
Abre `index.html` con tu navegador. No necesita servidor ni instalación.

### Opción 2 — Servidor local
Haz doble clic en `iniciar.bat`. Se abrirá el navegador en `http://localhost:8123`.

También puedes hacerlo a mano desde la carpeta del proyecto:

```bash
python -m http.server 8123
```

y visitar `http://localhost:8123`.

### Controles

| Acción | Tecla |
|---|---|
| Moverte | `W` `A` `S` `D` o flechas |
| Apuntar | Ratón |
| Disparar | Clic izquierdo o `ESPACIO` (mantener) |
| Pausa | `P` |
| Reiniciar (al morir) | `R` |

---

## Mecánicas especiales

### 1. Mejoras de nave y aditamentos cada 3 oleadas
A medida que avanzas en los sectores, tu nave recibe nuevos aditamentos tecnológicos visibles y mejoras de armamento:

* **Nivel 1 (Oleadas 1-2)**: Nave base con cañón central de plasma.
* **Nivel 2 (Oleadas 3-5)**: **Alas estabilizadoras cibernéticas** y **doble cañón paralelo**, mayor velocidad de crucero.
* **Nivel 3 (Oleadas 6-8)**: **Reactores auxiliares de pulso** y **cañones triples en abanico** con disipadores térmicos dorados.
* **Nivel 4 (Oleadas 9-11)**: **Dron centinela orbital autónomo** (busca y dispara a los enemigos cercanos) y **cañones cuádruples**.
* **Nivel 5 (Oleadas 12+)**: **Anillo cuántico perimetral**, **drones centinelas gemelos** y **pentacañón hiperlumínico**.

### 2. Superpastillas destruibles (Cura +15 HP y Poderes Momentáneos)
En la arena flotan cápsulas energéticas que puedes **disparar para destruir** y reclamar su recompensa:

* 🟢 **Botiquín Estelar**: Repara inmediatamente **+15 de HP** del fuselaje.
* 🟡 **Hiper-Cadencia (8s)**: Triplica la cadencia de disparo con cañones al rojo vivo.
* 🔵 **Escudo Cuántico (6s)**: Campo de fuerza hexagonal de invulnerabilidad absoluta.
* 🟣 **Ráfaga Penta-Láser (8s)**: Disparo simultáneo en 5 direcciones de alta energía.
* 🔴 **Onda Nova**: Detona una onda expansiva que destruye a todos los invasores en pantalla.

---

## Arquitectura por capas

```
main.js  (orquestador: reglas del juego, mejoras, superpastillas y HUD)
   │
   ├── engine/   → loop de juego desacoplado y captura de entradas
   ├── entities/ → objetos concretos (Player, Enemy, Projectile, SuperPill)
   ├── core/     → clases base con colisiones AABB y fallback de sprites
   └── utils/    → matemáticas vectoriales puras
```

### Capa `entities` (objetos concretos)
| Archivo | Responsabilidad |
|---|---|
| `Player.js` | Nave espacial con aditamentos dinámicos, drones centinelas, estados alterados y cálculo de armas. |
| `Enemy.js` | IA de enjambre: persecución, separación para evitar solapamientos y daño al contacto. |
| `Projectile.js` | Láseres con dirección, daño, propietario y tiempo de vida. |
| `SuperPill.js` | Cápsulas destruibles flotantes con barra de vida, colores temáticos y entrega de poderes/cura. |

---

## Depuración

El juego expone sus componentes en la consola del navegador (`F12`):

```js
__starfall.engine      // motor, entidades, hooks
__starfall.game        // puntaje, oleada, modo
__starfall.input       // teclas y ratón
```

Ejemplos:

```js
__starfall.game.score = 9999;
__starfall.engine.player.health = 100;
__starfall.engine.player.setUpgradeLevel(5); // Activar todos los aditamentos
```

---

## Notas técnicas

- **Sin dependencias**: solo HTML5 Canvas, CSS y JavaScript nativo.
- **Resolución lógica**: 960 × 600, escalada dinámicamente con CSS.
- **Delta Time (dt)**: Velocidades y físicas independientes de la tasa de refresco (60 Hz / 144 Hz).
