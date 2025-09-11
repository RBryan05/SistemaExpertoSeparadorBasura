import tensorflow as tf
import numpy as np
from keras.utils import load_img, img_to_array
from config import TAMAÑO_IMAGEN, CLASES

# Cargar modelo una sola vez
modelo = tf.keras.models.load_model("mobilenet_practica_5clases.h5")

def predecir_imagen(ruta_imagen=None, imagen_bytes=None):
    if ruta_imagen:
        imagen = load_img(ruta_imagen, target_size=TAMAÑO_IMAGEN)
    else:
        imagen = load_img(imagen_bytes, target_size=TAMAÑO_IMAGEN)

    array_imagen = img_to_array(imagen)
    array_imagen = np.expand_dims(array_imagen, axis=0) / 255.0
    prediccion = modelo.predict(array_imagen)
    id_clase = np.argmax(prediccion)
    etiqueta = CLASES[id_clase]
    confianza = prediccion[0][id_clase]
    print(f"[IA] Predicción: {etiqueta} ({confianza*100:.1f}%)")
    return etiqueta, confianza
