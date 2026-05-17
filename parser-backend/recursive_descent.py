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
        """Punto de entrada principal para validar la cadena"""
        # CORRECCIÓN 1: Tokenizador inteligente por palabras (Soporta 'id')
        cleaned_str = input_str.replace('(', ' ( ').replace(')', ' ) ').replace('+', ' + ').replace('*', ' * ').replace('=', ' = ')
        raw_tokens = cleaned_str.split()
        
        self.tokens = raw_tokens + ['$']
        self.index = 0  
        self.steps = []
        self.step_counter = 1
        
        try:
            # Iniciamos la recursión con el símbolo inicial
            root_node = self._match_non_terminal(self.start_symbol)
            
            if self.tokens[self.index] != '$':
                raise Exception(f"Tokens sobrantes al final de la cadena: '{' '.join(self.tokens[self.index:-1])}'")
                
            self._record_step("Accept", f"Cadena completamente validada por Descenso Recursivo.", self.start_symbol)
            return self.steps, root_node
            
        except Exception as e:
            raise Exception(f"Error en Descenso Recursivo: {str(e)}")

    def _record_step(self, action, detail, current_symbol):
        stack_visual = f"Llamando a {current_symbol}" if action == "Call" else action
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
        """Simula dinámicamente la función recursiva para cualquier No Terminal"""
        # CORRECCIÓN 2: Control preventivo contra loops por recursión izquierda en la gramática
        if self.step_counter > 300:
            raise Exception("Límite de pasos excedido. Posible bucle infinito causado por recursión por la izquierda en la gramática.")

        self._record_step("Call", f"Intentando expandir el No Terminal '{nt}'", nt)
        saved_index = self.index
        
        for alternatives in self.rules[nt]:
            self.index = saved_index 
            children = []
            success = True
            
            for symbol in alternatives:
                if symbol in self.non_terminals:
                    try:
                        child_node = self._match_non_terminal(symbol)
                        children.append(child_node)
                    except Exception:
                        success = False
                        break
                else:
                    current_token = self.tokens[self.index]
                    if current_token == symbol:
                        self._record_step("Match", f"Terminal exitoso: '{symbol}'", nt)
                        children.append({"label": symbol, "children": []})
                        self.index += 1
                    else:
                        success = False
                        break
                        
            if success:
                if not alternatives:
                    children.append({"label": "ϵ", "children": []})
                    self._record_step("Epsilon", f"Derivación vacía (ϵ) para '{nt}'", nt)
                    
                self._record_step("Return", f"Éxito expandiendo '{nt}'", nt)
                return {"label": nt, "children": children}
                
        raise Exception(f"No se pudo emparejar el No Terminal '{nt}' con el token '{self.tokens[saved_index]}'")

    def get_frontend_table(self):
        return {
            "type": "RD",
            "states": [0],
            "terminals": self.terminals,
            "non_terminals": self.non_terminals,
            "action": {0: {t: "Función Ejecutada" for t in self.terminals}},
            "goto": {0: {nt: "Llamada" for nt in self.non_terminals}},
            "info": "El análisis por Descenso Recursivo se ejecuta mediante código de funciones recursivas simuladas, por lo que no requiere una tabla de transición de estados fija."
        }