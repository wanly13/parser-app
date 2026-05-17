from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

# Importación de tus analizadores
from ll1_analyzer import GrammarAnalyzer
from lr_analyzer import LRAnalyzer
from recursive_descent import RecursiveDescentParser

app = FastAPI(title="Compiladores Progresivos API")

# Configuración de CORS para comunicarse con el React de tu compañero
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Esquema de datos estricto
class ParseRequest(BaseModel):
    grammar: str
    input: str
    algorithm: str

@app.post("/api/parse")
async def parse_grammar_dynamic(data: ParseRequest):
    try:
        # Imprime en la consola de Python para auditar qué está enviando el frontend
        print(f"--- NUEVA PETICIÓN ---")
        print(f"Algoritmo: {data.algorithm}")
        print(f"Cadena: {data.input}")
        
        # 1. ENRUTADOR DINÁMICO DE ALGORITMOS
        
        # CASO A: PARSER PREDICTIVO LL(1)
        if data.algorithm == "LL(1)":
            analyzer = GrammarAnalyzer(data.grammar)
            table_data = analyzer.get_formatted_table()
            steps, tree = analyzer.parse_input(data.input)
            grammar_info = {
                "start": analyzer.start_symbol,
                "non_terminals": analyzer.non_terminals,
                "terminals": analyzer.terminals,
                "productions": [f"{k} → {' | '.join([' '.join(p) for p in v])}" for k, v in analyzer.rules.items()]
            }
            
        # CASO B: DESCENTSO RECURSIVO (Acepta variaciones de nombre del frontend)
        elif data.algorithm in ["Descenso recursivo", "RD", "Recursive Descent", "recursivo"]:
            analyzer = RecursiveDescentParser(data.grammar)
            table_data = analyzer.get_frontend_table()
            steps, tree = analyzer.parse_input(data.input)
            grammar_info = {
                "start": analyzer.start_symbol,
                "non_terminals": analyzer.non_terminals,
                "terminals": analyzer.terminals,
                "productions": [f"{k} → {' | '.join([' '.join(p) for p in v])}" for k, v in analyzer.rules.items()]
            }
            
        # CASO C: BOTTOM-UP FAMILIA LR (LR(0) y SLR(1))
        elif data.algorithm in ["LR(0)", "SLR(1)", "LR(1)", "LALR(1)"]:
            analyzer = LRAnalyzer(data.grammar, data.algorithm)
            table_data = analyzer.get_frontend_table()
            steps, tree = analyzer.parse_input(data.input)
            grammar_info = {
                "start": analyzer.start_symbol,
                "non_terminals": analyzer.non_terminals,
                "terminals": analyzer.terminals,
                "productions": [f"{k} → {' | '.join([' '.join(p) for p in v])}" for k, v in analyzer.rules.items()]
            }
            
        else:
            raise Exception(f"El algoritmo '{data.algorithm}' no está registrado o configurado en el backend.")

        # 2. RESPUESTA EXITOSA UNIFICADA (Estructura idéntica para todos)
        return {
            "valid": True,
            "algorithm": data.algorithm,
            "grammar_info": grammar_info,
            "steps": steps,
            "table": table_data,
            "tree": tree,
            "ai_hint": f"Cadena analizada exitosamente usando {data.algorithm} en {len(steps)} pasos."
        }

    except Exception as e:
        # 3. CONTENEDOR DE ERRORES CON EXPLICACIÓN AMIGABLE
        error_msg = str(e)
        print(f"ERROR PROCESANDO PETICIÓN: {error_msg}")
        
        # Explicación técnica por defecto si falla la IA
        ai_explanation = f"Ocurrió un error de emparejamiento. Revisa que los tokens de la cadena correspondan con el alfabeto de las producciones."
        
        # Opcional: Si tienes configurado el cliente Gemini, puedes descomentar esto:
        # try:
        #     prompt = f"El estudiante está construyendo un analizador {data.algorithm}. La entrada es '{data.input}'. Error interno: {error_msg}. Explica el error sintáctico de forma amigable en 2 líneas en español."
        #     response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        #     ai_explanation = response.text
        # except:
        #     pass

        return {
            "valid": False, 
            "error": error_msg,
            "ai_hint": f"Análisis de error: {ai_explanation}",
            "steps": [],
            "table": {},
            "tree": {},
            "grammar_info": {"start": "", "non_terminals": [], "terminals": [], "productions": []}
        }