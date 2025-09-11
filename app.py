from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import tensorflow as tf
import numpy as np
from keras.utils import load_img, img_to_array
import os
import requests
from io import BytesIO
import time
import json
from datetime import datetime
import random

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "static/uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

socketio = SocketIO(app, cors_allowed_origins="*")

tamaño_imagen = (224, 224)
clases = ["Carton", "Latas", "Papel", "Plastico", "Vidrio"]
modelo = tf.keras.models.load_model("mobilenet_practica_5clases.h5")

# ------------------- FUNCIONES DE HISTORIAL -------------------
HISTORIAL_FILE = "historial_analisis.json"
HISTORIAL_LIVE_FILE = "historial_analisis_live.json"

def inicializar_historial():
    """Inicializa un archivo de historial vacío al iniciar la aplicación"""
    historial_data = {
        "session_start": datetime.now().isoformat(),
        "total_images_analyzed": 0,
        "analyses": []
    }
    with open(HISTORIAL_FILE, 'w', encoding='utf-8') as f:
        json.dump(historial_data, f, indent=2, ensure_ascii=False)
    print(f"[HISTORIAL] Archivo {HISTORIAL_FILE} inicializado")

def inicializar_historial_live():
    """Inicializa el archivo de historial live si no existe (solo la primera vez)"""
    if not os.path.exists(HISTORIAL_LIVE_FILE):
        historial_data = {
            "created": datetime.now().isoformat(),
            "description": "Historial persistente de análisis en vivo - nunca se borra",
            "total_images_analyzed": 0,
            "analyses": []
        }
        with open(HISTORIAL_LIVE_FILE, 'w', encoding='utf-8') as f:
            json.dump(historial_data, f, indent=2, ensure_ascii=False)
        print(f"[HISTORIAL LIVE] Archivo {HISTORIAL_LIVE_FILE} creado por primera vez")
    else:
        print(f"[HISTORIAL LIVE] Archivo {HISTORIAL_LIVE_FILE} ya existe, manteniéndolo")

def guardar_analisis(imagen_info, etiqueta, confianza, recomendacion, origen="chat"):
    """
    Guarda un análisis en el historial correspondiente
    imagen_info: dict con información de la imagen (url, filename, etc.)
    etiqueta: resultado de la clasificación
    confianza: nivel de confianza (0-1)
    recomendacion: recomendación específica dada para este análisis
    origen: 'chat' o 'live'
    """
    try:
        # Determinar qué archivo usar según el origen
        if origen == "live":
            archivo_historial = HISTORIAL_LIVE_FILE
            inicializar_historial_live()  # Asegurar que existe
        else:
            archivo_historial = HISTORIAL_FILE
        
        # Leer historial actual
        if os.path.exists(archivo_historial):
            with open(archivo_historial, 'r', encoding='utf-8') as f:
                historial = json.load(f)
        else:
            if origen == "chat":
                inicializar_historial()
                with open(archivo_historial, 'r', encoding='utf-8') as f:
                    historial = json.load(f)
            else:
                inicializar_historial_live()
                with open(archivo_historial, 'r', encoding='utf-8') as f:
                    historial = json.load(f)
        
        # Crear registro del análisis
        analisis = {
            "timestamp": datetime.now().isoformat(),
            "origen": origen,
            "imagen": imagen_info,
            "resultado": {
                "etiqueta": etiqueta,
                "confianza": float(confianza),
                "confianza_porcentaje": f"{confianza*100:.1f}%"
            },
            "recomendacion": recomendacion
        }
        
        # Agregar al historial
        historial["analyses"].append(analisis)
        historial["total_images_analyzed"] += 1
        
        # Guardar historial actualizado
        with open(archivo_historial, 'w', encoding='utf-8') as f:
            json.dump(historial, f, indent=2, ensure_ascii=False)
        
        tipo_historial = "LIVE" if origen == "live" else "CHAT"
        print(f"[HISTORIAL {tipo_historial}] Guardado análisis: {etiqueta} ({confianza*100:.1f}%) - {recomendacion[:50]}...")
        
    except Exception as e:
        print(f"[ERROR HISTORIAL] Error al guardar análisis: {e}")

# ------------------- SISTEMA DE RECOMENDACIONES ROTATIVAS -------------------

# Base de 10 recomendaciones por cada material
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

# Diccionario para rastrear qué recomendaciones se han usado por material
recomendaciones_usadas = {material: [] for material in RECOMENDACIONES_BASE.keys()}

def obtener_recomendacion(material):
    """
    Obtiene una recomendación no repetida para un material específico.
    Cuando se agotan todas las recomendaciones, reinicia el ciclo.
    """
    if material not in RECOMENDACIONES_BASE:
        return "Material no reconocido para recomendaciones específicas."
    
    disponibles = [rec for rec in RECOMENDACIONES_BASE[material] 
                  if rec not in recomendaciones_usadas[material]]
    
    # Si no hay disponibles, reiniciar el ciclo
    if not disponibles:
        recomendaciones_usadas[material] = []
        disponibles = RECOMENDACIONES_BASE[material]
    
    # Seleccionar una recomendación aleatoria de las disponibles
    recomendacion_elegida = random.choice(disponibles)
    recomendaciones_usadas[material].append(recomendacion_elegida)
    
    return recomendacion_elegida

# ------------------- FUNCIONES EXISTENTES -------------------
def predecir_imagen(ruta_imagen=None, imagen_bytes=None):
    if ruta_imagen:
        imagen = load_img(ruta_imagen, target_size=tamaño_imagen)
    else:
        imagen = load_img(imagen_bytes, target_size=tamaño_imagen)

    array_imagen = img_to_array(imagen)
    array_imagen = np.expand_dims(array_imagen, axis=0) / 255.0
    prediccion = modelo.predict(array_imagen)
    id_clase = np.argmax(prediccion)
    etiqueta = clases[id_clase]
    confianza = prediccion[0][id_clase]

    print(f"[IA] Predicción: {etiqueta} ({confianza*100:.1f}%)")
    return etiqueta, confianza

def generar_texto_recomendaciones(resultados):
    """
    resultados: lista de tuplas (etiqueta, confianza)
    Devuelve un string HTML con recomendaciones para cada imagen, con saltos de línea mínimos.
    También devuelve las recomendaciones individuales para guardar en historial.
    """
    mensaje = ""
    recomendaciones_individuales = []
    
    for idx, (etiqueta, confianza) in enumerate(resultados, start=1):
        rec = obtener_recomendacion(etiqueta)
        recomendaciones_individuales.append(rec)
        mensaje += (
            f"Imagen {idx}:<br>"
            f"Material identificado: {etiqueta}<br>"
            f"Porcentaje de confianza: {confianza*100:.1f}%<br>"
            f"💡 {rec}<br><br>"
        )
    return mensaje, recomendaciones_individuales

# ------------------- ENDPOINT NORMAL PARA WEB -------------------
@app.route("/", methods=["GET", "POST"])
def index():
    resultado = None
    ruta_imagen = None
    ruta_url = None

    if request.method == "POST":
        archivos = request.files.getlist("imagen")
        urls = request.form.getlist("imagen_url")
        resultados_lista = []

        try:
            resultados_tuplas = []
            imagenes_info = []  # Para guardar información de cada imagen procesada

            # Obtener el orden correcto: primero archivos, luego URLs
            # Esto asegura que el orden coincida con el frontend
            total_imagenes = len(archivos) + len(urls)
            
            # Procesar archivos primero (índices 0 a len(archivos)-1)
            for i, file in enumerate(archivos):
                if file and file.filename != "":
                    ruta_imagen = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
                    file.save(ruta_imagen)
                    etiqueta, confianza = predecir_imagen(ruta_imagen=ruta_imagen)
                    resultados_tuplas.append((etiqueta, confianza))
                    
                    # Guardar info de la imagen para el historial
                    imagen_info = {
                        "tipo": "archivo_subido",
                        "filename": file.filename,
                        "ruta": ruta_imagen,
                        "url_relativa": f"/static/uploads/{file.filename}"
                    }
                    imagenes_info.append((imagen_info, etiqueta, confianza))
                    
                    print(f"[IA] Procesando archivo {i+1}: {etiqueta}")

            # Procesar URLs después (índices len(archivos) a total_imagenes-1)
            for j, url in enumerate(urls):
                url = url.strip()
                if not url:
                    continue
                try:
                    if url.startswith("http://") or url.startswith("https://"):
                        headers = {"User-Agent": "Mozilla/5.0"}
                        response = requests.get(url, headers=headers, timeout=10)
                        if response.status_code == 200 and "image" in response.headers.get("Content-Type", ""):
                            imagen_bytes = BytesIO(response.content)
                            etiqueta, confianza = predecir_imagen(imagen_bytes=imagen_bytes)
                            resultados_tuplas.append((etiqueta, confianza))
                            # Guardar imagen
                            timestamp = int(time.time() * 1000)
                            nombre_archivo = f"imagen_{timestamp}.jpg"
                            ruta_archivo = os.path.join(app.config["UPLOAD_FOLDER"], nombre_archivo)
                            with open(ruta_archivo, "wb") as f:
                                f.write(response.content)
                            
                            # Guardar info de la imagen para el historial
                            imagen_info = {
                                "tipo": "url_externa",
                                "url_original": url,
                                "filename": nombre_archivo,
                                "ruta": ruta_archivo,
                                "url_relativa": f"/static/uploads/{nombre_archivo}"
                            }
                            imagenes_info.append((imagen_info, etiqueta, confianza))
                            
                            print(f"[IA] Procesando URL {j+1}: {etiqueta}")
                        else:
                            resultados_lista.append(f"No se pudo descargar la imagen desde {url}")
                    else:
                        # Ruta local
                        if os.path.exists(url):
                            etiqueta, confianza = predecir_imagen(ruta_imagen=url)
                            resultados_tuplas.append((etiqueta, confianza))
                            
                            # Guardar info de la imagen para el historial
                            imagen_info = {
                                "tipo": "ruta_local",
                                "ruta_original": url,
                                "filename": os.path.basename(url)
                            }
                            imagenes_info.append((imagen_info, etiqueta, confianza))
                            
                            print(f"[IA] Procesando ruta local {j+1}: {etiqueta}")
                        else:
                            resultados_lista.append(f"La ruta local no existe: {url}")
                except Exception as e:
                    resultados_lista.append(f"Error al cargar {url}: {e}")

            # Generar mensaje elaborado con recomendaciones
            if resultados_tuplas:
                resultado, recomendaciones_individuales = generar_texto_recomendaciones(resultados_tuplas)
                
                # Guardar en historial cada imagen con su recomendación específica
                for i, ((imagen_info, etiqueta, confianza), recomendacion) in enumerate(zip(imagenes_info, recomendaciones_individuales)):
                    guardar_analisis(imagen_info, etiqueta, confianza, recomendacion, "chat")

            # Si es petición AJAX (Fetch)
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({"resultado": resultado})

        except Exception as e:
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({"resultado": f"Error al procesar la imagen: {e}"})
            resultado = f"Error al procesar la imagen: {e}"

    return render_template("index.html", resultado=resultado, ruta_imagen=ruta_imagen, ruta_url=ruta_url)

# ------------------- ENDPOINT PARA ANALIZAR URL O RUTA LOCAL EN VIVO -------------------
@app.route("/analizar_url", methods=["GET"])
def analizar_url():
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"error": "No se proporcionó URL o ruta"}), 400
    
    try:
        # EMITIR EVENTO DE INICIO DE ANÁLISIS ANTES DE CUALQUIER PROCESAMIENTO
        print(f"[ANÁLISIS] Emitiendo evento inicio_analisis")
        socketio.emit("inicio_analisis")
        socketio.sleep(0)  # Forzar que se procese el evento inmediatamente
        
        print(f"[ANÁLISIS] Iniciando descarga de imagen: {url}")
        
        timestamp = int(time.time() * 1000)
        nombre_archivo = f"imagen_{timestamp}.jpg"
        ruta_archivo = os.path.join(app.config["UPLOAD_FOLDER"], nombre_archivo)

        if url.startswith("http://") or url.startswith("https://"):
            headers = {"User-Agent": "Mozilla/5.0"}
            print(f"[ANÁLISIS] Descargando imagen desde URL...")
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200 and "image" in response.headers.get("Content-Type", ""):
                imagen_bytes = BytesIO(response.content)
                print(f"[ANÁLISIS] Imagen descargada, iniciando predicción...")
                etiqueta, confianza = predecir_imagen(imagen_bytes=imagen_bytes)
                with open(ruta_archivo, "wb") as f:
                    f.write(response.content)
                
                # Obtener recomendación específica
                recomendacion = obtener_recomendacion(etiqueta)
                
                # Guardar en historial
                imagen_info = {
                    "tipo": "url_live",
                    "url_original": url,
                    "filename": nombre_archivo,
                    "ruta": ruta_archivo,
                    "url_relativa": f"/static/uploads/{nombre_archivo}"
                }
                guardar_analisis(imagen_info, etiqueta, confianza, recomendacion, "live")
                
            else:
                socketio.emit("analisis_error", {"error": "No se pudo descargar la imagen o no es válida"})
                return jsonify({"error": "No se pudo descargar la imagen o no es válida"}), 400
        else:
            if os.path.exists(url):
                print(f"[ANÁLISIS] Procesando archivo local, iniciando predicción...")
                etiqueta, confianza = predecir_imagen(ruta_imagen=url)
                import shutil
                shutil.copy(url, ruta_archivo)
                
                # Obtener recomendación específica
                recomendacion = obtener_recomendacion(etiqueta)
                
                # Guardar en historial
                imagen_info = {
                    "tipo": "ruta_local_live",
                    "ruta_original": url,
                    "filename": nombre_archivo,
                    "ruta": ruta_archivo,
                    "url_relativa": f"/static/uploads/{nombre_archivo}"
                }
                guardar_analisis(imagen_info, etiqueta, confianza, recomendacion, "live")
                
            else:
                socketio.emit("analisis_error", {"error": "La ruta local no existe"})
                return jsonify({"error": "La ruta local no existe"}), 400

        print(f"[IA LIVE] {url} -> {etiqueta} ({confianza*100:.1f}%)")
        url_para_live = f"/static/uploads/{nombre_archivo}"
        
        # EMITIR EVENTO CON EL RESULTADO
        print(f"[ANÁLISIS] Emitiendo resultado del análisis")
        socketio.emit("nueva_imagen", {"url": url_para_live, "etiqueta": etiqueta, "confianza": float(confianza)})
        
        return jsonify({"etiqueta": etiqueta, "confianza": float(confianza), "inicio_analisis": True})
    except Exception as e:
        print(f"[ERROR] Error en análisis: {e}")
        socketio.emit("analisis_error", {"error": str(e)})
        return jsonify({"error": str(e)}), 500

# ------------------- ENDPOINTS PARA HISTORIAL -------------------
@app.route("/historial")
def ver_historial():
    """Endpoint para ver el historial de análisis del chat en formato JSON"""
    try:
        if os.path.exists(HISTORIAL_FILE):
            with open(HISTORIAL_FILE, 'r', encoding='utf-8') as f:
                historial = json.load(f)
            return jsonify(historial)
        else:
            return jsonify({"error": "No hay historial disponible"})
    except Exception as e:
        return jsonify({"error": f"Error al leer historial: {str(e)}"})

@app.route("/historial_live")
def ver_historial_live():
    """Endpoint para ver el historial persistente de análisis en vivo en formato JSON"""
    try:
        if os.path.exists(HISTORIAL_LIVE_FILE):
            with open(HISTORIAL_LIVE_FILE, 'r', encoding='utf-8') as f:
                historial = json.load(f)
            return jsonify(historial)
        else:
            return jsonify({"error": "No hay historial live disponible"})
    except Exception as e:
        return jsonify({"error": f"Error al leer historial live: {str(e)}"})

@app.route("/estadisticas_historial")
def ver_estadisticas():
    """Endpoint para ver estadísticas combinadas de ambos historiales"""
    try:
        stats = {
            "chat": {"total": 0, "disponible": False},
            "live": {"total": 0, "disponible": False},
            "total_general": 0
        }
        
        # Estadísticas del chat
        if os.path.exists(HISTORIAL_FILE):
            with open(HISTORIAL_FILE, 'r', encoding='utf-8') as f:
                historial_chat = json.load(f)
            stats["chat"]["total"] = historial_chat.get("total_images_analyzed", 0)
            stats["chat"]["disponible"] = True
        
        # Estadísticas del live
        if os.path.exists(HISTORIAL_LIVE_FILE):
            with open(HISTORIAL_LIVE_FILE, 'r', encoding='utf-8') as f:
                historial_live = json.load(f)
            stats["live"]["total"] = historial_live.get("total_images_analyzed", 0)
            stats["live"]["disponible"] = True
        
        stats["total_general"] = stats["chat"]["total"] + stats["live"]["total"]
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": f"Error al obtener estadísticas: {str(e)}"})

# ------------------- ENDPOINT PARA REINICIAR HISTORIAL -------------------
@app.route("/reiniciar_historial", methods=["POST"])
def reiniciar_historial():
    """Reinicia el historial de análisis del CHAT - útil para nuevas sesiones de chat
    NOTA: NO afecta el historial live que es persistente"""
    try:
        inicializar_historial()  # Solo reinicia el historial del chat
        print("[HISTORIAL] Historial de CHAT reiniciado por solicitud del usuario")
        print("[HISTORIAL LIVE] El historial live se mantiene intacto (persistente)")
        return jsonify({"success": True, "message": "Historial de chat reiniciado correctamente"})
    except Exception as e:
        print(f"[ERROR] Error al reiniciar historial: {e}")
        return jsonify({"success": False, "error": str(e)})

# ------------------- VISTA PARA ANÁLISIS EN VIVO -------------------
@app.route("/live")
def live_view():
    return render_template("live.html")

# ------------------- EJECUTAR SERVIDOR -------------------
if __name__ == "__main__":
    # Inicializar historial del chat al arrancar la aplicación (se borra cada vez)
    inicializar_historial()
    # Inicializar historial live si no existe (persistente, solo se crea una vez)
    inicializar_historial_live()
    socketio.run(app,host="0.0.0.0", port=5000, debug=True)