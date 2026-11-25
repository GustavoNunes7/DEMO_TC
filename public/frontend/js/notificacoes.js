/* Central de notificações: menu de ações flutuante, lista rolável e navegação contextual. */
(() => {
  "use strict";
  const token = () => sessionStorage.getItem("techcampus_token");
  const botao = document.querySelector(".dropdown .notification-btn[title='Notificações'], .dropdown .notification-btn[aria-label='Notificações']");
  if (!botao || botao.dataset.tcNotificacoes === "1") return;
  botao.dataset.tcNotificacoes = "1";

  const menu = botao.closest(".dropdown")?.querySelector(".dropdown-menu");
  const badge = botao.querySelector(".notification-badge");
  if (!menu) return;

  menu.classList.add("tc-notification-menu");
  Object.assign(menu.style, {
    width: "min(380px, calc(100vw - 24px))",
    maxWidth: "calc(100vw - 24px)",
    maxHeight: "min(70vh, 560px)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--bg-card, var(--bs-body-bg))",
    color: "var(--bs-body-color)",
    borderColor: "var(--bs-border-color)",
    opacity: "1"
  });
  menu.replaceChildren();

  const cabecalho = document.createElement("div");
  cabecalho.className = "tc-notification-header d-flex justify-content-between align-items-center gap-2 mb-2 pb-2 border-bottom";
  cabecalho.style.cssText = "flex:0 0 auto;";
  const titulo = document.createElement("strong");
  titulo.textContent = "Notificações";
  const atualizar = document.createElement("button");
  atualizar.type = "button";
  atualizar.className = "btn btn-sm btn-outline-secondary";
  atualizar.textContent = "Atualizar";
  cabecalho.append(titulo, atualizar);
  const lista = document.createElement("div");
  lista.className = "tc-notification-list";
  lista.setAttribute("aria-live", "polite");
  lista.style.cssText = "min-height:0;overflow-y:auto;overscroll-behavior:contain;padding-right:3px;";
  menu.append(cabecalho, lista);

  let painelAberto = null;
  let botaoPainelAberto = null;

  function fecharPainel() {
    if (painelAberto) painelAberto.remove();
    if (botaoPainelAberto) botaoPainelAberto.setAttribute("aria-expanded", "false");
    painelAberto = null;
    botaoPainelAberto = null;
  }

  function aplicarPreferencia() {
    const ativa = localStorage.getItem("tc_notificacoes_ativas") !== "0";
    botao.hidden = !ativa;
    if (!ativa && badge) badge.hidden = true;
  }
  aplicarPreferencia();
  window.addEventListener("tc-preferencia-notificacoes", aplicarPreferencia);

  function texto(tag, classe, valor) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    el.textContent = valor ?? "";
    return el;
  }

  function destinoNotificacao(item) {
    const conteudo = `${item.titulo || ""} ${item.mensagem || ""}`.toLocaleLowerCase("pt-BR");
    if (/documento|comprovante/.test(conteudo)) return "#documento";
    if (/pedido|pagamento|token|retirada|compra/.test(conteudo)) return "#pedidos";
    if (/aviso|evento|temporada|formatura/.test(conteudo)) return "#avisos";
    if (/agendamento|quadra|jogos/.test(conteudo)) return "#avisos";
    if (/dúvida|duvida|chamado|resposta da aapm/.test(conteudo)) return "#ajuda";
    if (/usuário|usuario|aluno|conta/.test(conteudo)) return "#usuarios";
    return "#inicio";
  }

  async function requisicao(url, options = {}) {
    const resposta = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token()}`, ...(options.headers || {}) }
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro || "Não foi possível concluir a ação.");
    return dados;
  }

  async function marcarComoLida(id) {
    await requisicao(`/api/notificacoes/${encodeURIComponent(id)}/lida`, { method: "PATCH" });
  }

  async function excluirNotificacao(id) {
    await requisicao(`/api/notificacoes/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  function navegarPara(destino) {
    const link = document.querySelector(`.menu-navigation a[href="${destino}"]`);
    if (link) link.click();
    else {
      window.location.hash = destino;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  function abrirPainel(painel, gatilho) {
    fecharPainel();
    document.body.append(painel);
    painel.classList.add("show");
    Object.assign(painel.style, {
      position: "fixed",
      display: "block",
      zIndex: "2000",
      minWidth: "210px",
      maxWidth: "calc(100vw - 24px)",
      margin: "0",
      transform: "none"
    });
    const rect = gatilho.getBoundingClientRect();
    const largura = Math.min(230, window.innerWidth - 24);
    const esquerda = Math.max(12, Math.min(rect.right - largura, window.innerWidth - largura - 12));
    const altura = painel.offsetHeight;
    const abaixo = rect.bottom + 6;
    const topo = abaixo + altura <= window.innerHeight - 12
      ? abaixo
      : Math.max(12, rect.top - altura - 6);
    painel.style.left = `${esquerda}px`;
    painel.style.top = `${topo}px`;
    painel.style.right = "auto";
    painel.style.bottom = "auto";
    painelAberto = painel;
    botaoPainelAberto = gatilho;
    gatilho.setAttribute("aria-expanded", "true");
  }

  async function carregar() {
    if (!token()) return;
    fecharPainel();
    try {
      const dados = await requisicao("/api/notificacoes");
      const itens = Array.isArray(dados) ? dados : [];
      const naoLidas = itens.filter((n) => Number(n.lida) === 0).length;
      if (badge) {
        badge.textContent = naoLidas > 99 ? "99+" : String(naoLidas);
        badge.hidden = naoLidas === 0;
        badge.setAttribute("aria-label", `${naoLidas} notificações não lidas`);
      }
      lista.replaceChildren();
      if (!itens.length) {
        lista.append(texto("p", "small text-secondary mb-0 py-2", "Você não tem notificações no momento."));
        return;
      }

      for (const item of itens) {
        const bloco = document.createElement("article");
        bloco.className = "tc-notification-item p-3 mb-2 rounded border position-relative";
        bloco.style.cursor = "pointer";
        bloco.style.paddingRight = "3rem";
        bloco.setAttribute("role", "link");
        bloco.tabIndex = 0;
        if (Number(item.lida) === 0) bloco.classList.add("is-unread");

        const conteudo = document.createElement("div");
        conteudo.append(
          texto("strong", "d-block", item.titulo || "Notificação"),
          texto("p", "small mb-1 text-wrap", item.mensagem || ""),
          texto("small", "text-secondary", item.criada_em || "")
        );
        bloco.append(conteudo);

        const opcoes = texto("button", "btn btn-sm btn-link text-secondary p-1 position-absolute");
        opcoes.type = "button";
        opcoes.style.cssText = "top:.45rem;right:.45rem;";
        opcoes.innerHTML = '<i class="bi bi-three-dots-vertical" aria-hidden="true"></i>';
        opcoes.setAttribute("aria-label", "Opções da notificação");
        opcoes.setAttribute("aria-haspopup", "menu");
        opcoes.setAttribute("aria-expanded", "false");
        bloco.append(opcoes);

        const painel = document.createElement("div");
        painel.className = "dropdown-menu shadow";
        painel.setAttribute("role", "menu");
        painel.style.cssText = "min-width:210px;";

        if (Number(item.lida) === 0) {
          const ler = texto("button", "dropdown-item", "Marcar como lido");
          ler.type = "button";
          ler.setAttribute("role", "menuitem");
          ler.insertAdjacentHTML("afterbegin", '<i class="bi bi-check2 me-2"></i>');
          ler.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            ler.disabled = true;
            try {
              await marcarComoLida(item.id);
              await carregar();
            } catch (erro) {
              ler.disabled = false;
              fecharPainel();
              lista.prepend(texto("p", "small text-danger", erro.message));
            }
          });
          painel.append(ler);
        }

        const excluir = texto("button", "dropdown-item text-danger", "Excluir notificação");
        excluir.type = "button";
        excluir.setAttribute("role", "menuitem");
        excluir.insertAdjacentHTML("afterbegin", '<i class="bi bi-trash3 me-2"></i>');
        excluir.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          excluir.disabled = true;
          try {
            await excluirNotificacao(item.id);
            await carregar();
          } catch (erro) {
            excluir.disabled = false;
            fecharPainel();
            lista.prepend(texto("p", "small text-danger", erro.message));
          }
        });
        painel.append(excluir);

        opcoes.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (painelAberto === painel) fecharPainel();
          else abrirPainel(painel, opcoes);
        });

        async function abrirNotificacao() {
          fecharPainel();
          try {
            if (Number(item.lida) === 0) await marcarComoLida(item.id);
            navegarPara(destinoNotificacao(item));
            await carregar();
          } catch (erro) {
            lista.prepend(texto("p", "small text-danger", erro.message));
          }
        }
        conteudo.addEventListener("click", (event) => {
          event.stopPropagation();
          abrirNotificacao();
        });
        bloco.addEventListener("keydown", (event) => {
          if ((event.key === "Enter" || event.key === " ") && event.target === bloco) {
            event.preventDefault();
            abrirNotificacao();
          }
        });
        bloco.addEventListener("click", (event) => {
          if (event.target === bloco) abrirNotificacao();
        });
        lista.append(bloco);
      }
    } catch (erro) {
      lista.replaceChildren(texto("p", "small text-danger mb-0", erro.message));
    }
  }

  document.addEventListener("click", (event) => {
    if (painelAberto && !painelAberto.contains(event.target) && event.target !== botaoPainelAberto) fecharPainel();
  });
  window.addEventListener("resize", fecharPainel);
  window.addEventListener("scroll", fecharPainel, true);

  const dropdown = botao.closest(".dropdown");
  dropdown?.addEventListener("show.bs.dropdown", carregar);
  botao.addEventListener("click", carregar);
  atualizar.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    carregar();
  });
  carregar();
  window.setInterval(carregar, 60000);
})();