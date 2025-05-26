
import pyodbc
import os


SERVER = os.getenv("DB_SERVER", r"PCOUMAIMA\SQLEXPRESS")
DATABASE = os.getenv("DB_NAME", "VisionLine")
DRIVER = os.getenv("DB_DRIVER", "{ODBC Driver 17 for SQL Server}")

CONNECTION_STRING = f"DRIVER={DRIVER};SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes"


try:
    conn = pyodbc.connect(CONNECTION_STRING)
    cursor = conn.cursor()
    print("Connexion à la base réussie")
except Exception as e:
    print("Erreur de connexion à la DB :", e)
    conn = None
    cursor = None

