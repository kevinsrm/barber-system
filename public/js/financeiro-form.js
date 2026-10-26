// =====================================================
// Formulário de vendas/compras: preenche o preço ao escolher
// o produto e calcula o total em tempo real
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-financeiro');
  if (!form) return;

  const linhas = Array.from(form.querySelectorAll('[data-linha-item]'));
  const totalPreview = document.getElementById('total-preview');
  const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function atualizar() {
    let total = 0;

    linhas.forEach((linha) => {
      const produto = linha.querySelector('[name="produtoId"]');
      const quantidade = Number(linha.querySelector('[name="quantidade"]').value) || 0;
      const preco = Number(linha.querySelector('[name="precoUnitario"]').value) || 0;
      const subtotal = produto.value ? quantidade * preco : 0;

      const celula = linha.querySelector('[data-subtotal]');
      if (celula) celula.textContent = dinheiro.format(subtotal);
      total += subtotal;
    });

    if (totalPreview) totalPreview.textContent = dinheiro.format(total);
  }

  linhas.forEach((linha) => {
    const produto = linha.querySelector('[name="produtoId"]');
    const preco = linha.querySelector('[name="precoUnitario"]');
    const quantidade = linha.querySelector('[name="quantidade"]');

    produto.addEventListener('change', () => {
      const opcao = produto.options[produto.selectedIndex];
      if (opcao && opcao.dataset.preco) {
        preco.value = Number(opcao.dataset.preco).toFixed(2);
      }
      if (!produto.value) {
        preco.value = '';
        quantidade.value = 1;
      }
      atualizar();
    });

    preco.addEventListener('input', atualizar);
    quantidade.addEventListener('input', atualizar);
  });

  atualizar();
});
