import random

# Diccionario con recomendaciones para cada material
RECOMENDACIONES_BASE = {
    "Vidrio": [
        "Evita romperlo y deposítalo en contenedores de vidrio para su reciclaje.",
        "Retira las tapas y etiquetas antes de depositarlo en el contenedor verde.",
        "El vidrio se puede reciclar infinitas veces sin perder calidad. ¡Cada envase cuenta!",
        "Separa el vidrio por colores si tu localidad lo requiere: transparente, verde y ámbar.",
        "Nunca mezcles cristal, espejos o bombillas con el vidrio de envases.",
        "Un solo envase de vidrio reciclado ahorra energía suficiente para encender una bombilla 4 horas.",
        "Enjuaga ligeramente el envase para eliminar restos, pero no hace falta que quede perfecto.",
        "Los envases de vidrio rotos también se reciclan, pero manipúlalos con cuidado.",
        "Deposita el vidrio en cualquier momento: los contenedores están disponibles 24/7.",
        "El reciclaje de vidrio reduce las emisiones de CO2 y conserva materias primas naturales."
    ],
    "Papel": [
        "Separa papel limpio de cartón, evita plastificados y deposítalos en contenedores de papel.",
        "Retira grapas, clips y cintas adhesivas antes del reciclaje.",
        "El papel arrugado también se recicla perfectamente, no hace falta alisarlo.",
        "Evita papel con restos de comida, grasa o sustancias químicas.",
        "Los sobres con ventanillas plásticas deben ir al contenedor amarillo, no al azul.",
        "El papel tissue, servilletas usadas y papel higiénico van al contenedor orgánico.",
        "Una tonelada de papel reciclado salva aproximadamente 17 árboles.",
        "Los recibos térmicos (brillantes) no se reciclan con papel normal.",
        "Papel de regalo plastificado o metalizado debe ir al contenedor amarillo.",
        "Revistas, periódicos y folletos van perfectamente al contenedor azul."
    ],
    "Carton": [
        "Pliega las cajas para ahorrar espacio y deposítalas en contenedores de papel/cartón.",
        "Retira cintas adhesivas, grapas y etiquetas plásticas antes del reciclaje.",
        "Los cartones de bebidas (tetrapak) van al contenedor amarillo, no al azul.",
        "Cartón sucio con restos de comida debe ir al contenedor orgánico.",
        "Rompe las cajas grandes para que ocupen menos espacio en el contenedor.",
        "El cartón ondulado es 100% reciclable y muy valorado en el proceso.",
        "Separar el cartón del papel ayuda a optimizar el proceso de reciclaje.",
        "Una caja de cartón puede reciclarse hasta 7 veces antes de perder calidad.",
        "Los cartones encerados o plastificados requieren separación especial.",
        "El reciclaje de cartón reduce el uso de agua y energía en un 50%."
    ],
    "Plastico": [
        "Separa plásticos según tipo si es posible, evita restos de comida y deposítalos en contenedores de plástico.",
        "Busca el número de reciclaje en el envase para identificar el tipo de plástico.",
        "Enjuaga los envases para eliminar restos orgánicos antes del reciclaje.",
        "Las tapas pequeñas pueden perderse, manténlas junto al envase si es posible.",
        "Evita aplastar botellas verticalmente; mejor hazlo horizontalmente.",
        "Los plásticos negros son difíciles de reciclar, prefiere otros colores.",
        "Una botella de plástico puede tardar hasta 450 años en degradarse naturalmente.",
        "Los envases de yogur y bandejas de alimentos también son reciclables.",
        "Retira etiquetas solo si se desprenden fácilmente, sino déjalas.",
        "El plástico reciclado puede convertirse en ropa, muebles y nuevos envases."
    ],
    "Latas": [
        "Enjuaga las latas vacías y deposítalas en contenedores de metal para reciclaje.",
        "No hace falta quitar las etiquetas de papel de las latas.",
        "Aplasta las latas para ahorrar espacio, pero no completamente.",
        "Las latas de aluminio se reciclan infinitas veces sin perder propiedades.",
        "Una lata de aluminio reciclada ahorra 95% de la energía necesaria para hacer una nueva.",
        "Las latas de conservas (acero) también son completamente reciclables.",
        "Retira la tapa completamente y deposítala junto con la lata.",
        "Las latas pueden volver a estar en las estanterías en solo 60 días tras el reciclaje.",
        "El reciclaje de latas de aluminio es uno de los más rentables y eficientes.",
        "Tanto latas de bebidas como de alimentos van al mismo contenedor amarillo."
    ]
}

recomendaciones_por_sesion = {}

def obtener_recomendacion(material, session_id=None):
    if material not in RECOMENDACIONES_BASE:
        return "Material no reconocido para recomendaciones específicas."

    if session_id is None:
        if material not in recomendaciones_por_sesion:
            recomendaciones_por_sesion[material] = []
        disponibles = [r for r in RECOMENDACIONES_BASE[material] if r not in recomendaciones_por_sesion[material]]
        if not disponibles:
            recomendaciones_por_sesion[material] = []
            disponibles = RECOMENDACIONES_BASE[material]
        rec = random.choice(disponibles)
        recomendaciones_por_sesion[material].append(rec)
        return rec

    if session_id not in recomendaciones_por_sesion:
        recomendaciones_por_sesion[session_id] = {}
    if material not in recomendaciones_por_sesion[session_id]:
        recomendaciones_por_sesion[session_id][material] = []

    disponibles = [r for r in RECOMENDACIONES_BASE[material] if r not in recomendaciones_por_sesion[session_id][material]]
    if not disponibles:
        recomendaciones_por_sesion[session_id][material] = []
        disponibles = RECOMENDACIONES_BASE[material]

    rec = random.choice(disponibles)
    recomendaciones_por_sesion[session_id][material].append(rec)
    return rec
