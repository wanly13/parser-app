class GrammarAnalyzer:
    def __init__(self, grammar_text: str):
        self.non_terminals = []
        self.terminals = []
        self.start_symbol = None
        self.rules = {}  # { 'E': [['T', "E'"], ...] }
        self.first = {}
        self.follow = {}
        self.table = {}  # Esta es tu tabla M de LL(1)
        self.M = {}      # Atributo espejo para evitar el error 'object has no attribute M'
        self._parse_text(grammar_text)
        self._build_analyzer()

    def _parse_text(self, text):
        lines = [l.strip() for l in text.strip().split('\n') if '→' in l or '->' in l]
        for line in lines:
            sep = '→' if '→' in line else '->'
            head, body = line.split(sep)
            head = head.strip()
            if not self.start_symbol: self.start_symbol = head
            if head not in self.non_terminals: self.non_terminals.append(head)
            
            alternatives = body.split('|')
            if head not in self.rules: self.rules[head] = []
            for alt in alternatives:
                symbols = alt.strip().split()
                self.rules[head].append(symbols)

        # Identificar terminales automáticamente
        all_symbols = set()
        for options in self.rules.values():
            for alt in options:
                for s in alt: all_symbols.add(s)
        
        self.terminals = [s for s in all_symbols if s not in self.non_terminals and s != 'ϵ']
        if '$' not in self.terminals: self.terminals.append('$')

    def _build_analyzer(self):
        self._compute_first()
        self._compute_follow()
        self._build_table()
        # Sincronizamos self.M con la tabla LL(1) generada en formato String para el front
        self.M = {}
        for nt in self.non_terminals:
            self.M[nt] = {}
            for t in self.terminals:
                if t in self.table[nt]:
                    # Convierte la lista ['T', "E'"] en el string "T E'" para mostrar en la tabla
                    self.M[nt][t] = " ".join(self.table[nt][t])
                else:
                    self.M[nt][t] = ""

    def _compute_first(self):
        for nt in self.non_terminals: self.first[nt] = set()
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
                    else: # Es un No Terminal
                        for symbol in alt:
                            if symbol in self.non_terminals:
                                self.first[head].update(self.first[symbol] - {'ϵ'})
                                if 'ϵ' not in self.first[symbol]: break
                            else:
                                self.first[head].add(symbol)
                                break
                        else: self.first[head].add('ϵ')
                    if len(self.first[head]) > before: changed = True

    def _compute_follow(self):
        for nt in self.non_terminals: self.follow[nt] = set()
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
                            if len(self.follow[symbol]) > before: changed = True

    def _get_first_of_sequence(self, symbols):
        res = set()
        for s in symbols:
            if s == 'ϵ': continue
            if s in self.terminals:
                res.add(s)
                return res
            res.update(self.first[s] - {'ϵ'})
            if 'ϵ' not in self.first[s]: return res
        res.add('ϵ')
        return res

    def _build_table(self):
        for nt in self.non_terminals:
            self.table[nt] = {}
            for alt in self.rules[nt]:
                first_alt = self._get_first_of_sequence(alt)
                for t in first_alt - {'ϵ'}:
                    self.table[nt][t] = alt
                if 'ϵ' in first_alt:
                    for t in self.follow[nt]:
                        self.table[nt][t] = alt

    def get_frontend_table(self):
        """Genera la tabla de análisis sintáctico M[A, a] formateada para LL(1)"""
        return {
            "type": "LL1",
            "states": [], # LL(1) no usa estados numéricos
            "terminals": self.terminals, 
            "non_terminals": self.non_terminals, 
            "action": self.M, # Retorna el mapa { NoTerminal: { Terminal: "Produccion" } }
            "goto": {} # Las gramáticas LL(1) no usan transiciones GOTO de la familia LR
        }

    def parse_input(self, input_str):
        """Simula la validación de la cadena usando el algoritmo de pila LL(1) real"""
        # Tokenizador inteligente para capturar correctamente 'id' u otros operadores distribuidos
        cleaned_str = input_str.replace('(', ' ( ').replace(')', ' ) ').replace('+', ' + ').replace('*', ' * ')
        tokens = cleaned_str.split() + ['$']
        
        # Pila de control sintáctico LL(1) (Iniciamos con el símbolo inicial y el fin de cadena)
        stack = ['$', self.start_symbol]
        
        # Pila paralela de nodos para reconstruir el árbol de derivación de manera estructurada
        root_node = {"label": self.start_symbol, "children": []}
        tree_stack = [None, root_node] # El 'None' se alinea con el '$' del fondo de la pila
        
        curr_input = list(tokens)
        steps = []
        n = 1
        MAX_PASOS = 200 
        
        while len(stack) > 0:
            if n > MAX_PASOS:
                raise Exception(f"Error sintáctico: Bucle infinito detectado. La cadena no pertenece a la gramática.")
                
            X = stack[-1]       # Símbolo en la cima de la pila
            a = curr_input[0]   # Token actual bajo la lupa (lookahead)
            
            # Generar captura del estado actual para el historial dinámico
            step_entry = {
                "n": n,
                "stack": " ".join(stack),
                "input": " ".join(curr_input),
                "action": "",
                "detail": ""
            }
            
            # Caso 1: La cima es el fin de cadena '$'
            if X == '$':
                if a == '$':
                    step_entry.update({"action": "Accept", "detail": "✓ Cadena válida"})
                    steps.append(step_entry)
                    stack.pop()
                    tree_stack.pop()
                    break
                else:
                    raise Exception(f"Error de sintaxis: Se esperaba el fin de la cadena, pero se leyó '{a}'.")
            
            # Caso 2: La cima de la pila es un símbolo Terminal
            elif X in self.terminals:
                if X == a:
                    step_entry.update({"action": "Match", "detail": f"Emparejar token '{a}'"})
                    steps.append(step_entry)
                    stack.pop()
                    tree_stack.pop() # Nodo terminal completado exitosamente
                    curr_input.pop(0)
                else:
                    raise Exception(f"Error de sintaxis: Se esperaba el terminal '{X}' pero vino '{a}'.")
            
            # Caso 3: La cima de la pila es un No Terminal
            elif X in self.non_terminals:
                production = self.table[X].get(a)
                
                if production is None:
                    raise Exception(f"Error de sintaxis: El No Terminal '{X}' no tiene reglas de expansión para el token '{a}'.")
                
                # Registramos la expansión en el paso actual
                prod_str = f"{X} → {' '.join(production)}"
                step_entry.update({"action": "Expand", "detail": prod_str})
                steps.append(step_entry)
                
                # Desapilamos el No Terminal actual y su nodo del árbol
                stack.pop()
                curr_node = tree_stack.pop()
                
                if production == ['ϵ']:
                    # Si produce vacío, insertamos un nodo hoja representativo
                    curr_node["children"].append({"label": "ϵ", "children": []})
                else:
                    # Creamos los nodos hijos y los vinculamos al nodo padre actual
                    children_nodes = []
                    for symbol in production:
                        node = {"label": symbol, "children": []}
                        children_nodes.append(node)
                    
                    curr_node["children"].extend(children_nodes)
                    
                    # Apilamos en orden inverso (derecha a izquierda) en la pila de control y del árbol
                    for symbol, node in zip(reversed(production), reversed(children_nodes)):
                        stack.append(symbol)
                        tree_stack.append(node)
            else:
                raise Exception(f"Símbolo desconocido en la pila de análisis: {X}")
                
            n += 1
            
        return steps, root_node

    def get_formatted_table(self):
        cells = {}
        for nt, mapping in self.table.items():
            cells[nt] = {t: " ".join(p) for t, p in mapping.items()}
        return {"type": "LL1", "non_terminals": self.non_terminals, "terminals": self.terminals, "cells": cells}