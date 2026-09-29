# Visualizador de carga de ruedas

Herramienta para comprobar y visualizar soluciones de la práctica. Abre el enlace facilitado en Moodle desde un navegador con WebGL. No necesitas instalar programas ni tener una cuenta de GitHub.

## Uso

1. Abre el visualizador y prueba el ejemplo válido.
2. Arrastra tu archivo JSON a la zona de carga o selecciónalo con el selector de archivos.
3. Examina la carga en 3D: arrastra para girar la cámara y utiliza la rueda del ratón para acercarte o alejarte.
4. Revisa los errores de validación y el volumen libre. Una solución inválida no tiene una puntuación válida de volumen libre.
5. Corrige tu solución y vuelve a cargarla. Entrega el JSON y la memoria mediante la actividad que indique el profesor en Moodle.

El archivo se lee localmente en el navegador; cargarlo no constituye una entrega al profesor.

## Formato de la solución

```json
[
  {
    "coord_x": 1.234,
    "coord_y": 0.500,
    "coord_z": 0.1025,
    "type": "R3",
    "orientation": "flat"
  }
]
```

Las coordenadas indican el centro del cilindro en metros. Las orientaciones admitidas son `flat`, `parallel_to_end` y `parallel_to_side`. Consulta `problem.json` para las dimensiones del camión, los tipos de ruedas y las cantidades disponibles. Consulta el README para las reglas geométricas completas.

Las ruedas se modelan como cilindros macizos: el hueco interior no se considera espacio disponible. El objetivo es minimizar el volumen libre respetando los límites del camión, el inventario y la ausencia de solapamientos.

Los archivos `fixtures/valid.json` y `fixtures/overlap.json` sirven para probar un caso válido y otro con solapamientos.
