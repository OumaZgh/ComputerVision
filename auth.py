from fastapi import Request, Form, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
import db  # Connexion PyODBC à SQL Server

# Configuration des templates Jinja2
templates = Jinja2Templates(directory="templates")

async def read_root(request: Request, error: str = None):
    """
    Page d'accueil, affiche la modale de connexion
    """
    context = {"request": request, "error": bool(error)}
    return templates.TemplateResponse("index.html", context)

async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    """
    Traite le formulaire de connexion et redirige vers le bon tableau de bord
    """
    # Vérifier la connexion DB
    if not db.cursor:
        raise HTTPException(status_code=500, detail="Connexion à la base de données indisponible")

    # Requête d'authentification contre la table Users
    sql = """
    SELECT Statut FROM Users WHERE Username = ? AND Password = ?
    """
    db.cursor.execute(sql, username, password)
    row = db.cursor.fetchone()

    if not row:
        return RedirectResponse(url="/?error=1", status_code=303)

    statut = row.Statut.lower()

    if statut == "operateur":
        response = RedirectResponse(url="/dashboard-operator", status_code=303)
        response.set_cookie(key="username", value=username)
        return response
    elif statut == "admin":
        response = RedirectResponse(url="/dashboard-admin", status_code=303)
        response.set_cookie(key="username", value=username)
        return response
    else:
        return RedirectResponse(url="/?error=2", status_code=303)




async def signup_form(request: Request):
    username = request.cookies.get("username", "Inconnu")
    message = ""
    params = request.query_params
    if "success" in params:
        message = " Utilisateur ajouté avec succès."
        
    elif "exists" in params:
        message = " Cet utilisateur existe déjà."
        
    elif "error" in params:
        message = " Une erreur s'est produite."

    return templates.TemplateResponse("signup.html", {
        "request": request,
        "username": username,
        "message": message
    })

from fastapi import Request, Form
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.routing import APIRouter

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.route("/signup", methods=["GET", "POST"])
async def signup(request: Request):
    if request.method == "POST":
        form = await request.form()
        username_form = form.get("username")
        email = form.get("email")
        password = form.get("password")
        statut = form.get("statut")

        try:
            db.cursor.execute("SELECT * FROM Users WHERE Username = ? OR Email = ?", (username_form, email))
            if db.cursor.fetchone():
                return RedirectResponse(url="/signup?exists=1", status_code=303)

            db.cursor.execute(
                "INSERT INTO Users (Username, Email, Password, Statut) VALUES (?, ?, ?, ?)",
                (username_form, email, password, statut)
            )
            db.conn.commit()
            response = RedirectResponse(url="/signup?success=1", status_code=303)
            response.set_cookie(key="username", value=username)
            return response
            

        except Exception as e:
            print("Erreur lors de l'ajout :", e)
            return RedirectResponse(url="/signup?error=1", status_code=303)

    # Si GET : afficher le formulaire avec le nom d'utilisateur (depuis les cookies)
    username = request.cookies.get("username", "Inconnu")
    message = None
    query_params = request.query_params

    if "exists" in query_params:
        message = "L'utilisateur existe déjà."
    elif "success" in query_params:
        message = "Utilisateur ajouté avec succès."
    elif "error" in query_params:
        message = "Une erreur est survenue lors de l'ajout."

    return templates.TemplateResponse("signup.html", {
        "request": request,
        "username": username,
        "message": message
    })





async def logout():
    """
    Déconnecte l'utilisateur en supprimant son cookie et le redirige vers la page d'accueil
    """
    # Créer une redirection vers la page d'accueil
    response = RedirectResponse(url="/", status_code=303)
    # Supprimer le cookie username
    response.delete_cookie(key="username")
    return response

async def get_operator_dashboard(request: Request):
    """
    Affiche le tableau de bord opérateur
    """
    username = request.cookies.get("username", "Inconnu")
    return templates.TemplateResponse("dashboard-operator.html", {"request": request, "username": username})

async def get_admin_dashboard(request: Request):
    """
    Affiche le tableau de bord administrateur
    """
    username = request.cookies.get("username", "Inconnu")
    return templates.TemplateResponse("dashboard-admin.html", {"request": request, "username": username})
    