# Marcador de Tenis Inteligente (Smartwatch Band 5 + iPhone 13)

Aplicación web progresiva (PWA) de alto contraste diseñada para llevar el tanteador de tenis en tiempo real en tu **iPhone 13** mediante gestos táctiles desde tu reloj **Band 5**.

---

## 🎾 ¿Cómo funciona el control desde el Band 5?

Los relojes **Band 5** (Xiaomi Mi Smart Band 5 / Amazfit Band 5 / similares) no permiten instalar aplicaciones nativas de terceros en iOS. Sin embargo, se comunican con el iPhone mediante el protocolo estándar **Bluetooth AVRCP (Control de Medios)**:

1. La app web en Safari reproduce una pista de audio en bucle silencioso que activa el receptor de medios del iPhone (`navigator.mediaSession`).
2. En tu **Band 5**, deslizas hacia la pantalla de **Música**.
3. **1 toque** en el botón Central (Play/Pause) o botón Siguiente (⏭️): **Ganas el punto** (+1 para ti).
4. **2 toques rápidos** en el botón Central (Play/Pause) o botón Anterior (⏮️): **Pierdes el punto** (+1 para tu rival).
5. En la pantalla del reloj se actualiza en tiempo real el título de la canción mostrando el tanteador:  
   *Ejemplo:* `Tú 30 - 15 Rival | Juegos: 2-1 (Set 1)`.

---

## 📱 Revisión y Corrección en los Descansos

En cada descanso o cambio de lado:
- La app muestra una alerta visual y un temporizador de cambio de lado.
- Si hubo algún punto marcado por error o diferencia con tu rival:
  - Botón **↩ Deshacer último**: revierte el último punto registrado.
  - Botones **+ Pts / - Pts**: corrigen el puntaje actual del juego.
  - Botones **+ Juego / - Juego**: corrigen el tanteador de juegos.
  - Botón **⇄ Saque**: alterna quién saca si el turno no coincide.
  - Historial cronológico con todos los puntos y marcas de tiempo del partido.

---

## 🚀 Cómo ponerlo en marcha

### Opción 1: Publicar en GitHub Pages (Sin instalar Git, desde el navegador)
1. **Crear el repositorio en GitHub**:
   - Entra a [github.com](https://github.com) e inicia sesión.
   - Pulsa el botón verde **"New"** para crear un nuevo repositorio.
   - Asigna un nombre (ejemplo: `marcador-tenis`), déjalo en **Public** y pulsa **"Create repository"**.
2. **Subir los archivos**:
   - En la pantalla que aparece, haz clic en el enlace azul **"uploading an existing file"** (o en **"Add file"** > **"Upload files"**).
   - Arrastra todos los archivos de la carpeta `tenis_marcador_band5` (`index.html`, `styles.css`, `app.js`, `silent.wav`, `manifest.json`, `service-worker.js`).
   - Abajo pulsa el botón verde **"Commit changes"**.
3. **Activar GitHub Pages**:
   - En el menú superior de tu repositorio, ve a la pestaña **Settings** (Configuración).
   - En el menú lateral izquierdo, haz clic en **Pages**.
   - Bajo el apartado **"Build and deployment"** > **"Branch"**, cambia "None" por **`main`** (carpeta `/ (root)`).
   - Pulsa **Save**.
4. **Abrir en tu iPhone 13**:
   - En 1 o 2 minutos, GitHub te mostrará en esa misma página el enlace público (ej: `https://tu-usuario.github.io/marcador-tenis/`).
   - Abre ese enlace en Safari de tu iPhone, pulsa **Compartir** > **"Añadir a pantalla de inicio"** y ya lo tienes listo para la cancha.

---

### Opción 2: Con la computadora en casa o club (Red local Wi-Fi)
1. Ejecuta el archivo `iniciar.bat` en la computadora.
2. Abre Safari en el iPhone y escribe la dirección IP local mostrada (ej. `http://192.168.1.50:8080`).
3. Puedes añadirla también a la pantalla de inicio desde allí.

