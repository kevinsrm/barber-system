// =====================================================
// Página de agendamento do site:
// - calcula o resumo dos serviços escolhidos
// - busca no servidor os horários livres do profissional
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-agendamento');
  if (!form) return;

  const caixasServicos = Array.from(form.querySelectorAll('input[name="servicos"]'));
  const seletorFuncionario = form.querySelector('[name="funcionarioId"]');
  const campoData = form.querySelector('[name="data"]');
  const seletorHora = form.querySelector('[name="hora"]');
  const aviso = document.getElementById('aviso-horarios');
  const horaPreSelecionada = form.dataset.horaSelecionada || '';
  const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function atualizarResumo() {
    const escolhidos = caixasServicos.filter((caixa) => caixa.checked);
    const total = escolhidos.reduce((soma, caixa) => soma + Number(caixa.dataset.preco), 0);
    const duracao = escolhidos.reduce((soma, caixa) => soma + Number(caixa.dataset.duracao), 0);

    document.getElementById('resumo-quantidade').textContent = escolhidos.length;
    document.getElementById('resumo-duracao').textContent = duracao + ' min';
    document.getElementById('resumo-total').textContent = dinheiro.format(total);
    document.getElementById('contador-servicos').textContent = escolhidos.length + ' selecionado(s)';

    return escolhidos.map((caixa) => caixa.value);
  }

  async function carregarHorarios() {
    const servicos = caixasServicos.filter((caixa) => caixa.checked).map((caixa) => caixa.value);
    const horaAtual = seletorHora.value;

    if (!servicos.length || !seletorFuncionario.value || !campoData.value) {
      seletorHora.innerHTML = '<option value="">Escolha data e profissional</option>';
      aviso.textContent = 'Selecione serviços, profissional e data para ver os horários livres.';
      return;
    }

    aviso.textContent = 'Carregando horários...';
    seletorHora.disabled = true;

    try {
      const url = `/agendar/horarios?servico=${servicos.join(',')}&funcionarioId=${seletorFuncionario.value}&data=${campoData.value}`;
      const resposta = await fetch(url);
      const dados = await resposta.json();

      seletorHora.innerHTML = '<option value="">Selecione o horário</option>';
      dados.horarios.forEach((horario) => {
        const opcao = document.createElement('option');
        opcao.value = horario;
        opcao.textContent = horario;
        seletorHora.appendChild(opcao);
      });

      // Mantém o horário escolhido (ou o que veio do formulário anterior)
      if (horaAtual && dados.horarios.includes(horaAtual)) {
        seletorHora.value = horaAtual;
      } else if (horaPreSelecionada && dados.horarios.includes(horaPreSelecionada)) {
        seletorHora.value = horaPreSelecionada;
      }

      if (dados.horarios.length) {
        aviso.textContent = `${dados.horarios.length} horário(s) disponível(is) para este dia.`;
      } else {
        aviso.textContent = dados.mensagem || 'Nenhum horário livre. Tente outra data.';
      }
    } catch (erro) {
      seletorHora.innerHTML = '<option value="">Erro ao carregar</option>';
      aviso.textContent = 'Não foi possível carregar os horários. Tente novamente.';
    } finally {
      seletorHora.disabled = false;
    }
  }

  caixasServicos.forEach((caixa) => {
    caixa.addEventListener('change', () => { atualizarResumo(); carregarHorarios(); });
  });
  seletorFuncionario.addEventListener('change', carregarHorarios);
  campoData.addEventListener('change', carregarHorarios);

  // Ao abrir a página com serviço pré-selecionado, já mostra o resumo
  atualizarResumo();
  if (caixasServicos.some((caixa) => caixa.checked) && seletorFuncionario.value && campoData.value) {
    carregarHorarios();
  }
});
