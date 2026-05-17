class GrammarAnalyzer:
    def __init__(self, grammar_text: str):
        self.non_terminals = []
        self.terminals = []
        self.start_symbol = None
        self.rules = {}  # { 'E': [['T', "E'"], ...] }
        self.first = {}
        self.follow = {}
        self.table = {}  # Tabla M de LL(1)
        self.M = {}      # Atributo espejo para el frontend
        
        self._parse_text(grammar_text)
        self._build_analyzer()

    def _parse_text(self, text):
        lines = [l.strip() for l in text.strip().split('\n') if '→' in l or '->' in l]
        for line in lines:
            sep = '→' if '→' in line else '->'
            head, body = line.split(sep)
            head = head.strip()
            if not self.start_symbol: 
                self.start_symbol = head
            if head not in self.non_terminals: 
                self.non_terminals.append(head)
            
            alternatives = body.split('|')
            if head not in self.rules: 
                self.rules[head] = []
            for alt in alternatives:
                symbols = alt.strip().split()
                # Estandarizar símbolos vacíos
                if symbols == ['ϵ'] or symbols == ['ε'] or symbols == ['λ']:
                    symbols = ['ϵ']
                self.rules[head].append(symbols)

        # Identificar terminales automáticamente
        all_symbols = set()
        for options in self.rules.values():
            for alt in options:
                for s in alt: 
                    all_symbols.add(s)
        
        self.terminals = [s for s in all_symbols if s not in self.non_terminals and s != 'ϵ']
        if '$' not in self.terminals: 
            self.terminals.append('$')

    def _build_analyzer(self):
        self._compute_first()
        self._compute_follow()
        self._build_table()
        
        self.M = {}
        for nt in self.non_terminals:
            self.M[nt] = {}
            for t in self.terminals:
                # Comprobamos de manera segura si hay múltiples alternativas asignadas
                if t in self.table[nt]:
                    prod_lista = self.table[nt][t]
                    self.M[nt][t] = " ".join(prod_lista)
                else:
                    self.M[nt][t] = ""

    def _compute_first(self):
        for nt in self.non_terminals: 
            self.first[nt] = set()
        changed = True
        while changed:
            changed = False
            for head, alternatives in self.rules.items():
                for alt in alternatives:
                    before = len(self.first[head])
                    if alt[0] == 'ϵ':
                        self.first[head].add('ϵ')
                    elif alt[0] in self.terminals:
                        self.first[head].add(alt[0])
                    else: # No Terminal
                        for symbol in alt:
                            if symbol in self.non_terminals:
                                self.first[head].update(self.first[symbol] - {'ϵ'})
                                if 'ϵ' not in self.first[symbol]: 
                                    break
                            else:
                                self.first[head].add(symbol)
                                break
                        else: 
                            self.first[head].add('ϵ')
                    if len(self.first[head]) > before: 
                        changed = True

    def _compute_follow(self):
        for nt in self.non_terminals: 
            self.follow[nt] = set()
        self.follow[self.start_symbol].add('$')
        changed = True
        while changed:
            changed = False
            for head, alternatives in self.rules.items():
                for alt in alternatives:
                    for i, symbol in enumerate(alt):
                        if symbol in self.non_terminals:
                            before = len(self.follow[symbol])
                            suffix = alt[i+1:]
                            if not suffix:
                                self.follow[symbol].update(self.follow[head])
                            else:
                                first_suffix = self._get_first_of_sequence(suffix)
                                self.follow[symbol].update(first_suffix - {'ϵ'})
                                if 'ϵ' in first_suffix:
                                    self.follow[symbol].update(self.follow[head])
                            if len(self.follow[symbol]) > before: 
                                changed = True

    def _get_first_of_sequence(self, symbols):
        res = set()
        for s in symbols:
            if s == 'ϵ': 
                continue
            if s in self.terminals:
                res.add(s)
                return res
            res.update(self.first[s] - {'ϵ'})
            if 'ϵ' not in self.first[s]: 
                return res
        res.add('ϵ')
        return res

    def _build_table(self):
        for nt in self.non_terminals:
            self.table[nt] = {}
            for alt in self.rules[nt]:
                first_alt = self._get_first_of_sequence(alt)
                
                for t in first_alt - {'ϵ'}:
                    # DETECTOR DE CONFLICTOS LL(1)
                    if t in self.table[nt]:
                        # Si ya existía una regla en esa celda, hay un conflicto de ambigüedad
                        regla_existente = self.table[nt][t]
                        if alt != regla_existente:
                            # Almacenamos un flag especial para alertar al desarrollador
                            print(f"⚠️ ¡Conflicto LL(1) detectado en M[{nt}, {t}]!")
                    self.table[nt][t] = alt
                    
                if 'ϵ' in first_alt:
                    for t in self.follow[nt]:
                        if t in self.table[nt]:
                            pass
                        self.table[nt][t] = alt

    def get_frontend_table(self):
        """Genera la tabla de análisis sintáctico formateada de manera híbrida para LL(1)"""
        return {
            "type": "LL1",
            "states": [],
            "terminals": self.terminals, 
            "non_terminals": self.non_terminals, 
            "action": self.M,   # Mapeo clásico
            "cells": self.M,    # ¡Clave! El frontend suele buscar 'cells' en LL(1)
            "goto": {}
        }

    def get_formatted_table(self):
        """Método espejo exigido por el controlador de la API para evitar crasheos de atributos"""
        return self.get_frontend_table()

    def parse_input(self, input_str):
        """Validador sintáctico resiliente que recolecta pasos intermedios y previene crasheos"""
        cleaned_str = input_str.replace('(', ' ( ').replace(')', ' ) ').replace('+', ' + ').replace('*', ' * ')
        tokens = cleaned_str.split() + ['$']
        
        stack = ['$', self.start_symbol]
        root_node = {"label": self.start_symbol, "children": []}
        tree_stack = [root_node] # Corregido para sincronía del árbol
        
        curr_input = list(tokens)
        steps = []
        n = 1
        MAX_PASOS = 200 

        # Formatear FIRST y FOLLOW para empaquetarlos ordenadamente en las propiedades de la Gramática
        formatted_first = {nt: ", ".join(sorted(list(elements))) for nt, elements in self.first.items()}
        formatted_follow = {nt: ", ".join(sorted(list(elements))) for nt, elements in self.follow.items()}

        prod_list_strings = []
        for nt, alts in self.rules.items():
            for alt in alts:
                prod_list_strings.append(f"{nt} → {' '.join(alt)}")

        grammar_metadata = {
            "non_terminals": self.non_terminals,
            "terminals": self.terminals,
            "productions": prod_list_strings,
            "first": formatted_first,      
            "follow": formatted_follow
        }

        table_info = self.get_frontend_table()

        while len(stack) > 0:
            X = stack[-1]       
            a = curr_input[0]   
            
            step_entry = {
                "n": n,
                "stack": " ".join(stack),
                "input": " ".join(curr_input),
                "action": "",
                "detail": ""
            }

            if n > MAX_PASOS:
                msg_error = "Error Sintáctico: Bucle infinito evitado en la pila de control."
                step_entry.update({"action": "Error", "detail": msg_error})
                steps.append(step_entry)
                return steps, {"table": table_info, "steps": steps, "tree": None, "error": msg_error, "success": False, "valid": False, "algorithm": "LL(1)", "grammar_info": grammar_metadata}
            
            # CASO 1: Cima es Fin de Expresión
            if X == '$':
                if a == '$':
                    step_entry.update({
                        "action": "Aceptar",
                        "detail": "Cadena aceptada con éxito."
                    })
                    steps.append(step_entry)
                    
                    # Retorno unificado exitoso con toda la metadata que main.py necesita retransmitir
                    return steps, {
                        "table": table_info,
                        "steps": steps,
                        "tree": root_node,
                        "error": None,
                        "success": True,
                        "valid": True,
                        "algorithm": "LL(1)",
                        "grammar_info": grammar_metadata
                    }
                else:
                    msg_error = f"Tokens no esperados al final de la expresión: '{a}'"
                    step_entry.update({"action": "Error", "detail": msg_error})
                    steps.append(step_entry)
                    error_cell = {"nt": self.start_symbol, "t": a}
                    
                    return steps, {
                        "table": table_info,
                        "steps": steps,
                        "tree": root_node,
                        "error": msg_error,
                        "success": False,
                        "valid": False,
                        "error_cell": error_cell, 
                        "algorithm": "LL(1)",
                        "grammar_info": grammar_metadata
                    }

            # CASO 2: Cima es un Terminal
            elif X in self.terminals:
                if X == a:
                    step_entry.update({"action": "Match", "detail": f"Emparejar token terminal '{a}'"})
                    steps.append(step_entry)
                    stack.pop()
                    if tree_stack: tree_stack.pop()
                    curr_input.pop(0)
                else:
                    msg_error = f"Error de sintaxis: Desajuste de tokens. Se esperaba terminal '{X}' pero vino '{a}'."
                    step_entry.update({"action": "Error", "detail": msg_error})
                    steps.append(step_entry)
                    return steps, {"table": table_info, "steps": steps, "tree": None, "error": msg_error, "success": False, "valid": False, "algorithm": "LL(1)", "grammar_info": grammar_metadata}
            
            # CASO 3: Cima es un No Terminal
            elif X in self.non_terminals:
                production = self.table[X].get(a)
                
                if production is None:
                    msg_error = f"Error de sintaxis: El No Terminal '{X}' no tiene celdas definidas para el lookahead '{a}'."
                    step_entry.update({"action": "Error", "detail": msg_error})
                    steps.append(step_entry)
                    error_cell = {"nt": X, "t": a}
                    
                    return steps, {
                        "table": table_info, 
                        "steps": steps, 
                        "tree": root_node, 
                        "error": msg_error, 
                        "success": False, 
                        "valid": False, 
                        "error_cell": error_cell, 
                        "algorithm": "LL(1)", 
                        "grammar_info": grammar_metadata
                    }
                
                # 🌟 SOLUCIÓN AL BUCLE INFINITO: Procesar la producción elegida
                stack.pop()  # Quitamos el No Terminal expandido
                curr_node = tree_stack.pop() if tree_stack else None
                
                if production == ['ϵ']:
                    step_entry.update({"action": "Epsilon", "detail": f"{X} → ϵ (Derivación vacía)"})
                    steps.append(step_entry)
                    if curr_node:
                        curr_node["children"].append({"label": "ϵ", "children": []})
                else:
                    step_entry.update({"action": "Expandir", "detail": f"{X} → {' '.join(production)}"})
                    steps.append(step_entry)
                    
                    # Insertar símbolos en la pila en orden inverso
                    for symbol in reversed(production):
                        stack.append(symbol)
                        
                    # Construir los nodos hijos para mantener vivo el árbol sintáctico
                    if curr_node:
                        local_children = []
                        for symbol in production:
                            child_node = {"label": symbol, "children": []}
                            local_children.append(child_node)
                        curr_node["children"] = local_children
                        # Colocar las referencias en el árbol en reversa para que coincidan con la pila
                        for child in reversed(local_children):
                            tree_stack.append(child)
            else:
                msg_error = f"Símbolo desconocido detectado: '{X}'"
                step_entry.update({"action": "Error", "detail": msg_error})
                steps.append(step_entry)
                return steps, {"table": table_info, "steps": steps, "tree": None, "error": msg_error, "success": False, "valid": False, "algorithm": "LL(1)", "grammar_info": grammar_metadata}
                
            n += 1
            
        return steps, {
            "table": table_info,
            "steps": steps,
            "tree": root_node,
            "error": None,
            "success": True,
            "valid": True,
            "algorithm": "LL(1)",
            "grammar_info": grammar_metadata
        }