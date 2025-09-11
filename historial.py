import os, json
from datetime import datetime
from config import HISTORIAL_LIVE_FILE

def inicializar_historial_live():
    if not os.path.exists(HISTORIAL_LIVE_FILE):
        historial_data = {
            "created": datetime.now().isoformat(),
            "description": "Historial persistente de análisis en vivo - nunca se borra",
            "total_images_analyzed": 0,
            "analyses": []
        }
        with open(HISTORIAL_LIVE_FILE, "w", encoding="utf-8") as f:
            json.dump(historial_data, f, indent=2, ensure_ascii=False)
        print(f"[HISTORIAL LIVE] Archivo {HISTORIAL_LIVE_FILE} creado")
    else:
        print(f"[HISTORIAL LIVE] Archivo {HISTORIAL_LIVE_FILE} ya existe")

def guardar_analisis_live(imagen_info, etiqueta, confianza, recomendacion):
    try:
        inicializar_historial_live()
        with open(HISTORIAL_LIVE_FILE, "r", encoding="utf-8") as f:
            historial = json.load(f)

        analisis = {
            "timestamp": datetime.now().isoformat(),
            "origen": "live",
            "imagen": imagen_info,
            "resultado": {
                "etiqueta": etiqueta,
                "confianza": float(confianza),
                "confianza_porcentaje": f"{confianza*100:.1f}%"
            },
            "recomendacion": recomendacion
        }

        historial["analyses"].append(analisis)
        historial["total_images_analyzed"] += 1

        with open(HISTORIAL_LIVE_FILE, "w", encoding="utf-8") as f:
            json.dump(historial, f, indent=2, ensure_ascii=False)

        print(f"[HISTORIAL LIVE] Guardado análisis: {etiqueta} ({confianza*100:.1f}%)")
    except Exception as e:
        print(f"[ERROR HISTORIAL LIVE] {e}")
