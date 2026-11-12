
# =========================================
# IMPORTAÇÃO DAS BIBLIOTECAS
# Importa o Flask e os Blueprints responsáveis
# pelas diferentes páginas do site.
# =========================================

from flask import Flask
from backend.Index.Index import Index_bp
from backend.Servicos.Servicos import Servicos_bp
from backend.Agendamento.Agendamento import Agendamento_bp

# =========================================
# CONFIGURAÇÃO DA APLICAÇÃO
# Cria a aplicação Flask e define as pastas
# que armazenam os arquivos HTML e estáticos.
# =========================================

app = Flask(
    __name__,
    template_folder="frontend",
    static_folder="static"
)

# =========================================
# REGISTRO DAS ROTAS
# Conecta os Blueprints à aplicação principal,
# permitindo acessar as páginas do site.
# =========================================

app.register_blueprint(Index_bp)
app.register_blueprint(Servicos_bp, url_prefix="/servicos")
app.register_blueprint(Agendamento_bp, url_prefix="/agendamento")

# =========================================
# INICIALIZAÇÃO DO SERVIDOR
# Executa a aplicação localmente na porta 8080.
# O modo debug facilita identificar erros
# durante o desenvolvimento.
# =========================================

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=8080,
        debug=True
    )