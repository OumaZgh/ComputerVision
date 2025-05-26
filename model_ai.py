from fastapi import Request, HTTPException
from fastapi.responses import FileResponse
import os
import base64
from datetime import datetime
import cv2
import numpy as np
from ultralytics import YOLO
import db  # Connexion PyODBC à SQL Server

# Définition correcte des chemins vers les modèles YOLOv8
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Option 1: Utilisation de chemins absolus avec os.path.join
TOP_MODEL_PATH = os.path.join(BASE_DIR, "Model4", "weights", "best.pt")
MODEL_PATH = os.path.join(BASE_DIR, "Model3", "train", "weights", "best.pt")

# Option 2 (alternative): Chemins explicites avec séparateurs corrects si la méthode ci-dessus ne fonctionne pas
# TOP_MODEL_PATH = BASE_DIR + "/Model4/weights/best.pt"
# MODEL_PATH = BASE_DIR + "/Model3/train/weights/best.pt"

# Affichage des chemins pour vérification
print(f"Chemin absolu du dossier de base: {BASE_DIR}")
print(f"Chemin du modèle TOP: {TOP_MODEL_PATH}")
print(f"Chemin du modèle principal: {MODEL_PATH}")

# Vérification des chemins
if not os.path.exists(TOP_MODEL_PATH):
    print(f"AVERTISSEMENT: Le fichier {TOP_MODEL_PATH} n'existe pas!")
    
if not os.path.exists(MODEL_PATH):
    print(f"AVERTISSEMENT: Le fichier {MODEL_PATH} n'existe pas!")

# Variables pour stocker les chemins des dernières images analysées
last_processed_image = None
last_processed_top_image = None

# Chargement des modèles
try:
    top_model = YOLO(TOP_MODEL_PATH)
    print(f"Modèle YOLOv8 OBB chargé depuis {TOP_MODEL_PATH}")
except Exception as e:
    print(f"Erreur lors du chargement du modèle OBB: {str(e)}")
    top_model = None

try:
    model = YOLO(MODEL_PATH)
    print(f"Modèle YOLOv8 chargé depuis {MODEL_PATH}")
except Exception as e:
    print(f"Erreur lors du chargement du modèle: {str(e)}")
    model = None


# Assurer que les dossiers nécessaires existent
os.makedirs("inspection/capture", exist_ok=True)
os.makedirs("inspection/results", exist_ok=True)

async def capture_top_image(request: Request):
    """
    Capture et analyse une image de dessus avec le modèle top
    """
    global last_processed_top_image

    # Récupérer les données de l'image depuis la requête JSON
    data = await request.json()
    image_data = data.get("image", "").split(",")[1]

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"capture_top_{timestamp}.jpg"
    filepath = os.path.join("inspection", "capture", filename)

    # Enregistrer l'image capturée sur le disque
    with open(filepath, "wb") as image_file:
        image_file.write(base64.b64decode(image_data))

    file_size = os.path.getsize(filepath)

    # Variables pour les détections
    result_filename = None
    result_filepath = None
    result_file_size = None
    detections = []
    detected_classes = []

    if top_model:
        try:
            result_filename = f"result_top_{timestamp}.jpg"
            result_filepath = os.path.join("inspection", "results", result_filename)

            image_np = cv2.imread(filepath)
            results = top_model(image_np)
            result_img = image_np.copy()

            detection_count = 0

            for i, result in enumerate(results):
                if hasattr(result, 'boxes') and result.boxes is not None and len(result.boxes) > 0:
                    boxes = result.boxes
                elif hasattr(result, 'obb') and result.obb is not None and len(result.obb) > 0:
                    boxes = result.obb
                else:
                    print("Aucune détection n'a été effectuée.")
                    cv2.imwrite(result_filepath, result_img)
                    result_file_size = os.path.getsize(result_filepath)
                    last_processed_top_image = result_filepath
                    continue

                # Traiter les boîtes détectées
                for j, box in enumerate(boxes):
                    detection_count += 1
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    class_name = top_model.names[cls]

                    # Ajouter le nom de la classe à la liste
                    detected_classes.append(class_name)

                    detections.append({
                        "id": detection_count,
                        "class": class_name,
                        "confidence": round(conf * 100, 2)
                    })

                    # Dessiner les boîtes orientées sur l'image (priorité aux boîtes OBB)
                    if hasattr(box, 'xyxyxyxy'):
                        points = box.xyxyxyxy[0].cpu().numpy().reshape(4, 2).astype(np.int32)
                        cv2.polylines(result_img, [points], True, (0, 0, 255), 2)  # Rouge pour le modèle top
                    elif hasattr(box, 'points'):
                        points = box.points[0].cpu().numpy().reshape(4, 2).astype(np.int32)
                        cv2.polylines(result_img, [points], True, (0, 0, 255), 2)  # Rouge pour le modèle top
                    elif hasattr(box, 'xyxy'):
                        x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                        cv2.rectangle(result_img, (x1, y1), (x2, y2), (0, 0, 255), 2)  # Rouge pour le modèle top

            cv2.imwrite(result_filepath, result_img)
            result_file_size = os.path.getsize(result_filepath)
            last_processed_top_image = result_filepath

        except Exception as e:
            print(f"Erreur lors de l'analyse de l'image top: {str(e)}")
            import traceback
            traceback.print_exc()
            result_filename = None

    if detected_classes:
        # Compter les occurrences de chaque classe
        class_counts = {}
        for class_name in detected_classes:
            if class_name in class_counts:
                class_counts[class_name] += 1
            else:
                class_counts[class_name] = 1

        # Formater la description: "2.manquecondensateur,3.manqueresistance"
        formatted_classes = []
        for class_name, count in sorted(class_counts.items()):
            formatted_name = class_name.replace(" ", "")
            formatted_classes.append(f"{count}.{formatted_name}")

        description = "[VUE_DESSUS] " + ",".join(formatted_classes)
    else:
        description = "[VUE_DESSUS] Aucun défaut détecté"

    # Enregistrer les informations dans la base de données
    db_success = True
    db_error = None

    if db.conn and db.cursor:
        try:
            # Préparer les chemins absolus pour la base de données
            abs_filepath = os.path.abspath(filepath)

            # 1. Insérer l'image capturée dans CapturedImages
            db.cursor.execute(
                "INSERT INTO CapturedImages (FilePath, FileName, Description, FileSize, MimeType) VALUES (?, ?, ?, ?, ?)",
                (abs_filepath, filename, "Capture automatique (vue de dessus)", file_size, "image/jpeg")
            )

            # 2. Insérer l'image résultat dans InspectionImages si disponible
            if result_filepath and os.path.exists(result_filepath):
                abs_result_filepath = os.path.abspath(result_filepath)

                db.cursor.execute(
                    "INSERT INTO InspectionImages (FilePath, FileName, Description, FileSize, MimeType) VALUES (?, ?, ?, ?, ?)",
                    (abs_result_filepath, result_filename, description, result_file_size, "image/jpeg")
                )

            # Valider les transactions
            db.conn.commit()

        except Exception as e:
            db_success = False
            db_error = str(e)
            print(f"Erreur d'insertion en base de données (vue de dessus): {db_error}")
    else:
        db_success = False
        db_error = "Pas de connexion à la base de données"

    # Retourner les résultats
    return {
        "success": db_success,
        "filename": filename,
        "filepath": os.path.abspath(filepath) if filepath else None,
        "result_available": result_filename is not None,
        "result_filename": result_filename,
        "error": db_error if not db_success else None,
        "detections": detections,
        "has_detections": len(detections) > 0,
        "inspection_type": "TOP"  # Juste pour informer le frontend
    }

async def get_top_result_image():
    """
    Récupère l'image analysée par le modèle top
    """
    global last_processed_top_image

    if last_processed_top_image and os.path.exists(last_processed_top_image):
        return FileResponse(last_processed_top_image)
    else:
        # Retourner une image par défaut ou une erreur
        return HTTPException(status_code=404, detail="Pas d'image analysée vue de dessus disponible")

async def capture_image(request: Request):
    """
    Capture et analyse une image standard
    """
    global last_processed_image

    # Récupérer les données de l'image depuis la requête JSON
    data = await request.json()
    image_data = data.get("image", "").split(",")[1]

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"capture_{timestamp}.jpg"
    filepath = os.path.join("inspection", "capture", filename)

    # Enregistrer l'image capturée sur le disque
    with open(filepath, "wb") as image_file:
        image_file.write(base64.b64decode(image_data))

    file_size = os.path.getsize(filepath)

    # Variables pour les détections
    result_filename = None
    result_filepath = None
    result_file_size = None
    detections = []
    detected_classes = []

    if model:
        try:
            result_filename = f"result_{timestamp}.jpg"
            result_filepath = os.path.join("inspection", "results", result_filename)

            image_np = cv2.imread(filepath)
            results = model(image_np)
            result_img = image_np.copy()

            detection_count = 0

            for i, result in enumerate(results):
                if hasattr(result, 'boxes') and result.boxes is not None and len(result.boxes) > 0:
                    boxes = result.boxes
                elif hasattr(result, 'obb') and result.obb is not None and len(result.obb) > 0:
                    boxes = result.obb
                else:
                    print("Aucune détection n'a été effectuée.")
                    cv2.imwrite(result_filepath, result_img)
                    result_file_size = os.path.getsize(result_filepath)
                    last_processed_image = result_filepath
                    continue

                # Traiter les boîtes détectées
                for j, box in enumerate(boxes):
                    detection_count += 1
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    class_name = model.names[cls]

                    # Ajouter le nom de la classe à la liste
                    detected_classes.append(class_name)

                    detections.append({
                        "id": detection_count,
                        "class": class_name,
                        "confidence": round(conf * 100, 2)
                    })

                    # Dessiner les boîtes orientées sur l'image
                    if hasattr(box, 'xyxyxyxy'):
                        points = box.xyxyxyxy[0].cpu().numpy().reshape(4, 2).astype(np.int32)
                        cv2.polylines(result_img, [points], True, (0, 255, 0), 2)
                    elif hasattr(box, 'points'):
                        points = box.points[0].cpu().numpy().reshape(4, 2).astype(np.int32)
                        cv2.polylines(result_img, [points], True, (0, 255, 0), 2)
                    elif hasattr(box, 'xyxy'):
                        x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                        cv2.rectangle(result_img, (x1, y1), (x2, y2), (0, 255, 0), 2)

            cv2.imwrite(result_filepath, result_img)
            result_file_size = os.path.getsize(result_filepath)
            last_processed_image = result_filepath

        except Exception as e:
            print(f"Erreur lors de l'analyse de l'image: {str(e)}")
            import traceback
            traceback.print_exc()
            result_filename = None

    if detected_classes:
        # Compter les occurrences de chaque classe
        class_counts = {}
        for class_name in detected_classes:
            if class_name in class_counts:
                class_counts[class_name] += 1
            else:
                class_counts[class_name] = 1

        # Formater la description: "2.manquecondensateur,3.manqueresistance"
        formatted_classes = []
        for class_name, count in sorted(class_counts.items()):
            # Remplacer les espaces dans les noms de classe pour avoir un format plus compact
            formatted_name = class_name.replace(" ", "")
            formatted_classes.append(f"{count}.{formatted_name}")

        description = ",".join(formatted_classes)
    else:
        description = "Aucun défaut détecté"

    # Enregistrer les informations dans la base de données
    db_success = True
    db_error = None

    if db.conn and db.cursor:
        try:
            # Préparer les chemins absolus pour la base de données
            abs_filepath = os.path.abspath(filepath)

            # 1. Insérer l'image capturée dans CapturedImages
            db.cursor.execute(
                "INSERT INTO CapturedImages (FilePath, FileName, Description, FileSize, MimeType) VALUES (?, ?, ?, ?, ?)",
                (abs_filepath, filename, "Capture automatique depuis inspection", file_size, "image/jpeg")
            )

            # 2. Insérer l'image résultat dans InspectionImages si disponible
            if result_filepath and os.path.exists(result_filepath):
                abs_result_filepath = os.path.abspath(result_filepath)

                db.cursor.execute(
                    "INSERT INTO InspectionImages (FilePath, FileName, Description, FileSize, MimeType) VALUES (?, ?, ?, ?, ?)",
                    (abs_result_filepath, result_filename, description, result_file_size, "image/jpeg")
                )

            # Valider les transactions
            db.conn.commit()

        except Exception as e:
            db_success = False
            db_error = str(e)
            print(f"Erreur d'insertion en base de données: {db_error}")
    else:
        db_success = False
        db_error = "Pas de connexion à la base de données"

    # Retourner les résultats
    return {
        "success": db_success,
        "filename": filename,
        "filepath": os.path.abspath(filepath) if filepath else None,
        "result_available": result_filename is not None,
        "result_filename": result_filename,
        "error": db_error if not db_success else None,
        "detections": detections,
        "has_detections": len(detections) > 0
    }

async def get_result_image():
    """
    Récupère l'image analysée par le modèle standard
    """
    global last_processed_image

    if last_processed_image and os.path.exists(last_processed_image):
        return FileResponse(last_processed_image)
    else:
        # Retourner une image par défaut ou une erreur
        return HTTPException(status_code=404, detail="Pas d'image analysée disponible")

async def get_last_inspection_details():
    """
    Récupère les détails de la dernière inspection
    """
    if not db.cursor:
        return HTTPException(status_code=500, detail="Connexion à la base de données indisponible")

    try:
        # Récupérer les informations de la dernière image analysée
        db.cursor.execute("""
            SELECT TOP 1 ImageID, FileName, InspectionDate 
            FROM InspectionImages 
            ORDER BY InspectionDate DESC
        """)
        row = db.cursor.fetchone()

        if row:
            # Si l'image est trouvée, retourner ses détails
            return {
                "success": True,
                "image_id": row.ImageID,
                "filename": row.FileName,
                "date": row.InspectionDate.strftime("%d/%m/%Y %H:%M:%S"),
                "components": [
                    {"name": "Composant A", "confidence": 95},
                    {"name": "Soudures OK", "confidence": 88},
                    {"name": "Connecteur B", "confidence": 76}
                ]
            }
        else:
            return {"success": False, "error": "Aucune inspection trouvée"}
    except Exception as e:
        return {"success": False, "error": str(e)}