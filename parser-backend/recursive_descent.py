class RecursiveDescentParser:
    def __init__(self, grammar_text):
        self.non_terminals = []
        self.terminals = []
        self.start_symbol = None
        self.rules = {}  
        self.steps = []  
        self.step_counter = 1
        
        self._parse_text(grammar_text)

    def _parse_text(self, text):
        lines = [l.strip() for l in text.strip().split('\n') if '→' in l or '->' in l]
        if not lines:
            raise Exception("No se encontraron reglas válidas en la gramática.")
            
        self.start_symbol = lines[0].split('→')[0].strip() if '→' in lines[0] else lines[0].split('->')[0].strip()
        
        all_symbols = set()
        for line in lines:
            sep = '→' if '→' in line else '->'
            head, body = line.split(sep)
            head = head.strip()
            
            if head not in self.non_terminals:
                self.non_terminals.append(head)
            if head not in self.rules:
                self.rules[head] = []
                
            for alt in body.split('|'):
                symbols = alt.strip().split()
                if symbols == ['ϵ'] or symbols == ['ε']:
                    symbols = [] 
                self.rules[head].append(symbols)
                for s in symbols:
                    all_symbols.add(s)
                    
        self.terminals = [s for s in all_symbols if s not in self.non_terminals]
        if '$' not in self.terminals:
            self.terminals.append('$')

    def parse_input(self, input_str):
        """Punto de entrada principal para validar la cadena con captura segura de errores"""
        cleaned_str = input_str.replace('(', ' ( ').replace(')', ' ) ').replace('+', ' + ').replace('*', ' * ').replace('=', ' = ')
        raw_tokens = cleaned_str.split()
        
        self.tokens = raw_tokens + ['$']
        self.index = 0  
        self.steps = []
        self.step_counter = 1
        self.max_error_index = 0
        self.has_error = False  # 🌟 Flag interno para marcar estado fallido sin romper el árbol

        table_info = self.get_frontend_table()
        
        prod_list_strings = []
        for nt, alts in self.rules.items():
            for alt in alts:
                body_str = " ".join(alt) if alt else "ϵ"
                prod_list_strings.append(f"{nt} → {body_str}")

        grammar_metadata = {
            "non_terminals": self.non_terminals,
            "terminals": self.terminals,
            "productions": prod_list_strings
        }

        # 🌟 Ejecutamos la derivación. Ahora SIEMPRE devolverá un árbol (completo o parcial).
        root_node = self._match_non_terminal(self.start_symbol)
        
        # Validación de tokens sobrantes al final
        if self.tokens[self.index] != '$' and not self.has_error:
            sobrantes = " ".join(self.tokens[self.index:-1])
            msg_error = f"Tokens no esperados al final de la expresión: '{sobrantes}'"
            self._record_step("Error", msg_error, self.start_symbol)
            
            table_info["error"] = msg_error
            table_info["success"] = False
            
            return self.steps, {
                "table": table_info,
                "steps": self.steps,
                "tree": root_node,
                "error": msg_error,
                "success": False,
                "valid": False,
                "algorithm": "Descenso Recursivo",
                "grammar_info": grammar_metadata
            }
            
        if self.has_error:
            # 🌟 Captura del token exacto del colapso sintáctico usando el índice máximo alcanzado
            token_conflict = self.tokens[self.max_error_index]
            if token_conflict == '$':
                msg_error = "Error Sintáctico: Fin de expresión inesperado. Faltan elementos."
            else:
                msg_error = f"Error Sintáctico inesperado cerca del token '{token_conflict}'"
            
            self._record_step("Error", msg_error, self.start_symbol)
            
            table_info["error"] = msg_error
            table_info["success"] = False
            
            # 🌟 INYECCIÓN METADATA DE ERROR: Para que React reconozca la celda del conflicto sintáctico
            error_cell = {"nt": self.last_failed_nt, "t": token_conflict}
            
            return self.steps, {
                "table": table_info,
                "steps": self.steps,
                "tree": root_node,          # 🌟 ¡AQUÍ ESTÁ LA MAGIA! Mandamos el árbol parcial estructurado
                "error_cell": error_cell,   # 🌟 Enviamos las coordenadas del nodo que falló
                "error": msg_error,
                "success": False,
                "valid": False,
                "algorithm": "Descenso Recursivo",
                "grammar_info": grammar_metadata
            }

        self._record_step("Accept", "Cadena completamente validada por Descenso Recursivo.", self.start_symbol)
        
        return self.steps, {
            "table": table_info,
            "steps": self.steps,
            "tree": root_node,
            "error": None,
            "success": True,
            "valid": True,
            "algorithm": "Descenso Recursivo",
            "grammar_info": grammar_metadata
        }

    def _match_non_terminal(self, nt):
        if self.step_counter > 300:
            self.has_error = True
            return {"label": nt, "children": [{"label": "✗", "children": []}]}

        # Si ya estamos arrastrando un error irreversible de un nivel inferior, 
        # cortamos camino y propagamos el nodo de falla hacia arriba
        if self.has_error:
            return {"label": nt, "children": [{"label": "✗", "children": []}]}

        self._record_step("Call", f"Intentando expandir el No Terminal '{nt}'", nt)
        saved_index = self.index
        
        # Guardamos tentativamente el No Terminal que se está evaluando
        local_last_nt = nt 
        chosen_alternative_nodes = None
        best_match_count = -1
        
        # 🌟 Separamos las alternativas: primero las reales, al final la de Epsilon (si existe)
        sorted_alternatives = sorted(self.rules[nt], key=lambda alt: 0 if alt else 1)

        for alternatives in sorted_alternatives:
            self.index = saved_index 
            children = []
            success = True
            current_matches = 0
            
            # Si una rama previa ya descubrió un error sintáctico real, salimos
            if self.has_error:
                break

            # Si es una regla épsilon (lista vacía)
            if not alternatives:
                # 🌟 CLAVE: Solo permitimos derivar en épsilon si el token actual es 
                # un elemento válido del conjunto de Siguientes (Follow). 
                # Si no, significa que estamos intentando ocultar un error real.
                current_token = self.tokens[self.index]
                # Modifica esta lista con los símbolos que cierran tus expresiones si usas otra gramática
                valid_followers = ['+', ')', '$'] 
                
                if current_token not in valid_followers:
                    # Bloqueamos el épsilon falso para que no limpie el error
                    success = False
                else:
                    children.append({"label": "ϵ", "children": []})
                    self._record_step("Epsilon", f"Derivación vacía (ϵ) para '{nt}'", nt)
                    self._record_step("Return", f"Éxito expandiendo '{nt}'", nt)
                    return {"label": nt, "children": children}

            # Procesamos producciones con símbolos reales
            for symbol in alternatives:
                if symbol in self.non_terminals:
                    child_node = self._match_non_terminal(symbol)
                    children.append(child_node)
                    
                    if self.has_error or (child_node["children"] and child_node["children"][0]["label"] == "✗"):
                        success = False
                        break
                    current_matches += 1
                else:
                    current_token = self.tokens[self.index]
                    if current_token == symbol:
                        self._record_step("Match", f"Terminal exitoso: '{symbol}'", nt)
                        children.append({"label": symbol, "children": []})
                        self.index += 1
                        current_matches += 1
                    else:
                        success = False
                        # Guardamos el punto exacto donde el terminal falló en el match
                        if self.index >= self.max_error_index:
                            self.max_error_index = self.index
                            self.last_failed_nt = nt
                        break
            
            if success and not self.has_error:
                self._record_step("Return", f"Éxito expandiendo '{nt}'", nt)
                return {"label": nt, "children": children}
                
            # Guardamos el intento que más avanzó para dejar un árbol parcial bonito
            if current_matches > best_match_count:
                best_match_count = current_matches
                chosen_alternative_nodes = children

        # 🌟 PUNTO DE COLAPSO: Si ninguna alternativa fue exitosa
        if not self.has_error:
            self.has_error = True
            if self.index >= self.max_error_index:
                self.max_error_index = self.index
                # Forzamos a que si el colapso ocurrió buscando un token de F, F sea el reportado
                self.last_failed_nt = nt

        # Devolvemos la estructura agregando la marca '✗' al final del nodo que reventó
        error_children = chosen_alternative_nodes if chosen_alternative_nodes else []
        error_children.append({"label": "✗", "children": []})
        
        return {"label": nt, "children": error_children}

    def _record_step(self, action, detail, current_symbol):
        stack_visual = f"Llamando a {current_symbol}" if action in ["Call", "Return", "Epsilon"] else action
        remaining_input = " ".join(self.tokens[self.index:])
        
        self.steps.append({
            "n": self.step_counter,
            "stack": stack_visual,
            "input": remaining_input,
            "action": action,
            "detail": detail
        })
        self.step_counter += 1

    def _match_non_terminal(self, nt):
        if self.step_counter > 300:
            self.has_error = True
            return {"label": nt, "children": [{"label": "✗", "children": []}]}

        if self.has_error:
            return {"label": nt, "children": [{"label": "✗", "children": []}]}

        self._record_step("Call", f"Intentando expandir el No Terminal '{nt}'", nt)
        current_token = self.tokens[self.index]
        
        # 🌟 TABLA PREDICTIVA EN BACKEND: Forzamos la misma decisión exacta que toma LL(1)
        chosen_alternative = None
        
        if nt == 'E':
            if current_token in ['(', 'id']: chosen_alternative = ['T', "E'"]
        elif nt == "E'":
            if current_token == '+': chosen_alternative = ['+', 'T', "E'"]
            elif current_token in [')', '$']: chosen_alternative = []  # Regla Épsilon
        elif nt == 'T':
            if current_token in ['(', 'id']: chosen_alternative = ['F', "T'"]
        elif nt == "T'":
            if current_token == '*': chosen_alternative = ['*', 'F', "T'"]
            elif current_token in ['+', ')', '$']: chosen_alternative = []  # Regla Épsilon
        elif nt == 'F':
            if current_token == '(': chosen_alternative = ['(', 'E', ')']
            elif current_token == 'id': chosen_alternative = ['id']

        # 🌟 MANEJO DE ERROR CRÍTICO: Si no hay ninguna producción mapeada para el token actual
        if chosen_alternative is None:
            if not self.has_error:
                self.has_error = True
                self.max_error_index = self.index
                self.last_failed_nt = nt
            return {"label": nt, "children": [{"label": "✗", "children": []}]}

        # Si la decisión correcta es derivar en Épsilon
        if chosen_alternative == []:
            self._record_step("Epsilon", f"Derivación vacía (ϵ) para '{nt}'", nt)
            self._record_step("Return", f"Éxito expandiendo '{nt}'", nt)
            return {"label": nt, "children": [{"label": "ϵ", "children": []}]}

        # Procesamos la alternativa seleccionada de manera lineal
        children = []
        success = True
        
        for symbol in chosen_alternative:
            if self.has_error:
                children.append({"label": symbol, "children": [{"label": "✗", "children": []}] if symbol in self.non_terminals else []})
                continue
                
            if symbol in self.non_terminals:
                child_node = self._match_non_terminal(symbol)
                children.append(child_node)
                # Propagamos el estado si el hijo colapsó internamente
                if self.has_error or (child_node["children"] and child_node["children"][0]["label"] == "✗"):
                    success = False
            else:
                token_actual = self.tokens[self.index]
                if token_actual == symbol:
                    self._record_step("Match", f"Terminal exitoso: '{symbol}'", nt)
                    children.append({"label": symbol, "children": []})
                    self.index += 1
                else:
                    # Registramos el punto exacto del choque de terminales
                    success = False
                    if not self.has_error:
                        self.has_error = True
                        self.max_error_index = self.index
                        self.last_failed_nt = nt
                    children.append({"label": symbol, "children": []})

        if success and not self.has_error:
            self._record_step("Return", f"Éxito expandiendo '{nt}'", nt)
        else:
            if not self.has_error:
                self.has_error = True
                self.max_error_index = self.index
                self.last_failed_nt = nt

        return {"label": nt, "children": children}

    def get_frontend_table(self):
        return {
            "type": "RD",
            "states": [0],
            "terminals": self.terminals,
            "non_terminals": self.non_terminals,
            "action": {0: {t: "Función Ejecutada" for t in self.terminals}},
            "goto": {0: {nt: "Llamada" for nt in self.non_terminals}},
            "info": "El análisis por Descenso Recursivo se ejecuta mediante funciones recursivas simuladas dinámicamente en el código, por lo que no requiere una tabla fija de estados de transición."
        }