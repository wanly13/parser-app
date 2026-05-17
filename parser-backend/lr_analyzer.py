class LRAnalyzer:
    def __init__(self, grammar_text, parser_type="LR(0)"):
        self.parser_type = parser_type
        self.non_terminals = []
        self.terminals = []
        self.start_symbol = None
        self.rules = {}      # Ej: {'E': [['E', '+', 'T'], ['T']]}
        self.indexed_rules = [] # Para los "reduces" (r1, r2, r3...)
        
        self._parse_text(grammar_text)
        
        # Estructuras para el autómata
        self.states = [] 

    def _parse_text(self, text):
        """Parser amigable para procesar la gramática línea por línea"""
        lines = [l.strip() for l in text.strip().split('\n') if '→' in l or '->' in l]
        
        # 1. Gramática Aumentada: Creamos un nuevo símbolo inicial (Ej. S' -> S)
        first_head = lines[0].split('→')[0].strip() if '→' in lines[0] else lines[0].split('->')[0].strip()
        self.start_symbol = first_head + "'"
        self.rules[self.start_symbol] = [[first_head]]
        self.non_terminals.append(self.start_symbol)
        
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
                if symbols == ['ϵ'] or symbols == ['epsilon']: symbols = [] 
                self.rules[head].append(symbols)
                self.indexed_rules.append((head, symbols)) 
                for s in symbols: all_symbols.add(s)

        self.terminals = [s for s in all_symbols if s not in self.non_terminals]
        if '$' not in self.terminals: self.terminals.append('$')

    def compute_first_and_follow(self):
        """Calcula de forma dinámica los conjuntos FIRST y FOLLOW para SLR(1)"""
        first = {nt: set() for nt in self.non_terminals}
        follow = {nt: set() for nt in self.non_terminals}
        follow[self.start_symbol].add('$')
        
        changed = True
        while changed:
            changed = False
            for head, productions in self.rules.items():
                for prod in productions:
                    if not prod:
                        if 'ϵ' not in first[head]:
                            first[head].add('ϵ')
                            changed = True
                    else:
                        for symbol in prod:
                            if symbol in self.terminals:
                                if symbol not in first[head]:
                                    first[head].add(symbol)
                                    changed = True
                                break
                            else:
                                antes = len(first[head])
                                first[head].update(first[symbol] - {'ϵ'})
                                if len(first[head]) > antes: changed = True
                                if 'ϵ' not in first[symbol]: break
                        else:
                            if 'ϵ' not in first[head]:
                                first[head].add('ϵ')
                                changed = True

        changed = True
        while changed:
            changed = False
            for head, productions in self.rules.items():
                for prod in productions:
                    for i, symbol in enumerate(prod):
                        if symbol in self.non_terminals:
                            rest = prod[i+1:]
                            if not rest:
                                antes = len(follow[symbol])
                                follow[symbol].update(follow[head])
                                if len(follow[symbol]) > antes: changed = True
                            else:
                                first_rest = set()
                                for s in rest:
                                    if s in self.terminals:
                                        first_rest.add(s)
                                        break
                                    else:
                                        first_rest.update(first[s] - {'ϵ'})
                                        if 'ϵ' not in first[s]: break
                                else:
                                    first_rest.add('ϵ')
                                
                                antes = len(follow[symbol])
                                follow[symbol].update(first_rest - {'ϵ'})
                                if 'ϵ' in first_rest:
                                    follow[symbol].update(follow[head])
                                if len(follow[symbol]) > antes: changed = True
                                        
        return follow

    def closure(self, items):
        """Calcula la cerradura de un conjunto de items (Soporta LR0 y LR1 de forma estricta)"""
        closure_set = set(items)
        changed = True
        is_lr1 = self.parser_type in ["LR(1)", "LALR(1)"]

        while changed:
            changed = False
            new_items = set()
            
            for item in list(closure_set):
                head = item[0]
                body = item[1]
                dot = item[2]
                la = item[3] if len(item) == 4 else '$'
                
                if dot < len(body) and body[dot] in self.non_terminals:
                    B = body[dot]
                    if is_lr1:
                        beta = body[dot+1:]
                        first_beta_la = self._compute_first_of_sequence(list(beta) + [la])
                        for prod in self.rules[B]:
                            for b_terminal in first_beta_la:
                                if b_terminal != 'ϵ':
                                    new_item = (B, tuple(prod), 0, b_terminal)
                                    if new_item not in closure_set and new_item not in new_items:
                                        new_items.add(new_item)
                                        changed = True
                    else:
                        for prod in self.rules[B]:
                            new_item = (B, tuple(prod), 0)
                            if new_item not in closure_set and new_item not in new_items:
                                new_items.add(new_item)
                                changed = True
                                
            closure_set.update(new_items)
        return frozenset(closure_set)

    def _compute_first_of_sequence(self, sequence):
        """Calcula el conjunto FIRST real de una secuencia de símbolos combinados para LR(1)"""
        first_set = set()
        
        # Primero, asegúrate de tener los FIRST individuales actualizados
        # Podemos reusar parte de tu lógica dinámica de primeros
        first_dict = {nt: set() for nt in self.non_terminals}
        changed = True
        while changed:
            changed = False
            for head, productions in self.rules.items():
                for prod in productions:
                    if not prod:
                        if 'ϵ' not in first_dict[head]:
                            first_dict[head].add('ϵ')
                            changed = True
                    else:
                        for symbol in prod:
                            if symbol in self.terminals:
                                if symbol not in first_dict[head]:
                                    first_dict[head].add(symbol)
                                    changed = True
                                break
                            else:
                                antes = len(first_dict[head])
                                first_dict[head].update(first_dict[symbol] - {'ϵ'})
                                if len(first_dict[head]) > antes: changed = True
                                if 'ϵ' not in first_dict[symbol]: break
                        else:
                            if 'ϵ' not in first_dict[head]:
                                first_dict[head].add('ϵ')
                                changed = True

        # Ahora evaluamos la secuencia exacta del ítem LR(1)
        for symbol in sequence:
            if symbol in self.terminals:
                first_set.add(symbol)
                break
            else:
                # Añade el FIRST del no terminal (restando epsilon temporalmente)
                first_set.update(first_dict[symbol] - {'ϵ'})
                # Si el No Terminal no puede ser vacío (epsilon), la cadena de anticipación se corta acá
                if 'ϵ' not in first_dict[symbol]:
                    break
        else:
            # Si todos los elementos de la secuencia se anularon, epsilon es parte del FIRST
            first_set.add('ϵ')
            
        return first_set

    def goto(self, items, symbol):
        """Calcula la transición GOTO para un símbolo"""
        goto_set = set()
        is_lr1 = self.parser_type in ["LR(1)", "LALR(1)"]
        
        for item in items:
            head, body, dot = item[0], item[1], item[2]
            la = item[3] if len(item) == 4 else '$'
            
            if dot < len(body) and body[dot] == symbol:
                if is_lr1:
                    goto_set.add((head, body, dot + 1, la))
                else:
                    goto_set.add((head, body, dot + 1))
                    
        return self.closure(goto_set)

    def build_automaton(self):
        """Construye el autómata de estados dinámicamente según el algoritmo configurado"""
        is_lr1_mode = self.parser_type in ["LR(1)", "LALR(1)"]
        
        if is_lr1_mode:
            initial_item = (self.start_symbol, tuple(self.rules[self.start_symbol][0]), 0, '$')
        else:
            initial_item = (self.start_symbol, tuple(self.rules[self.start_symbol][0]), 0)
            
        state_0 = self.closure([initial_item])
        self.states = [state_0]
        transitions = {}
        
        queue = [0]
        while queue:
            current_state_id = queue.pop(0)
            current_items = self.states[current_state_id]
            
            symbols_after_dot = set()
            for item in current_items:
                body = item[1]
                dot = item[2]
                if dot < len(body):
                    symbols_after_dot.add(body[dot])
            
            for symbol in symbols_after_dot:
                next_state_items = self.goto(current_items, symbol)
                if not next_state_items: continue
                
                if next_state_items not in self.states:
                    self.states.append(next_state_items)
                    new_state_id = len(self.states) - 1
                    queue.append(new_state_id)
                else:
                    new_state_id = self.states.index(next_state_items)
                
                transitions[(current_state_id, symbol)] = new_state_id

        if self.parser_type == "LALR(1)":
            transitions = self._compress_to_lalr(transitions)

        return transitions

    def _compress_to_lalr(self, old_transitions):
        """Fusiona los estados que tienen núcleos idénticos en LALR(1)"""
        def get_core(state_items):
            return frozenset((item[0], item[1], item[2]) for item in state_items)
            
        cores = {}
        for idx, state in enumerate(self.states):
            core = get_core(state)
            if core not in cores: 
                cores[core] = []
            cores[core].append(idx)
            
        old_to_new = {}
        new_states = []
        for new_idx, (core, old_indices) in enumerate(cores.items()):
            merged_items = set()
            for old_idx in old_indices:
                old_to_new[old_idx] = new_idx
                for item in self.states[old_idx]:
                    la = item[3] if len(item) == 4 else '$'
                    merged_items.add((item[0], item[1], item[2], la))
            new_states.append(frozenset(merged_items))
            
        self.states = new_states
        
        new_transitions = {}
        for (old_state, symbol), old_target in old_transitions.items():
            new_src = old_to_new[old_state]
            new_tgt = old_to_new[old_target]
            new_transitions[(new_src, symbol)] = new_tgt
            
        return new_transitions

    def get_frontend_table(self):
        """Genera la estructura de tabla Action/Goto unificada y limpia"""
        transitions = self.build_automaton()
        state_indices = list(range(len(self.states)))
        action = {i: {} for i in state_indices}
        goto_table = {i: {} for i in state_indices}
        
        # 1. Llenar Shifts y Gotos
        for (state_id, symbol), target_state in transitions.items():
            if symbol in self.terminals:
                action[state_id][symbol] = f"s{target_state}"
            elif symbol in self.non_terminals:
                goto_table[state_id][symbol] = str(target_state)

        # 2. Llenar Reduces según la estrategia del algoritmo
        follows_dict = self.compute_first_and_follow() if self.parser_type == "SLR(1)" else {}

        for state_id, items in enumerate(self.states):
            for item in items:
                head = item[0]
                body = item[1]
                dot = item[2]
                
                if dot == len(body):
                    if head == self.start_symbol:
                        action[state_id]['$'] = 'acc'
                    else:
                        rule_index = self.indexed_rules.index((head, list(body))) + 1
                        
                        if self.parser_type == "LR(0)":
                            for t in self.terminals:
                                action[state_id][t] = action[state_id].get(t, "") + (f"/r{rule_index}" if action[state_id].get(t) else f"r{rule_index}")
                                
                        elif self.parser_type == "SLR(1)":
                            valid_las = follows_dict.get(head, set())
                            for t in self.terminals:
                                if t in valid_las:
                                    action[state_id][t] = action[state_id].get(t, "") + (f"/r{rule_index}" if action[state_id].get(t) else f"r{rule_index}")
                                    
                        elif self.parser_type in ["LR(1)", "LALR(1)"]:
                            la = item[3] if len(item) == 4 else '$'
                            if la in self.terminals:
                                action[state_id][la] = action[state_id].get(la, "") + (f"/r{rule_index}" if action[state_id].get(la) else f"r{rule_index}")

        display_non_terminals = [nt for nt in self.non_terminals if nt != self.start_symbol]

        return {
            "type": self.parser_type.replace("(","").replace(")",""),
            "states": state_indices,
            "terminals": self.terminals,
            "non_terminals": display_non_terminals,
            "action": action,
            "goto": goto_table
        }

    def parse_input(self, input_str):
        """
        Simula la validación paso a paso de la familia LR.
        Captura errores sintácticos de forma elegante devolviendo un árbol parcial,
        las coordenadas de la celda de falla y los pasos detallados.
        """
        # Tokenizador reparado: separa caracteres especiales sin romper palabras clave como 'id'
        cleaned_str = input_str.replace('(', ' ( ').replace(')', ' ) ').replace('=', ' = ').replace('*', ' * ').replace('+', ' + ')
        tokens = cleaned_str.split() + ['$']
        
        table_data = self.get_frontend_table()
        action_table = table_data["action"]
        goto_table = table_data["goto"]
        
        state_stack = [0]
        symbol_stack = ['$']
        tree_stack = []
        
        curr_input = list(tokens)
        steps = []
        n = 1
        
        # Flags y variables de control de error
        has_error = False
        error_cell = None
        
        while True:
            if n > 200:
                # Salvaguarda contra bucles infinitos en gramáticas mal diseñadas
                has_error = True
                error_cell = {"state": state_stack[-1], "symbol": curr_input[0], "msg": "Bucle infinito evitado."}
                break
                
            current_state = state_stack[-1]
            focus = curr_input[0]
            
            # Reconstrucción visual de la pila de control para el frontend (Ej: $ 0 id 5)
            visual_stack = []
            for sym, st in zip(symbol_stack, state_stack):
                if sym != '$': visual_stack.append(sym)
                visual_stack.append(str(st))
            
            step_entry = {
                "n": n,
                "stack": " ".join(visual_stack),
                "input": " ".join(curr_input),
                "action": "",
                "detail": ""
            }
            
            # Obtener acción desde la tabla predictiva generada
            act = action_table.get(current_state, {}).get(focus)
            
            # 🌟 DETECCIÓN DE ERROR SINTÁCTICO: Celda vacía o nula
            if not act or act.strip() == "":
                has_error = True
                error_cell = {
                    "state": current_state,
                    "symbol": focus,
                    "msg": f"Error de sintaxis: Celda vacía en Estado {current_state} con el token '{focus}'"
                }
                step_entry.update({
                    "action": "Error",
                    "detail": f"Error Sintáctico: Símbolo '{focus}' no esperado."
                })
                steps.append(step_entry)
                break
                
            real_act = act.split('/')[0] if '/' in act else act
            
            # Operación SHIFT (Desplazamiento)
            if real_act.startswith('s'):
                next_state = int(real_act[1:])
                step_entry.update({"action": "Shift", "detail": f"al estado {next_state}"})
                symbol_stack.append(focus)
                state_stack.append(next_state)
                # Creamos una hoja en la pila de árboles
                tree_stack.append({"label": focus, "children": []})
                curr_input.pop(0)
                
            # Operación REDUCE (Reducción)
            elif real_act.startswith('r'):
                rule_idx = int(real_act[1:]) - 1
                head, body = self.indexed_rules[rule_idx]
                step_entry.update({"action": "Reduce", "detail": f"{head} → {' '.join(body) if body else 'ϵ'}"})
                
                pop_count = len(body)
                children_nodes = []
                
                # Desapilamos tantos estados y símbolos como elementos tenga el cuerpo de la regla
                for _ in range(pop_count):
                    if state_stack: state_stack.pop()
                    if symbol_stack: symbol_stack.pop()
                    if tree_stack:
                        children_nodes.insert(0, tree_stack.pop())
                
                top_state = state_stack[-1]
                next_state_str = goto_table.get(top_state, {}).get(head)
                
                # Falla crítica en la configuración de la tabla GOTO
                if not next_state_str:
                    has_error = True
                    error_cell = {"state": top_state, "symbol": head, "msg": "Falla en la transición GOTO."}
                    step_entry.update({"action": "Error", "detail": f"Falla Crítica GOTO en Estado {top_state}"})
                    steps.append(step_entry)
                    break
                
                next_state = int(next_state_str)
                symbol_stack.append(head)
                state_stack.append(next_state)
                # Consolidamos el subárbol colocando el No Terminal como padre
                tree_stack.append({"label": head, "children": children_nodes})
                
            # Cadena Aceptada con Éxito
            elif real_act == 'acc':
                step_entry.update({"action": "Accept", "detail": "✓ Cadena aceptada"})
                steps.append(step_entry)
                break
            else:
                has_error = True
                error_cell = {"state": current_state, "symbol": focus, "msg": "Acción desconocida."}
                break
                
            steps.append(step_entry)
            n += 1
            
        # 🌟 CONSTRUCCIÓN DEL ÁRBOL EN CASO DE ERROR
        # Si la cadena falló, recolectamos lo que se llegó a armar en la pila 
        # y lo unimos bajo un nodo raíz ficticio con una cruz '✗' para que React dibuje el colapso.
        if has_error:
            error_children = list(tree_stack)
            # Agregamos el token conflictivo que causó el colapso de la pila
            if curr_input and curr_input[0] != '$':
                error_children.append({"label": curr_input[0], "children": [{"label": "✗", "children": []}]})
            else:
                error_children.append({"label": "✗", "children": []})
                
            root_tree = {
                "label": self.start_symbol if self.start_symbol else "S'",
                "children": error_children
            }
        else:
            root_tree = tree_stack[0] if tree_stack else {}
            
        return {
            "success": not has_error,
            "error_cell": error_cell,
            "steps": steps,
            "tree": root_tree
        }