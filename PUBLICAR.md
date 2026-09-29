# Publicar en GitHub Pages desde el navegador

## 1. Crear el repositorio

En https://github.com/new crea un repositorio público llamado `tyre-packing-viewer`. Descripción sugerida: «Visualizador 3D y validador de soluciones para la práctica de carga de ruedas». Activa la creación de un README para disponer de la rama `main` y pulsa Create repository.

## 2. Activar Pages

En Settings → Pages → Build and deployment → Source selecciona GitHub Actions. No necesitas elegir una plantilla ni un dominio personalizado.

## 3. Subir los archivos

En Code → Add file → Upload files arrastra el contenido visible de esta carpeta de publicación, no la carpeta contenedora. Deben quedar `package.json`, `index.html` y `README.md` en la raíz, junto con `src` y `fixtures`. Conserva la estructura de las carpetas. Confirma con Commit changes en `main`.

No subas node_modules ni dist. Esta carpeta contiene solo los dos ejemplos básicos, sin los algoritmos y soluciones avanzadas del proyecto original.

## 4. Crear los archivos ocultos

El Finder oculta los archivos cuyo nombre empieza por punto. Para evitar omitirlos, créalos desde GitHub:

- Add file → Create new file. Nombre: `.gitignore`. Copia el contenido del archivo local `.gitignore` y confirma.
- Add file → Create new file. Nombre: `.github/workflows/deploy.yml`. Copia íntegramente el contenido del archivo local con ese nombre y confirma.

No hace falta crearlos de nuevo si ya se subieron correctamente. La configuración de Vite usa rutas relativas, por lo que puedes cambiar el nombre del repositorio sin editar esa ruta.

## 5. Comprobar la publicación

En Actions abre «Publicar visualizador en GitHub Pages». Espera a que termine en verde. Settings → Pages mostrará el enlace publicado, normalmente https://TU-USUARIO.github.io/tyre-packing-viewer/.

Abre ese enlace y prueba los dos ejemplos y la carga de un JSON propio. Si falla una ejecución, abre el paso rojo para ver el error. Comprueba que Pages tiene GitHub Actions como origen y que la rama se llama main. Puedes reintentar con Actions → Publicar visualizador en GitHub Pages → Run workflow.

## 6. Enlazar desde Moodle

Añade un recurso URL al curso y pega el enlace publicado. Puedes adjuntar GUIA-ALUMNOS.md o copiar su contenido a una página de Moodle. Las entregas se configuran por separado como actividad Tarea.

## Actualizaciones

Edita o sustituye los archivos en la rama main; cada cambio vuelve a ejecutar la comprobación y publicación. El enlace se conserva. Esta carpeta es una copia: los cambios posteriores en el proyecto original deben trasladarse a ella o al repositorio.

## Fuentes oficiales

- https://vite.dev/guide/static-deploy
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
