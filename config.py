import os

UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

TAMAÑO_IMAGEN = (224, 224)
CLASES = ["Carton", "Latas", "Papel", "Plastico", "Vidrio"]

HISTORIAL_LIVE_FILE = "historial_analisis_live.json"
