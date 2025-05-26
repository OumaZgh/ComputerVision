from fastapi import HTTPException
import db
from collections import defaultdict, Counter
from datetime import datetime


async def get_inspection_images():
    if not db.cursor:
        raise HTTPException(status_code=500, detail="Connexion à la base de données indisponible")

    try:
        sql = """
        SELECT ORDFab, PRF, SN, etat, Description, InspectionDate, ResultPath, face, UserId
        FROM pcba
        """
        db.cursor.execute(sql)
        rows = db.cursor.fetchall()

        images_dict = {}  # clé = (OF, SN), valeurs = données top/bot combinées
        BASE_URL = "http://localhost:8000/images/"
        

        for row in rows:
            key = (row.ORDFab, row.PRF, row.SN)

            if key not in images_dict:
                images_dict[key] = {
                    "OF": row.ORDFab,
                    "PRF": row.PRF,
                    "SN": row.SN,
                    "resultat": None,  # sera calculé après
                    "etat_top": None,
                    "etat_bot": None,
                    "defauts": [],
                    "path_top": "aucun",
                    "path_bot": "aucun",
                    "date": row.InspectionDate.isoformat() if row.InspectionDate else None,
                    "id_operateur": row.UserId
                }

    # Image path
            filename = row.ResultPath.split("\\")[-1] if row.ResultPath else None
            path = BASE_URL + filename if filename else "aucun"

    # Face
            if row.face == "top":
                images_dict[key]["path_top"] = path
                images_dict[key]["etat_top"] = row.etat
            elif row.face == "bot":
                images_dict[key]["path_bot"] = path
                images_dict[key]["etat_bot"] = row.etat

        # Défauts
            if row.Description:
                images_dict[key]["defauts"].append(row.Description)

        
            # Fusion des états top/bot pour résultat final
        for item in images_dict.values():
            etat_top = item["etat_top"]
            etat_bot = item["etat_bot"]

            if etat_top == 1 or etat_bot == 1:
                item["resultat"] = "fail"
            elif etat_top == 0 and etat_bot == 0:
                item["resultat"] = "pass"
            # Fusion des défauts
            if not item["defauts"]:
                item["defauts"] = "Aucun"
            else:
                item["defauts"] = ", ".join(set(item["defauts"]))

        # Nettoyage des champs internes
            del item["etat_top"]
            del item["etat_bot"]

        return list(images_dict.values())

    except Exception as e:
        print("Erreur lors de la récupération :", str(e))
        raise HTTPException(status_code=500, detail=f"Erreur base de données : {str(e)}")
    


async def get_stats():
    if not db.cursor:
        raise HTTPException(status_code=500, detail="Connexion à la base de données indisponible")
    try:
        sql = """
        SELECT SN, etat, Description
        FROM pcba
        """
        db.cursor.execute(sql)
        rows = db.cursor.fetchall()
        sn_etats = defaultdict(list)
        descriptions = []
        for row in rows:
            sn = row.SN
            etat = row.etat
            if etat is not None:
                sn_etats[sn].append(etat)
            if row.Description and str(row.Description).strip().lower() != "aucun":
                descriptions.append(str(row.Description).strip())
        total = len(sn_etats)
        fail = 0
        for sn, etats in sn_etats.items():
            if any(e == 1 for e in etats):  # Si au moins un côté est fail
                fail += 1
        pass_ = total - fail
        # Calcul des pourcentages
        pass_percentage = (pass_ / total * 100) if total > 0 else 0
        fail_percentage = (fail / total * 100) if total > 0 else 0
        defect_counter = Counter(descriptions)
        most_common_defect, occurrences = defect_counter.most_common(1)[0] if defect_counter else ("Aucun", 0)
        # Date de mise à jour
        last_update = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return {
            "total": total,
            "fail": fail,
            "pass": pass_,
            "pass_percentage": pass_percentage,
            "fail_percentage": fail_percentage,
            "frequent_defect": most_common_defect,
            "defect_count": occurrences,
            "last_update": last_update
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur base de données : {str(e)}")
       



    
