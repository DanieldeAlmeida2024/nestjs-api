import unittest
from pathlib import Path
R=Path(__file__).resolve().parents[1]
class TestesDocumentacao(unittest.TestCase):
    def test_arquivos(self):
        for nome in ('README.md','AGENTS.md','docs/REQUISITOS.md','docs/ARQUITETURA.md','docs/UML.puml','docs/PLANO_TESTES.md'):
            with self.subTest(nome=nome): self.assertTrue((R/nome).is_file())
    def test_plantuml(self):
        texto=(R/'docs/UML.puml').read_text(encoding='utf-8')
        self.assertIn('@startuml',texto);self.assertIn('@enduml',texto)
