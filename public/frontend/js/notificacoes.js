/* Notificações persistentes: navegação contextual e menu individual de ações. */
(() => {
  "use strict";
  const token = () => sessionStorage.getItem("techcampus_token");
  const botao = document.querySelector(".dropdown .notification-btn");
  if (!botao || botao.dataset.tcNotificacoes === "1") return;
  botao.dataset.tcNotificacoes = "1";

  const menu = botao.closest(".dropdown")?.querySelector(".dropdown-menu");
  const badge = botao.querySelector(".notification-badge");
  if (!menu) return;

  menu.classList.add("tc-notification-menu");
  Object.assign(menu.style, {
    width: "min(380px, calc(100vw - 24px))",
    maxHeight: "min(70vh, 560px)",
    overflowY: "auto",
    backgroundColor: "var(--bg-card, var(--bs-body-bg))",
    color: "var(--bs-body-color)",
    borderColor: "var(--bs-border-color)",
    opacity: "1"
  });
  menu.replaceChildren();

  const cabecalho = document.createElement("div");
  cabecalho.className = "tc-notification-header d-flex justify-content-between align-items-center gap-2 mb-2 pb-2 border-bottom";
  const titulo = document.createElement("strong");
  titulo.textContent = "Notificações";
  const atualizar = document.createElement("button");
  atualizar.type = "button";
  atualizar.className = "btn btn-sm btn-outline-secondary";
  atualizar.textContent = "Atualizar";
  cabecalho.append(titulo, atualizar);
  const lista = document.createElement("div");
  lista.setAttribute("aria-live", "polite");
  menu.append(cabecalho, lista);

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

  async function carregar() {
    if (!token()) return;
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
        bloco.style.paddingRight = "3.25rem";
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

        const acoes = document.createElement("div");
        acoes.className = "dropdown position-absolute";
        acoes.style.cssText = "top:.55rem;right:.55rem;";
        const opcoes = texto("button", "btn btn-sm btn-link text-secondary p-1");
        opcoes.type = "button";
        opcoes.innerHTML = '<i class="bi bi-three-dots-vertical" aria-hidden="true"></i>';
        opcoes.setAttribute("aria-label", "Opções da notificação");
        opcoes.setAttribute("aria-expanded", "false");
        const painel = document.createElement("div");
        painel.className = "dropdown-menu dropdown-menu-end shadow";
        painel.style.cssText = "min-width:190px;z-index:1080;";
        acoes.append(opcoes, painel);
        bloco.append(acoes);

        function fecharMenu() {
          painel.classList.remove("show");
          opcoes.setAttribute("aria-expanded", "false");
        }
        opcoes.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const aberto = painel.classList.toggle("show");
          opcoes.setAttribute("aria-expanded", String(aberto));
        });

        if (Number(item.lida) === 0) {
          const ler = texto("button", "dropdown-item", "Marcar como lido");
          ler.type = "button";
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
              fecharMenu();
              lista.prepend(texto("p", "small text-danger", erro.message));
            }
          });
          painel.append(ler);
        }

        const excluir = texto("button", "dropdown-item text-danger", "Excluir notificação");
        excluir.type = "button";
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
            fecharMenu();
            lista.prepend(texto("p", "small text-danger", erro.message));
          }
        });
        painel.append(excluir);

        async function abrirNotificacao() {
          fecharMenu();
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
    if (!event.target.closest(".tc-notification-item .dropdown")) {
      lista.querySelectorAll(".tc-notification-item .dropdown-menu.show").forEach((painel) => painel.classList.remove("show"));
      lista.querySelectorAll(".tc-notification-item [aria-expanded='true']").forEach((botaoOpcao) => botaoOpcao.setAttribute("aria-expanded", "false"));
    }
  });

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
