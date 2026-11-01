# Caja Calculator

Calculadora de efectivo en pesos colombianos con una interfaz basada en Material Design e iconos Lucide. Funciona sin instalación, compilación ni conexiones a servicios externos.

## Funciones

- Conteo por denominación, separado entre billetes y monedas ($1.000, $500, $200, $100 y $50).
- Subtotales de billetes y monedas y total completo.
- Borrador automático y los diez conteos guardados más recientes.
- Notas, consulta de detalles y uso de registros como base.
- Exportación e importación de respaldos JSON.
- Ayuda junto al título y acceso a «Mis conteos» debajo del subtítulo.

## Uso

Abre `index.html` en tu navegador o sirve esta carpeta con cualquier servidor estático. No requiere instalación ni compilación. `styles.css` contiene los estilos y `app.js` la lógica.

## Identidad visual

- Paleta verde con roles de color, superficies tonales, radios y estados de interacción definidos mediante variables CSS `--md-sys-*`.
- Botones principales rellenos, secundarios tonales o delineados, campos con etiqueta y foco visible.
- En móvil, total y acciones permanecen al pie de la pantalla; en escritorio se muestran en un panel lateral.
- «Mis conteos» permanece debajo del subtítulo. El historial, la ayuda y el detalle se presentan como hojas inferiores en móvil y diálogos en escritorio.
- Iconos de Lucide 1.8.0 incluidos localmente en `icons.js`. Solo se incluyen los necesarios; no se descarga una biblioteca ni una fuente al abrir la app. Licencia en `LICENSE-LUCIDE`.
- Se respeta la preferencia de movimiento reducido. Los iconos decorativos se ocultan a los lectores de pantalla y las acciones conservan etiquetas accesibles.

La interfaz usa HTML, CSS y JavaScript nativos, inspirados en Material Design; no requiere Angular Material ni otro framework.

Los datos se guardan en `localStorage`, en este navegador y origen. Al mover la app desde JSFiddle a GitHub Pages, los datos anteriores no se transfieren automáticamente: exporta un respaldo desde la versión anterior e impórtalo en la nueva. Los respaldos de la versión 3 son compatibles.

La actualización visual mantiene la clave `caja-calculator-v3`, el formato de los respaldos y la recuperación de datos de la versión 2. No requiere migrar ni borrar los conteos existentes.

Enter pasa al siguiente campo. Ctrl/Cmd + S guarda el conteo en el historial.

## GitHub Pages

Para publicarla, en **Settings → Pages** selecciona **Deploy from a branch**, rama **main**, carpeta **/ (root)**, y guarda. Los tres archivos de la app están en la raíz del repositorio.
