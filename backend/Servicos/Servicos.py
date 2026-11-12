# =========================================
# IMPORTAÇÃO DAS BIBLIOTECAS
# Importa os recursos necessários para criar as rotas
# e exibir a página HTML de Serviços.
# =========================================

from flask import Blueprint, render_template

# =========================================
# BLUEPRINT DE SERVIÇOS
# Agrupa as rotas relacionadas à página de
# serviços, facilitando a organização do projeto.
# =========================================

Servicos_bp = Blueprint("Servicos", __name__)

# =========================================
# ROTA DA PÁGINA DE SERVIÇOS
# Exibe a tela de serviços do salão de beleza.
# =========================================

@Servicos_bp.route("/")
def Servicos_home():
    return render_template("Servicos/Servicos.html")