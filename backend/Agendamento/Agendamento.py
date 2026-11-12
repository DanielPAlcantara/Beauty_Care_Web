
# =========================================
# IMPORTAÇÃO DAS BIBLIOTECAS
# Importa os recursos necessários para criar as rotas,
# receber dados do JavaScript, trabalhar com arquivos
# JSON e exibir a página HTML de agendamento.
# =========================================

from flask import Blueprint, current_app, json, jsonify, render_template, request
from pathlib import Path

# =========================================
# BLUEPRINT DE AGENDAMENTO
# Agrupa as rotas relacionadas à página de
# agendamentos, facilitando a organização do projeto.
# =========================================

Agendamento_bp = Blueprint("Agendamento", __name__)


# =========================================
# CAMINHO DO ARQUIVO JSON
# Localiza o arquivo dados.json dentro da pasta
# static/data, onde os agendamentos são armazenados.
# =========================================

def caminho_json():
    # Obtém o caminho da pasta static configurada no Flask e acrescenta a localização do arquivo JSON.
    return Path(current_app.static_folder) / 'data' / 'dados.json'


# =========================================
# ROTA DA PÁGINA DE AGENDAMENTO
# Exibe o formulário e a tabela de agendamentos
# quando o usuário acessa a página.
# =========================================

@Agendamento_bp.route("/")
def Agendamento_home():
    # Carrega o arquivo HTML responsável pela página.
    return render_template("Agendamento/Agendamento.html")


# =========================================
# ROTA PARA SALVAR OS AGENDAMENTOS
# Recebe os registros enviados pelo JavaScript
# e atualiza o arquivo dados.json no servidor.
# =========================================

@Agendamento_bp.route("/salvar", methods=["POST"])
def salvar():

    # Recebe os dados enviados pelo JavaScript no formato JSON e os converte para Python.
    dados = request.get_json()

    # Abre o arquivo dados.json em modo de escrita. O modo "w" substitui o conteúdo anterior pelos registros atualizados recebidos do JavaScript.
    with open(caminho_json(), "w", encoding="utf-8") as arquivo:

        # Salva os dados no arquivo JSON. ensure_ascii=False preserva acentos e caracteres especiais. indent=4 organiza o conteúdo com recuo de quatro espaços, facilitando a leitura do arquivo.
        json.dump(dados, arquivo, ensure_ascii=False, indent=4)

    # Envia uma resposta JSON ao JavaScript informando que os agendamentos foram salvos com sucesso.
    return jsonify({"mensagem": "Agendamentos salvos!"})
