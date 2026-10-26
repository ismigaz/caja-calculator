# Caja Calculator

Calculadora de efectivo en pesos colombianos, sin dependencias externas.

## Funciones

- Conteo por denominación, separado entre billetes y monedas ($1.000, $500, $200, $100 y $50).
- Subtotales de billetes y monedas y total completo.
- Borrador automático y los diez conteos guardados más recientes.
- Notas, consulta de detalles y uso de registros como base.
- Exportación e importación de respaldos JSON.
- Ayuda junto al título y acceso a «Mis conteos» debajo del subtítulo.

## Uso

Abre `index.html` en tu navegador o sirve esta carpeta con cualquier servidor estático. No requiere instalación ni compilación. `styles.css` contiene los estilos y `app.js` la lógica.

Los datos se guardan en `localStorage`, en este navegador y origen. Al mover la app desde JSFiddle a GitHub Pages, los datos anteriores no se transfieren automáticamente: exporta un respaldo desde la versión anterior e impórtalo en la nueva. Los respaldos de la versión 3 son compatibles.

Enter pasa al siguiente campo. Ctrl/Cmd + S guarda el conteo en el historial.

## GitHub Pages

Para publicarla, en **Settings → Pages** selecciona **Deploy from a branch**, rama **main**, carpeta **/ (root)**, y guarda. Los tres archivos de la app están en la raíz del repositorio.
