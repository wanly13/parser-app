from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import re

app = FastAPI(title="Parser LL(1) API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ParseRequest(BaseModel):
    grammar: str
    input: str

class GrammarAnalyzer:
    def __init__(self, grammar_text: str):
        self.non_terminals = []
        self.terminals = []
        self.start_symbol = None
        self.rules = {}  # { 'E': [['T', "E'"], ...] }
        self.first = {}
        self.follow = {}
        self.table = {}
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
                            # Mirar lo que sigue al símbolo
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

    def parse_input(self, input_str):
        # Tokenización básica (separa paréntesis y espacios)
        tokens = input_str.replace('(', ' ( ').replace(')', ' ) ').split() + ['$']
        
        # Nodo raíz para el árbol
        root = {"label": self.start_symbol, "children": []}
        
        # La pila guarda tuplas: (símbolo_string, referencia_al_nodo_del_árbol)
        stack = [('$', None), (self.start_symbol, root)]
        
        curr_input = list(tokens)
        steps = []
        n = 1

        while stack:
            # Extraemos el símbolo y su nodo asociado en el árbol
            top_symbol, current_node = stack.pop()
            focus = curr_input[0]
            
            # Preparamos el símbolo de la pila para el log de 'steps'
            # Reconstruimos la pila visual (solo strings) para el JSON
            visual_stack = [s for s, node in stack]
            visual_stack.append(top_symbol)

            step_entry = {
                "n": n,
                "stack": " ".join(visual_stack),
                "input": " ".join(curr_input),
                "action": "",
                "detail": ""
            }

            if top_symbol == focus:
                if top_symbol == '$':
                    step_entry.update({"action": "Accept", "detail": "✓"})
                    steps.append(step_entry)
                    break
                
                step_entry.update({"action": "Match", "detail": top_symbol})
                curr_input.pop(0)
                # Al ser match, el nodo ya existe y no tiene hijos (es hoja)
                
            elif top_symbol in self.non_terminals:
                prod = self.table[top_symbol].get(focus)
                if prod:
                    step_entry.update({"action": "Predict", "detail": f"{top_symbol} → {' '.join(prod)}"})
                    
                    # Crear nodos hijos en el árbol
                    child_nodes = []
                    for s in prod:
                        child = {"label": s, "children": []}
                        child_nodes.append(child)
                    
                    # Conectar hijos al nodo actual
                    current_node["children"] = child_nodes
                    
                    # Meter a la pila en orden inverso para procesamiento LL(1)
                    for i in range(len(prod) - 1, -1, -1):
                        symbol_to_push = prod[i]
                        if symbol_to_push != 'ϵ':
                            stack.append((symbol_to_push, child_nodes[i]))
                else:
                    raise Exception(f"Error de sintaxis: No se esperaba '{focus}' para el no terminal '{top_symbol}'")
            else:
                raise Exception(f"Error: El tope de la pila '{top_symbol}' no coincide con '{focus}'")
            
            steps.append(step_entry)
            n += 1

        return steps, root

    def get_formatted_table(self):
        cells = {}
        for nt, mapping in self.table.items():
            cells[nt] = {t: " ".join(p) for t, p in mapping.items()}
        return {"type": "LL1", "non_terminals": self.non_terminals, "terminals": self.terminals, "cells": cells}

@app.post("/parse/ll1")
async def parse_ll1(data: ParseRequest):
    try:
        analyzer = GrammarAnalyzer(data.grammar)
        steps, tree = analyzer.parse_input(data.input)
        return {
            "valid": True,
            "grammar_info": {
                "start": analyzer.start_symbol,
                "non_terminals": analyzer.non_terminals,
                "terminals": analyzer.terminals,
                "productions": [f"{k} → {' | '.join([' '.join(p) for p in v])}" for k, v in analyzer.rules.items()]
            },
            "steps": steps,
            "table": analyzer.get_formatted_table(),
            "tree": tree,
            "ai_hint": f"Cadena aceptada en {len(steps)} pasos."
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}