import os
import json
from mutagen.easyid3 import EasyID3  # Para leer metadata de mp3

# Carpetas donde están los archivos
music_folder = "music"
images_folder = "images"

# Lista final que vamos a guardar en JSON
songs_list = []

# Recorrer todos los archivos de música
for music_file in os.listdir(music_folder):
    if music_file.lower().endswith(".mp3"):
        music_path = f"/{music_folder}/{music_file}"

        # Intentar leer metadata (title y artist)
        try:
            audio = EasyID3(os.path.join(music_folder, music_file))
            title = audio.get("title", [os.path.splitext(music_file)[0]])[0]
            artist = audio.get("artist", ["Unknown Artist"])[0]
        except Exception as e:
            # Si no tiene metadata, usar nombre del archivo
            title = os.path.splitext(music_file)[0]
            artist = "Unknown Artist"

        # Buscar imagen con nombre similar al mp3
        base_name = os.path.splitext(music_file)[0]
        image_path = f"/{images_folder}/{base_name}.jpg"  # Primero jpg
        if not os.path.exists(os.path.join(images_folder, f"{base_name}.jpg")):
            image_path = f"/{images_folder}/{base_name}.png"  # Si no, png
            if not os.path.exists(os.path.join(images_folder, f"{base_name}.png")):
                image_path = ""  # Si no hay imagen

        # Agregar al JSON
        songs_list.append({
            "title": title,
            "artist": artist,
            "src": music_path,
            "art": image_path
        })

# Guardar en archivo JSON
with open("songs.json", "w", encoding="utf-8") as f:
    json.dump(songs_list, f, ensure_ascii=False, indent=4)

print("JSON generado con éxito!")
