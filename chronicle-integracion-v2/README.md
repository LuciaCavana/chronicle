# Chronicle — Integración del motor de libros con Biblioteca (v2)

## Alcance
Este paquete integra el editor del motor ya subido a GitHub con la navegación existente, sin borrar las pantallas anteriores ni modificar Supabase.

- Agrega la ruta protegida `/biblioteca/libros/editor` a `src/App.tsx`.
- Agrega «Editor de libros» en **Mis propuestas** de `src/pages/Libros.tsx`.
- Corrige `src/pages/MotorLibros.tsx`: después de guardar, recupera el libro recién guardado y permite enviarlo a aprobación sin volver a abrirlo.
- Conserva el flujo anterior de propuestas, especies y conjuros. **Ambos flujos siguen coexistiendo**; todavía no se han migrado sus datos a un modelo único.

## Instalación
1. Descomprimí este ZIP en la **raíz de Chronicle**, junto a `package.json`.
2. Abrí una terminal en esa carpeta.
3. Ejecutá `python integrar.py` (o `py integrar.py` en Windows).
4. Ejecutá `npm run build` y luego `npm run dev`.
5. Ingresá a **Biblioteca → Libros → Mis propuestas → Editor de libros**.

El script valida los archivos antes de cambiarlos y crea copias `.bak-integracion`. No se conecta a Supabase ni a GitHub. Si lo ejecutás dos veces, no duplica rutas ni enlaces.

## Prueba manual
- Iniciá sesión como Lucía.
- Entrá al editor y creá un libro manual con título y un capítulo o elemento.
- Guardá el borrador y comprobá que aparece el botón **Enviar a aprobación**.
- Enviá el libro; su estado debe ser `pendiente`.
- Abrilo y comprobá las opciones **Aprobar** y **Rechazar** para administradores.
- Aprobá y comprobá `publicado`.
- Volvé al catálogo. **Todavía no se mostrará allí**: el catálogo anterior lee `libros`, no `chronicle_libros`. Esa unificación es el próximo trabajo.

## Limitaciones importantes
- No es todavía un editor especializado para clases, especies, etc. Los elementos solo tienen tipo, nombre, descripción y `datos` JSON.
- La importación PDF aún no existe.
- No se migran automáticamente propuestas antiguas.
- El botón para abrir el editor está en «Mis propuestas»; los administradores pueden entrar ahí también.
- No se han realizado pruebas de extremo a extremo con cuentas reales. Validá en entorno de pruebas antes de producción.
- `chronicle_guardar_libro` limita el contenido a 1 MB. No subas archivos grandes dentro del JSON.

## Commit sugerido
`feat: conectar editor de libros con biblioteca y corregir guardado`
