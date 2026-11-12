# =========================================
# IMPORTAÇÃO DAS BIBLIOTECAS
# Importa os recursos necessários para criar as rotas
# e exibir a página HTML do Index.
# =========================================

from flask import Blueprint, render_template

# =========================================
# BLUEPRINT DE INDEX
# Agrupa as rotas relacionadas à página de
# index, facilitando a organização do projeto.
# =========================================

Index_bp = Blueprint("Index", __name__)

# =========================================
# ROTA DA PÁGINA DE INDEX
# Exibe a tela inicial do salão de beleza.
# =========================================

@Index_bp.route("/")
def Index_home():
    return render_template("Index/index.html")