-- Conocimiento inicial sugerido para el chatbot.
-- Aplicar después de supabase/chatbot_core.sql.
-- Queda activo=false hasta generar embeddings y revisar contenido.

insert into public.chatbot_knowledge_items (category, title, content, active, priority)
values
  (
    'pedidos',
    'Dos modalidades de compra',
    'Hay dos modalidades de compra: productos en stock listos para entregar y productos a medida. Los productos en stock se entregan tal como están armados y no permiten cambiar vinilo, palancas, botones ni otros componentes. Si el cliente quiere elegir componentes o vinilo, debe iniciar un pedido a medida.',
    false,
    20
  ),
  (
    'stock',
    'Entrega inmediata',
    'Los productos marcados como entrega inmediata están armados en stock y listos para entregar. En esos casos se muestra el vinilo real con el que está armado el producto.',
    false,
    18
  ),
  (
    'pedidos',
    'Reserva de pedido para cliente final',
    'Cuando un cliente final crea un pedido, los insumos se reservan por 48 horas. Si el pago no se completa dentro de ese plazo, la reserva puede vencer.',
    false,
    18
  ),
  (
    'distribuidores',
    'Revendedores y distribuidores',
    'Los revendedores y distribuidores pueden tener cuenta corriente. Deben ser creados como usuarios distribuidores o revendedores en el sistema. Los clientes finales pueden gestionarse por email.',
    false,
    15
  ),
  (
    'produccion',
    'Pedidos a medida',
    'Los pedidos a medida pasan directo a producción, sin aprobación administrativa previa. El cliente puede seleccionar componentes disponibles desde insumos.',
    false,
    16
  ),
  (
    'produccion',
    'Cliente se arrepiente de un pedido a medida',
    'Si un cliente se arrepiente de un producto a medida, se decide manualmente si queda como stock listo para entregar o si se desarma. Ambas opciones son posibles.',
    false,
    12
  ),
  (
    'vinilos',
    'Vinilo sin stock',
    'Cuando se solicita un vinilo que no está disponible en insumos, debe generarse una orden de pedido de impresión.',
    false,
    16
  ),
  (
    'pagos',
    'Tarjeta de crédito',
    'Si el pago es con tarjeta de crédito, puede sumarse un porcentaje por gastos de operador. El porcentaje se configura desde lineamientos generales del dashboard. Como referencia, en un pago ronda el 7%.',
    false,
    14
  ),
  (
    'pagos',
    'Descuentos por medio de pago',
    'Pueden configurarse descuentos según medio de pago, por ejemplo pagando en efectivo.',
    false,
    12
  ),
  (
    'envios',
    'Modalidades de entrega',
    'Hay dos modalidades de entrega: retira el cliente o se envía. Si se envía dentro de un radio menor a 50 km de la fábrica, puede coordinarse moto o flete. Para el interior del país, el envío puede realizarse por transporte o correo. El envío siempre lo abona el cliente con pago en destino.',
    false,
    18
  ),
  (
    'faq',
    'Conectar a internet o agregar juegos',
    'Pueden agregarse juegos.',
    false,
    10
  )
on conflict do nothing;
