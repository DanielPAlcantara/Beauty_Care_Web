/* =====================================================
   Agendamento.js
   CRUD no cliente + validações + busca, filtro e ordenação
   ===================================================== */

// ---------- Estado da aplicação ----------
// Guarda os agendamentos em memória, controla o próximo ID, a edição e a ordenação da tabela.
let registros = [];
let proximoId = 1;
let idEmEdicao = null;                        // null = adicionando; número = editando
let ordem = { campo: 'data', direcao: 1 };    // 1 = crescente, -1 = decrescente

// Lista dos campos que serão lidos e validados ao enviar o formulário.
const CAMPOS = ['nome', 'telefoneFixo', 'celular', 'email',
                'servico', 'data', 'horario', 'observacoes'];

// ---------- Elementos da página ----------
// Seleciona os elementos do HTML que serão consultados ou atualizados pelo JavaScript.
const form = document.getElementById('formAgendamento');
const lista = document.getElementById('lista');
const botaoSalvar = form.querySelector('button[type="submit"]');
const busca = document.getElementById('busca');
const filtroServico = document.getElementById('filtroServico');
const contador = document.getElementById('contador');
const cabecalhos = document.querySelectorAll('th[data-ordem]');

// Copia as opções de serviço do formulário para o filtro da tabela
[...form.elements.servico.options]
  .filter(opcao => opcao.value)
  .forEach(opcao => filtroServico.add(new Option(opcao.textContent, opcao.value)));

// ---------- Funções auxiliares ----------
// Pequenas funções reutilizadas na validação e na apresentação dos registros.

// Converte "corte-feminino" em "Corte feminino" usando o texto do <option>
function nomeServico(valor) {
  const opcao = form.elements.servico.querySelector(`option[value="${valor}"]`);
  return opcao ? opcao.textContent : valor;
}

// "2026-11-20" -> "20/11/2026"
function formatarData(iso) {
  return iso.split('-').reverse().join('/');
}

// "2026-11-20" -> objeto Date no fuso local (evita erro de um dia a menos)
function dataLocal(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

// Data de hoje no formato "AAAA-MM-DD"
function hojeISO() {
  const h = new Date();
  const mes = String(h.getMonth() + 1).padStart(2, '0');
  const dia = String(h.getDate()).padStart(2, '0');
  return `${h.getFullYear()}-${mes}-${dia}`;
}

// Cria uma célula da tabela e insere o texto de forma segura, sem interpretar HTML.
function criarTd(texto) {
  const td = document.createElement('td');
  td.textContent = texto;     // textContent evita injetar HTML
  return td;
}

// ---------- Validação ----------
// Expressões regulares usadas para verificar os formatos de nome, telefones e e-mail.

const REGEX_NOME = /^[A-Za-zÀ-ÿ' .-]+$/;
const REGEX_TELEFONE_FIXO = /^\(?\d{2}\)?\s?\d{4}-?\d{4}$/;
const REGEX_CELULAR = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// O navegador não deixa escolher datas passadas no calendário
form.elements.data.min = hojeISO();

// Cria uma caixa de mensagem de erro embaixo de cada campo
const caixasErro = {};
CAMPOS.forEach(campo => {
  const input = form.elements[campo];
  const span = document.createElement('span');
  span.className = 'erro';
  span.id = `erro-${campo}`;
  span.setAttribute('role', 'alert');
  input.closest('.form-group').appendChild(span);
  input.setAttribute('aria-describedby', span.id);
  caixasErro[campo] = span;
});

// Mensagem de sucesso, logo acima do botão
const mensagemForm = document.createElement('p');
mensagemForm.className = 'mensagem-form';
mensagemForm.setAttribute('role', 'status');
botaoSalvar.before(mensagemForm);

// Exibe uma mensagem abaixo do campo e o identifica como inválido para acessibilidade.
function mostrarErro(campo, mensagem) {
  caixasErro[campo].textContent = mensagem;
  form.elements[campo].setAttribute('aria-invalid', 'true');
}

// Remove a mensagem de erro e a indicação de campo inválido.
function limparErro(campo) {
  caixasErro[campo].textContent = '';
  form.elements[campo].removeAttribute('aria-invalid');
}

// Limpa as mensagens de validação de todos os campos do formulário.
function limparTodosErros() {
  CAMPOS.forEach(limparErro);
}

// Regra de duplicidade: mesma data e mesmo horário (ignora o registro em edição)
function existeDuplicado(dados) {
  return registros.some(r =>
    r.id !== idEmEdicao && r.data === dados.data && r.horario === dados.horario);
}

// Recebe os dados do formulário e devolve um objeto { campo: 'mensagem' } com os erros
function validar(dados) {
  const erros = {}; // Reúne as mensagens de cada campo que não passou na validação.

  // Nome
  if (!dados.nome) {
    erros.nome = 'Informe seu nome.';
  } else if (dados.nome.length < 3) {
    erros.nome = 'O nome precisa ter pelo menos 3 letras.';
  } else if (!REGEX_NOME.test(dados.nome)) {
    erros.nome = 'O nome não pode conter números ou símbolos.';
  }

  // Telefone fixo (opcional, mas se preenchido precisa ter formato válido)
  if (dados.telefoneFixo && !REGEX_TELEFONE_FIXO.test(dados.telefoneFixo)) {
    erros.telefoneFixo = 'Telefone inválido. Use o formato (27) 3333-3333.';
  }

  // Celular
  if (!dados.celular) {
    erros.celular = 'Informe seu celular.';
  } else if (!REGEX_CELULAR.test(dados.celular)) {
    erros.celular = 'Celular inválido. Use o formato (27) 99999-9999.';
  }

  // E-mail
  if (!dados.email) {
    erros.email = 'Informe seu e-mail.';
  } else if (!REGEX_EMAIL.test(dados.email)) {
    erros.email = 'Informe um e-mail válido, como nome@exemplo.com.';
  }

  // Serviço
  if (!dados.servico) {
    erros.servico = 'Selecione um serviço.';
  }

  // Data
  if (!dados.data) {
    erros.data = 'Escolha a data do atendimento.';
  } else {
    const escolhida = dataLocal(dados.data);
    const hoje = dataLocal(hojeISO());

    if (escolhida < hoje) {
      erros.data = 'Não é possível agendar em uma data que já passou.';
    } else if (escolhida.getDay() === 0) {
      erros.data = 'Não atendemos aos domingos. Escolha outra data.';
    }
  }

  // Horário (algumas regras dependem da data escolhida)
  if (!dados.horario) {
    erros.horario = 'Selecione um horário.';
  } else if (dados.data && !erros.data) {
    const hora = parseInt(dados.horario, 10);
    const escolhida = dataLocal(dados.data);

    if (escolhida.getDay() === 6 && hora >= 17) {
      erros.horario = 'Aos sábados o atendimento vai até as 17h. Escolha um horário até 16:00 - 17:00.';
    } else if (dados.data === hojeISO() && hora <= new Date().getHours()) {
      erros.horario = 'Esse horário de hoje já passou. Escolha um horário posterior.';
    } else if (existeDuplicado(dados)) {
      erros.horario = `Já existe um agendamento em ${formatarData(dados.data)} às ${dados.horario}. Escolha outro horário.`;
    }
  }

  // Devolve as mensagens encontradas; se estiver vazio, os dados passaram nas verificações.
  return erros;
}

// Some a mensagem de erro assim que a pessoa corrige o campo
CAMPOS.forEach(campo => {
  form.elements[campo].addEventListener('input', () => {
    limparErro(campo);
    if (campo === 'data') limparErro('horario');   // o horário depende da data
  });
});

// ---------- Consulta e organização ----------
// As funções abaixo preparam a lista exibida de acordo com os controles da página.

// Valor usado para comparar dois registros na ordenação
function valorOrdenacao(r, campo) {
  if (campo === 'data') return r.data + ' ' + r.horario;
  if (campo === 'servico') return nomeServico(r.servico);
  return r[campo];
}

// Aplica busca, filtro e ordenação sem alterar o array original
function obterVisiveis() {
  const termo = busca.value.trim().toLowerCase(); // Ignora espaços nas pontas e diferenças entre maiúsculas e minúsculas.

  // Primeiro filtra pelo serviço, depois pelo texto pesquisado e, por fim, ordena.
  return registros
    .filter(r => !filtroServico.value || r.servico === filtroServico.value)
    .filter(r => [r.nome, r.celular, r.email, nomeServico(r.servico)]
      .join(' ').toLowerCase().includes(termo))
    .sort((a, b) =>
      valorOrdenacao(a, ordem.campo)
        .localeCompare(valorOrdenacao(b, ordem.campo), 'pt-BR') * ordem.direcao);
}

// ---------- Renderização (READ) ----------
// Reconstrói as linhas da tabela sempre que os dados, filtros ou a ordenação mudam.

function renderizar() {
  const visiveis = obterVisiveis();
  lista.innerHTML = ''; // Remove as linhas antigas antes de mostrar os resultados atuais.

  // Exibe uma linha informativa quando não há agendamentos ou nenhum corresponde à busca.
  if (visiveis.length === 0) {
    const linha = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'vazio';
    td.textContent = registros.length === 0
      ? 'Nenhum agendamento registrado.'
      : 'Nenhum resultado para o filtro aplicado.';
    linha.appendChild(td);
    lista.appendChild(linha);
  }

  // Cria uma linha para cada agendamento visível, incluindo seus dados e botões de ação.
  visiveis.forEach(r => {
    const linha = document.createElement('tr');

    linha.appendChild(criarTd(r.nome));

    const tdServico = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = nomeServico(r.servico);
    tdServico.appendChild(badge);
    linha.appendChild(tdServico);

    linha.appendChild(criarTd(formatarData(r.data)));
    linha.appendChild(criarTd(r.horario));
    linha.appendChild(criarTd(r.celular));

    // Cada botão recebe o ID do registro para identificar qual agendamento editar ou cancelar.
    const tdAcoes = document.createElement('td');
    tdAcoes.innerHTML = `
      <button type="button" class="btn-tabela btn-editar" data-acao="editar" data-id="${r.id}">Editar</button>
      <button type="button" class="btn-tabela" data-acao="excluir" data-id="${r.id}">Cancelar</button>`;
    linha.appendChild(tdAcoes);

    lista.appendChild(linha);
  });

  // Informa quantos registros aparecem na tabela e quantos existem no total.
  contador.textContent = `Mostrando ${visiveis.length} de ${registros.length} agendamento(s)`;

  // Atualiza a setinha (↑ ↓) do cabeçalho da coluna ordenada
  cabecalhos.forEach(th => {
    const ativo = th.dataset.ordem === ordem.campo;
    th.setAttribute('aria-sort',
      !ativo ? 'none' : (ordem.direcao === 1 ? 'ascending' : 'descending'));
  });
}

// ---------- CRUD ----------

// Volta o formulário ao modo de cadastro, restaurando o texto original do botão.
function sairDoModoEdicao() {
  idEmEdicao = null;
  botaoSalvar.textContent = 'Enviar solicitação';
}

// Envia todos os registros para a rota Flask, que grava os dados no arquivo JSON.
// O await permite esperar a resposta e detectar falhas HTTP antes de confirmar a operação.
async function salvarNoServidor() {
    const resposta = await fetch('/agendamento/salvar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(registros)
    });

    if (!resposta.ok) {
        throw new Error('Erro ao salvar os agendamentos.');
    }
}

// CREATE e UPDATE: o mesmo formulário serve para os dois
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // Impede que o formulário recarregue a página ao ser enviado.
  mensagemForm.textContent = '';
  limparTodosErros();

  // Lê os valores preenchidos e remove espaços extras no início e no fim.
  const dados = {};
  CAMPOS.forEach(campo => {
    dados[campo] = form.elements[campo].value.trim();
  });

  // Validação: se houver erro, mostra as mensagens e interrompe o envio
  const erros = validar(dados);
  const camposComErro = CAMPOS.filter(campo => erros[campo]);

  if (camposComErro.length > 0) {
    camposComErro.forEach(campo => mostrarErro(campo, erros[campo]));
    form.elements[camposComErro[0]].focus();
    return;
  }

  // Verifica se o formulário está criando um novo agendamento ou alterando um existente.
  const estavaEditando = idEmEdicao !== null;

  if (!estavaEditando) {
    registros.push({ id: proximoId++, ...dados });                    // CREATE
  } else {
    Object.assign(registros.find(r => r.id === idEmEdicao), dados);   // UPDATE
    sairDoModoEdicao();
  }

  // Tenta persistir as alterações no JSON antes de mostrar a confirmação ao usuário.
  try {
    await salvarNoServidor();
  } catch (erro) {
        mensagemForm.textContent = 'Erro ao salvar no servidor.';
        console.error(erro);
        return;
  }

  // Limpa o formulário, informa o resultado e atualiza a tabela sem recarregar a página.
  form.reset();
  mensagemForm.textContent = estavaEditando
    ? 'Agendamento atualizado com sucesso!'
    : 'Agendamento solicitado com sucesso!';
  renderizar();
});

// DELETE e início da edição: um único listener para todos os botões da tabela
lista.addEventListener('click', async (e) => {
  // Identifica qual botão da tabela foi clicado, mesmo quando há vários registros.
  const botao = e.target.closest('button');
  if (!botao) return;
  const id = Number(botao.dataset.id);

  // Exclui o registro após confirmação e envia a lista atualizada ao servidor.
  if (botao.dataset.acao === 'excluir') {
    if (confirm('Deseja cancelar este agendamento?')) {
        registros = registros.filter(r => r.id !== id);

        if (idEmEdicao === id) {
            form.reset();
            limparTodosErros();
            sairDoModoEdicao();
        }

        try {
            await salvarNoServidor();
            renderizar();
        } catch (erro) {
            console.error(erro);
            alert('Erro ao salvar a exclusão no servidor.');
        }
    }
  }

  // Preenche o formulário com os dados do registro escolhido para permitir sua edição.
  if (botao.dataset.acao === 'editar') {
    const r = registros.find(x => x.id === id);
    limparTodosErros();
    mensagemForm.textContent = '';
    CAMPOS.forEach(campo => { form.elements[campo].value = r[campo]; });
    idEmEdicao = id;
    botaoSalvar.textContent = 'Salvar alterações';
    form.scrollIntoView({ behavior: 'smooth' });
  }
});

// ---------- Eventos de busca, filtro e ordenação ----------
// Atualiza a tabela imediatamente quando a pessoa pesquisa ou seleciona um serviço.

busca.addEventListener('input', renderizar);
filtroServico.addEventListener('change', renderizar);

// Ao clicar em um cabeçalho, escolhe a coluna; clicar novamente inverte a direção.
cabecalhos.forEach(th => {
  th.addEventListener('click', () => {
    const campo = th.dataset.ordem;
    ordem = {
      campo,
      direcao: ordem.campo === campo ? -ordem.direcao : 1   // clicar de novo inverte
    };
    renderizar();
  });
});

// ---------- Carregamento dos agendamentos pelo JSON ----------
// Prepara uma mensagem que informa o andamento da leitura do arquivo no servidor.

const mensagemFetch = document.createElement('div');
mensagemFetch.className = 'mensagem-fetch';
mensagemFetch.setAttribute('role', 'status');

// Guarda o texto da mensagem separadamente para não apagar o botão de fechar.
const textoFetch = document.createElement('span');

// Cria o botão X para permitir que a pessoa dispense a mensagem de carregamento.
const fecharFetch = document.createElement('button');
fecharFetch.type = 'button';
fecharFetch.className = 'fechar-fetch';
fecharFetch.textContent = '×';
fecharFetch.setAttribute('aria-label', 'Fechar mensagem');

// Ao clicar no X, remove a mensagem da página sem alterar os agendamentos.
fecharFetch.addEventListener('click', () => {
    mensagemFetch.remove();
});

mensagemFetch.append(textoFetch, fecharFetch);
lista.closest('table').before(mensagemFetch);

// Busca o JSON com fetch/async-await, carrega os registros e trata sucesso ou erro.
async function carregarAgendamentos() {
  textoFetch.textContent = 'Carregando agendamentos...';
  mensagemFetch.className = 'mensagem-fetch carregando';

  try {
    // Solicita ao servidor o arquivo com os agendamentos já cadastrados.
    const resposta = await fetch('/static/data/dados.json');

    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`);
    }

    // Converte a resposta para um array de objetos JavaScript.
    const dados = await resposta.json();

    // Confere se o conteúdo recebido tem o formato esperado pela aplicação.
    if (!Array.isArray(dados)) {
        throw new Error('O JSON deve conter uma lista de agendamentos.');
    }

    // Coloca os agendamentos carregados no array do CRUD.
    registros = dados;

    // Evita repetir IDs ao criar novos agendamentos.
    proximoId = Math.max(0, ...registros.map(r => r.id)) + 1;

    // Atualiza a tabela sem recarregar a página.
    renderizar();

    // Exibe a quantidade de registros carregados quando a leitura termina corretamente.
    textoFetch.textContent =
      `${registros.length} agendamentos carregados com sucesso!`;
    mensagemFetch.className = 'mensagem-fetch sucesso';

  } catch (erro) {
    // Informa ao usuário se o arquivo não puder ser carregado ou tiver conteúdo inválido.
    console.error('Erro ao carregar agendamentos:', erro);

    textoFetch.textContent =
      `Não foi possível carregar os agendamentos: ${erro.message}`;
    mensagemFetch.className = 'mensagem-fetch erro';

    renderizar();
  }
}

// Executa o carregamento ao abrir a página.
carregarAgendamentos();

// ---------- Início ----------
// Mostra a estrutura inicial da tabela enquanto o carregamento assíncrono acontece.
renderizar();