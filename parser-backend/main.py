from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

# Importación de tus analizadores
from ll1_analyzer import GrammarAnalyzer
from lr_analyzer import LRAnalyzer
from recursive_descent import RecursiveDescentParser

app = FastAPI(title="Compiladores Progresivos API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class ParseRequest(BaseModel):
    grammar: str
    input: str
    algorithm: str

@app.post("/api/parse")
async def parse_grammar_dynamic(data: ParseRequest):
    try:
        print(f"--- NUEVA PETICIÓN ---")
        print(f"Algoritmo: {data.algorithm}")
        print(f"Cadena: {data.input}")
        
        # 🌟 VARIABLES UNIVERSALES DE CONTROL (Inicializadas para evitar NameError)
        steps = []
        tree = {}
        table_data = {}
        grammar_info = {}
        is_valid = False
        ai_hint = ""
        error_cell = None
        
        # Preparamos las variables de FIRST y FOLLOW vacías por defecto
        formatted_first = {}
        formatted_follow = {}

        # CASO A: PARSER PREDICTIVO LL(1)
        if data.algorithm == "LL(1)":
            analyzer = GrammarAnalyzer(data.grammar)
            table_data = analyzer.get_formatted_table()
            
            steps, root_node = analyzer.parse_input(data.input)
            
            formatted_first = {nt: ", ".join(sorted(list(elements))) for nt, elements in analyzer.first.items()}
            formatted_follow = {nt: ", ".join(sorted(list(elements))) for nt, elements in analyzer.follow.items()}
            
            grammar_info = {
                "start": analyzer.start_symbol,
                "non_terminals": analyzer.non_terminals,
                "terminals": analyzer.terminals,
                "productions": [f"{k} → {' | '.join([' '.join(p) for p in v])}" for k, v in analyzer.rules.items()],
                "first": formatted_first,
                "follow": formatted_follow,
                "first_sets": formatted_first,
                "follow_sets": formatted_follow
            }

            if isinstance(root_node, dict) and "tree" in root_node:
                tree = root_node.get("tree")
                error_cell = root_node.get("error_cell", None)
            else:
                tree = root_node
                error_cell = None

        # CASO B: DESCENTSO RECURSIVO (RD)
        elif data.algorithm in ["Descenso recursivo", "RD", "Recursive Descent", "recursivo"]:
            analyzer = RecursiveDescentParser(data.grammar)
            table_data = analyzer.get_frontend_table() if hasattr(analyzer, 'get_frontend_table') else {}
            
            steps, result_dict = analyzer.parse_input(data.input)
            
            tree = result_dict.get("tree") if isinstance(result_dict, dict) else result_dict
            is_valid = result_dict.get("valid", False) if isinstance(result_dict, dict) else True
            
            grammar_info = {
                "start": analyzer.start_symbol,
                "non_terminals": analyzer.non_terminals,
                "terminals": analyzer.terminals,
                "productions": [f"{k} → {' | '.join([' '.join(p) for p in v])}" for k, v in analyzer.rules.items()]
            }

        # 🌟 CASO C: BOTTOM-UP FAMILIA LR (LR0, SLR1, LR1, LALR1) COMPLETAMENTE INTEGRADO
        elif data.algorithm in ["LR(0)", "SLR(1)", "LR(1)", "LALR(1)"]:
            analyzer = LRAnalyzer(data.grammar, data.algorithm)
            
            # 1. Obtener la tabla unificada de Action/Goto
            table_data = analyzer.get_frontend_table()
            
            # 2. Ejecutar el análisis paso a paso usando el método dinámico blindado
            result_dict = analyzer.parse_input(data.input)
            
            steps = result_dict.get("steps", [])
            tree = result_dict.get("tree", {})
            error_cell = result_dict.get("error_cell", None)
            is_valid = result_dict.get("success", False)
            
            # 3. Mapear los ítems intermedios de cada estado (Colección Canónica con el punto •)
            automaton_states = {}
            for idx, state_items in enumerate(analyzer.states):
                items_strings = []
                for item in state_items:
                    head, body, dot = item[0], item[1], item[2]
                    la_str = f", {item[3]}" if len(item) == 4 else ""
                    body_list = list(body)
                    body_list.insert(dot, "•")
                    items_strings.append(f"{head} → {' '.join(body_list)}{la_str}")
                automaton_states[str(idx)] = items_strings

            # 4. Consolidar metadata de la gramática añadiendo los estados intermedios del autómata
            grammar_info = {
                "start": analyzer.start_symbol,
                "non_terminals": analyzer.non_terminals,
                "terminals": analyzer.terminals,
                "productions": [f"{head} → {' '.join(body) if body else 'ϵ'}" for head, body in analyzer.indexed_rules],
                "automaton_states": automaton_states  # Inyección directa para las pestañas del Front
            }
            
        else:
            raise Exception(f"El algoritmo '{data.algorithm}' no está registrado.")

        # Buscamos si existe un paso de Error dentro de la lista para forzar el flag de invalidez
        has_error = any(s.get("action") == "Error" for s in steps)
        if has_error:
            is_valid = False

        # Configurar mensaje de estado amigable
        if is_valid:
            ai_hint = f"Cadena analizada exitosamente usando {data.algorithm} en {len(steps)} pasos."
        else:
            detalle_error = steps[-1].get("detail") if steps else "Error sintáctico desconocido."
            ai_hint = f"Análisis de error: {detalle_error}"

        # RESPUESTA UNIFICADA TOTALMENTE EXPANDIDA
        return {
            "valid": is_valid, 
            "success": True, 
            "algorithm": data.algorithm,
            "steps": steps,
            "table": table_data,
            "error_cell": error_cell,
            "tree": tree,          
            "root_node": tree,     
            "syntax_tree": tree,   
            "ai_hint": ai_hint,
            
            # Inyección global en la raíz del JSON para máxima compatibilidad con el Front
            "grammar_info": grammar_info,
            "first": formatted_first,
            "follow": formatted_follow,
            "first_sets": formatted_first,
            "follow_sets": formatted_follow
        }

    except Exception as e:
        error_msg = str(e)
        print(f"CRASH CRÍTICO DEL SERVIDOR: {error_msg}")
        return {
            "valid": False,
            "success": False,
            "error": error_msg,
            "ai_hint": f"Error crítico en el servidor: {error_msg}",
            "steps": [],
            "table": {},
            "tree": None,
            "grammar_info": {"start": "", "non_terminals": [], "terminals": [], "productions": []}
        }