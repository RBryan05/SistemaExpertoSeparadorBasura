from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import tensorflow as tf
import numpy as np
from keras.utils import load_img, img_to_array
import os
import requests
from io import BytesIO
import time

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "static/uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

socketio = SocketIO(app, cors_allowed_origins="*")

tamaño_imagen = (224, 224)
clases = ["Carton", "Latas", "Papel", "Plastico", "Vidrio"]
modelo = tf.keras.models.load_model("mobilenet_practica_5clases.h5")

# ------------------- FUNCIONES -------------------
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
    """
    recomendaciones = {
        "Vidrio": "Evita romperlo y deposítalo en contenedores de vidrio para su reciclaje.",
        "Papel": "Separa papel limpio de cartón, evita plastificados y deposítalos en contenedores de papel.",
        "Carton": "Pliega las cajas para ahorrar espacio y deposítalas en contenedores de papel/cartón.",
        "Plastico": "Separa plásticos según tipo si es posible, evita restos de comida y deposítalos en contenedores de plástico.",
        "Latas": "Enjuaga las latas vacías y deposítalas en contenedores de metal para reciclaje."
    }

    mensaje = ""
    for idx, (etiqueta, confianza) in enumerate(resultados, start=1):
        rec = recomendaciones.get(etiqueta, "")
        mensaje += (
            f"Imagen {idx}:<br>"
            f"Material identificado: {etiqueta}<br>"
            f"Porcentaje de confianza: {confianza*100:.1f}%<br>"
            f"{rec}<br><br>"
        )
    return mensaje

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
                            print(f"[IA] Procesando URL {j+1}: {etiqueta}")
                        else:
                            resultados_lista.append(f"No se pudo descargar la imagen desde {url}")
                    else:
                        # Ruta local
                        if os.path.exists(url):
                            etiqueta, confianza = predecir_imagen(ruta_imagen=url)
                            resultados_tuplas.append((etiqueta, confianza))
                            print(f"[IA] Procesando ruta local {j+1}: {etiqueta}")
                        else:
                            resultados_lista.append(f"La ruta local no existe: {url}")
                except Exception as e:
                    resultados_lista.append(f"Error al cargar {url}: {e}")

            # Generar mensaje elaborado
            if resultados_tuplas:
                resultado = generar_texto_recomendaciones(resultados_tuplas)

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
            else:
                socketio.emit("analisis_error", {"error": "No se pudo descargar la imagen o no es válida"})
                return jsonify({"error": "No se pudo descargar la imagen o no es válida"}), 400
        else:
            if os.path.exists(url):
                print(f"[ANÁLISIS] Procesando archivo local, iniciando predicción...")
                etiqueta, confianza = predecir_imagen(ruta_imagen=url)
                import shutil
                shutil.copy(url, ruta_archivo)
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

# ------------------- VISTA PARA ANÁLISIS EN VIVO -------------------
@app.route("/live")
def live_view():
    return render_template("live.html")

# ------------------- EJECUTAR SERVIDOR -------------------
if __name__ == "__main__":
    socketio.run(app,host="0.0.0.0", port=5000, debug=True)
