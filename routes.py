import os, time, requests, json, shutil
from io import BytesIO
from flask import render_template, request, jsonify
from flask_socketio import SocketIO
from config import UPLOAD_FOLDER, HISTORIAL_LIVE_FILE
from model import predecir_imagen
from historial import guardar_analisis_live
from recomendaciones import obtener_recomendacion
from sessionManager import SessionManager

socketio = SocketIO(cors_allowed_origins="*")
session_manager = SessionManager(sessions_dir="static/sessions", cleanup_hours=24)

def generar_texto_recomendaciones(resultados, session_id=None):
    mensaje = ""
    recomendaciones_individuales = []
    for idx, (etiqueta, confianza) in enumerate(resultados, start=1):
        rec = obtener_recomendacion(etiqueta, session_id)
        recomendaciones_individuales.append(rec)
        mensaje += (
            f"Imagen {idx}:<br>"
            f"Material identificado: {etiqueta}<br>"
            f"Porcentaje de confianza: {confianza*100:.1f}%<br>"
            f"💡 {rec}<br><br>"
        )
    return mensaje, recomendaciones_individuales

def register_routes(app):

    @app.route("/", methods=["GET", "POST"])
    def index():
        resultado = None
        ruta_imagen = None
        ruta_url = None

        if request.method == "POST":
            # Obtener o crear session_id
            session_id = request.form.get('session_id') or request.headers.get('X-Session-ID')
            if not session_id:
                session_id = session_manager.create_session()
            else:
                # Verificar que la sesión existe, si no, crear una nueva
                if session_manager.get_session(session_id) is None:
                    session_id = session_manager.create_session()
            
            # Actualizar actividad de la sesión
            session_manager.update_session_activity(session_id)
            
            # Obtener texto del usuario
            user_text = request.form.get('user_text', '').strip()
            
            archivos = request.files.getlist("imagen")
            urls = request.form.getlist("imagen_url")
            resultados_lista = []

            try:
                resultados_tuplas = []
                imagenes_info_user = []  # Información de imágenes para el usuario
                resultados_analisis = []  # Para guardar en la sesión con formato completo

                # Procesar archivos primero
                for i, file in enumerate(archivos):
                    if file and file.filename != "":
                        ruta_imagen = os.path.join(UPLOAD_FOLDER, file.filename)
                        file.save(ruta_imagen)
                        etiqueta, confianza = predecir_imagen(ruta_imagen=ruta_imagen)
                        resultados_tuplas.append((etiqueta, confianza))
                        
                        # Información de la imagen para el mensaje del usuario
                        imagen_info_user = {
                            "tipo": "archivo_subido",
                            "filename": file.filename,
                            "ruta": ruta_imagen,
                            "url_relativa": f"/static/uploads/{file.filename}",
                            "session_id": session_id
                        }
                        imagenes_info_user.append(imagen_info_user)
                        
                        # Obtener recomendación específica para esta sesión
                        recomendacion = obtener_recomendacion(etiqueta, session_id)
                        
                        # Agregar a resultados para guardar en sesión
                        resultados_analisis.append((imagen_info_user, etiqueta, confianza, recomendacion))

                # Procesar URLs después
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
                                ruta_archivo = os.path.join(UPLOAD_FOLDER, nombre_archivo)
                                with open(ruta_archivo, "wb") as f:
                                    f.write(response.content)
                                
                                # Información de la imagen para el mensaje del usuario
                                imagen_info_user = {
                                    "tipo": "url_externa",
                                    "url_original": url,
                                    "filename": nombre_archivo,
                                    "ruta": ruta_archivo,
                                    "url_relativa": f"/static/uploads/{nombre_archivo}",
                                    "session_id": session_id
                                }
                                imagenes_info_user.append(imagen_info_user)
                                
                                # Obtener recomendación específica para esta sesión
                                recomendacion = obtener_recomendacion(etiqueta, session_id)
                                
                                # Agregar a resultados para guardar en sesión
                                resultados_analisis.append((imagen_info_user, etiqueta, confianza, recomendacion))
                            else:
                                resultados_lista.append(f"No se pudo descargar la imagen desde {url}")
                        else:
                            # Ruta local
                            if os.path.exists(url):
                                etiqueta, confianza = predecir_imagen(ruta_imagen=url)
                                resultados_tuplas.append((etiqueta, confianza))
                                
                                # Información de la imagen para el mensaje del usuario
                                imagen_info_user = {
                                    "tipo": "ruta_local",
                                    "ruta_original": url,
                                    "filename": os.path.basename(url),
                                    "session_id": session_id
                                }
                                imagenes_info_user.append(imagen_info_user)
                                
                                # Obtener recomendación específica para esta sesión
                                recomendacion = obtener_recomendacion(etiqueta, session_id)
                                
                                # Agregar a resultados para guardar en sesión
                                resultados_analisis.append((imagen_info_user, etiqueta, confianza, recomendacion))
                            else:
                                resultados_lista.append(f"La ruta local no existe: {url}")
                    except Exception as e:
                        resultados_lista.append(f"Error al cargar {url}: {e}")

                # Generar mensaje elaborado con recomendaciones específicas para esta sesión
                if resultados_tuplas:
                    resultado, recomendaciones_individuales = generar_texto_recomendaciones(resultados_tuplas, session_id)
                    
                    # Guardar conversación completa en la sesión (NUEVO: incluye mensaje del usuario)
                    session_manager.add_conversation_to_session(
                        session_id, 
                        user_text,  # Texto del usuario
                        imagenes_info_user,  # Imágenes enviadas por el usuario
                        resultados_analisis  # Resultados del análisis con recomendaciones
                    )

                # Si es petición AJAX (Fetch)
                if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                    return jsonify({"resultado": resultado, "session_id": session_id})

            except Exception as e:
                if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                    return jsonify({"resultado": f"Error al procesar la imagen: {e}", "session_id": session_id})
                resultado = f"Error al procesar la imagen: {e}"

        return render_template("index.html", resultado=resultado, ruta_imagen=ruta_imagen, ruta_url=ruta_url)

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
            ruta_archivo = os.path.join(UPLOAD_FOLDER, nombre_archivo)

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
                    
                    # Obtener recomendación específica (sin sesión para análisis live)
                    recomendacion = obtener_recomendacion(etiqueta)
                    
                    # Guardar en historial live (global)
                    imagen_info = {
                        "tipo": "url_live",
                        "url_original": url,
                        "filename": nombre_archivo,
                        "ruta": ruta_archivo,
                        "url_relativa": f"/static/uploads/{nombre_archivo}"
                    }
                    guardar_analisis_live(imagen_info, etiqueta, confianza, recomendacion)
                    
                else:
                    socketio.emit("analisis_error", {"error": "No se pudo descargar la imagen o no es válida"})
                    return jsonify({"error": "No se pudo descargar la imagen o no es válida"}), 400
            else:
                if os.path.exists(url):
                    print(f"[ANÁLISIS] Procesando archivo local, iniciando predicción...")
                    etiqueta, confianza = predecir_imagen(ruta_imagen=url)
                    shutil.copy(url, ruta_archivo)
                    
                    # Obtener recomendación específica (sin sesión para análisis live)
                    recomendacion = obtener_recomendacion(etiqueta)
                    
                    # Guardar en historial live (global)
                    imagen_info = {
                        "tipo": "ruta_local_live",
                        "ruta_original": url,
                        "filename": nombre_archivo,
                        "ruta": ruta_archivo,
                        "url_relativa": f"/static/uploads/{nombre_archivo}"
                    }
                    guardar_analisis_live(imagen_info, etiqueta, confianza, recomendacion)
                    
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

    @app.route("/historial")
    def ver_historial():
        """Endpoint para ver el historial de análisis de una sesión específica"""
        session_id = request.args.get('session_id')
        if not session_id:
            return jsonify({"error": "Se requiere session_id"})
        
        try:
            session_data = session_manager.get_session(session_id)
            if session_data:
                return jsonify(session_data)
            else:
                return jsonify({"error": "Sesión no encontrada"})
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
        """Endpoint para ver estadísticas combinadas de sesiones y historial live"""
        try:
            # Obtener estadísticas de sesiones
            session_stats = session_manager.get_session_stats()
            
            # Estadísticas del live
            live_stats = {"total": 0, "disponible": False}
            if os.path.exists(HISTORIAL_LIVE_FILE):
                with open(HISTORIAL_LIVE_FILE, 'r', encoding='utf-8') as f:
                    historial_live = json.load(f)
                live_stats["total"] = historial_live.get("total_images_analyzed", 0)
                live_stats["disponible"] = True
            
            # Combinar estadísticas
            stats = {
                "sesiones": {
                    "sesiones_activas": session_stats["active_sessions"],
                    "total_analisis_sesiones": session_stats["total_analyses"],
                    "horas_limpieza": session_stats["cleanup_hours"]
                },
                "live": live_stats,
                "total_general": session_stats["total_analyses"] + live_stats["total"]
            }
            
            return jsonify(stats)
        except Exception as e:
            return jsonify({"error": f"Error al obtener estadísticas: {str(e)}"})

    @app.route("/live")
    def live_view():
        return render_template("live.html")