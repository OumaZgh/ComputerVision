
from fastapi import FastAPI, Request, Form, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, FileResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uuid
import os
import historique
import auth
import model_ai
from datetime import datetime


app = FastAPI()

templates = Jinja2Templates(directory="templates")
app.mount("/images", StaticFiles(directory=r"C:\results"), name="images")

if Path("static").exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, error: str = None):
    return await auth.read_root(request, error)

@app.post("/login")
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    return await auth.login(request, username, password)

@app.get("/logout")
async def logout():
    return await auth.logout()

@app.get("/dashboard-operator", response_class=HTMLResponse)
async def get_operator_dashboard(request: Request):
    return await auth.get_operator_dashboard(request)

@app.get("/dashboard-admin", response_class=HTMLResponse)
async def get_admin_dashboard(request: Request):
    return await auth.get_admin_dashboard(request)

# Routes pour l'IA et l'analyse d'images
@app.post("/capture-top-image")
async def capture_top_image(request: Request):
    return await model_ai.capture_top_image(request)

@app.get("/get-top-result-image")
async def get_top_result_image():
    return await model_ai.get_top_result_image()

@app.post("/capture-image")
async def capture_image(request: Request):
    return await model_ai.capture_image(request)

@app.get("/get-result-image")
async def get_result_image():
    return await model_ai.get_result_image()

@app.get("/get-last-inspection-details")
async def get_last_inspection_details():
    return await model_ai.get_last_inspection_details()

"""
@app.get("/api/inspection-images/")
async def get_inspection_images():
    return historique.get_inspection_images()
"""
@app.get("/signup")
async def signup_form(request: Request):
    return await auth.signup_form(request)

@app.post("/signup")
async def signup(request: Request):
    return await auth.signup(request)
    


@app.get("/inspection-images")
async def inspection_images():
    try:
        images = await historique.get_inspection_images()
        return {"images": images}
    except HTTPException as e:
        raise e
    

@app.get("/stats")
async def get_statistics():
    from historique import get_stats
    stats = await get_stats()
    stats["last_update"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")  # Ajout de la date
    return JSONResponse(content=stats)

@app.get("/test-stats")
async def test_stats():
    try:
        from historique import get_stats
        stats = await get_stats()
        return stats
    except Exception as e:
        return {"error": str(e)}

@app.get("/statsDashboard", response_class=HTMLResponse)
async def get_dashboard_stats(request: Request):
    from historique import get_stats
    stats = await get_stats()
    stats["last_update"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")  # Ajout de la date
    
    return templates.TemplateResponse("dashboard.html", {"request": request, "stats": stats})


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
       from historique import get_stats
       stats = await get_stats()
       current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")  # Récupérer les statistiques
       return templates.TemplateResponse("dashboard.html", {"request": request, "stats": stats})

@app.get("/.well-known/appspecific/com.chrome.devtools.json")
def chrome_devtools():
    return JSONResponse(content={"status": "ignored"})
# Démarrage de l'application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
