# Carga de conocimiento

El bot solo puede responder usando conocimiento aprobado.

## Buen formato

Cada ítem debería tener:

- categoría clara
- título concreto
- contenido específico
- una sola idea principal cuando sea posible

Ejemplo:

```text
Categoría: envíos
Título: Envíos al interior del país
Contenido: Hacemos envíos al interior por transporte o correo. El costo se abona en destino y queda a cargo del cliente.
```

## Evitar

- “Consultar”
- “Depende”
- información vieja
- precios sin fecha o criterio
- promociones vencidas

Si algo depende de decisión manual, escribirlo así:

```text
Para casos especiales se deriva a atención humana.
```

## Embeddings

Cuando se crea o edita conocimiento, hay que regenerar el embedding antes de activarlo para respuestas reales.
