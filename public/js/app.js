// =====================================================
// Scripts gerais: menu do site, menu do painel e mensagens
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Menu mobile do site ----------
  const botaoMenu = document.getElementById('btn-menu-mobile');
  const menuMobile = document.getElementById('mobile-menu');
  const iconeMenu = document.getElementById('icon-menu');

  if (botaoMenu && menuMobile) {
    botaoMenu.addEventListener('click', () => {
      const aberto = menuMobile.classList.toggle('hidden');
      botaoMenu.setAttribute('aria-expanded', String(!aberto));
      if (iconeMenu) {
        iconeMenu.classList.toggle('bi-list');
        iconeMenu.classList.toggle('bi-x-lg');
      }
    });
  }

  // ---------- Menu lateral do painel ----------
  const botaoSidebar = document.getElementById('btn-sidebar');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  const fecharSidebar = () => {
    if (!sidebar) return;
    sidebar.classList.add('-translate-x-full');
    overlay?.classList.add('hidden');
  };

  if (botaoSidebar && sidebar) {
    botaoSidebar.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
      overlay?.classList.toggle('hidden');
    });
    overlay?.addEventListener('click', fecharSidebar);
  }

  // ---------- Mensagens (flash) desaparecem sozinhas ----------
  document.querySelectorAll('[data-flash]').forEach((elemento) => {
    setTimeout(() => {
      elemento.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      elemento.style.opacity = '0';
      elemento.style.transform = 'translateY(-8px)';
      setTimeout(() => elemento.remove(), 350);
    }, 6000);
  });

  // ---------- Confirmação de exclusão ----------
  document.querySelectorAll('form[data-confirmar]').forEach((form) => {
    form.addEventListener('submit', (evento) => {
      const mensagem = form.dataset.confirmar || 'Tem certeza que deseja excluir?';
      if (!window.confirm(mensagem)) evento.preventDefault();
    });
  });
});
