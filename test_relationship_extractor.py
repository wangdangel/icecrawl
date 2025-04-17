import sys
import os
# Print sys.path for debugging
print("sys.path:", sys.path)
# Try adding both parent and augmentorium root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'augmentorium')))
from indexer.tree_sitter_relationships import TreeSitterManager

if __name__ == "__main__":
    file_path = "../augmentorium/server/api/api_graph.py"
    output_file = "ast_top_level_nodes_python.txt"
    manager = TreeSitterManager()
    language = manager.detect_language(file_path)
    tree = manager.parse_file(file_path)
    if not tree:
        print("Could not parse file.")
        exit(1)
    print(f"Language detected: {language}")
    code = open(file_path, "r", encoding="utf-8", errors="replace").read()
    root = tree.root_node
    with open(output_file, "w", encoding="utf-8") as out:
        out.write(f"Language detected: {language}\n")
        for child in root.children:
            snippet = code[child.start_byte:child.end_byte][:120].replace("\n", " ")
            out.write(f"{child.type} [{child.start_point} - {child.end_point}]: {snippet}...\n")
    print(f"Wrote top-level AST nodes to {output_file}")
