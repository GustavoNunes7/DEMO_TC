/* Central de notificações: menu Bootstrap estável, ações no próprio cartão e navegação contextual. */
(() => {
  "use strict";
  const botao = document.querySelector(".notification-btn[title='Notificações'], .notification-btn[aria-label='Notificações']");
  if (!botao || botao.dataset.tcNotificacoes === "2") return;
  botao.dataset.tcNotificacoes = "2";

  const dropdown = botao.closest(".dropdown");
  const menu = dropdown?.querySelector(":scope > .dropdown-menu") || dropdown?.querySelector(".dropdown-menu");
  const badge = botao.querySelector(".notification-badge");
  if (!menu) return;

  // Não sobrescrever display: o Bootstrap controla quando o dropdown aparece.
  menu.classList.add("tc-notification-menu");
  Object.assign(menu.style, {
    width: "min(390px, calc(100vw - 24px))",
    maxWidth: "calc(100vw - 24px)",
    maxHeight: "min(72vh, 580px)",
    overflowY: "auto",
    overflowX: "hidden",
    overscrollBehavior: "contain",
    backgroundColor: "var(--bg-card, var(--bs-body-bg))",
    color: "var(--bs-body-color)",
    borderColor: "var(--bs-border-color)",
    zIndex: "1080"
  });
  menu.replaceChildren();

  const cabecalho = document.createElement("div");
  cabecalho.className = "d-flex justify-content-between align-items-center gap-2 mb-2 pb-2 border-bottom";
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
  menu.append(cabecalho, lista);

  const token = () => sessionStorage.getItem("techcampus_token") || "";
  const texto = (tag, classe, valor) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    el.textContent = valor ?? "";
    return el;
  };

  async function requisicao(url, options = {}) {
    const resposta = await fetch(url, {
      ...options,
      headers: { Authorization: "Bearer " + token(), ...(options.headers || {}) }
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro || "Não foi possível concluir a ação.");
    return dados;
  }

  function destinoNotificacao(item) {
    const conteudo = (item.titulo || "") + " " + (item.mensagem || "");
    const t = conteudo.toLocaleLowerCase("pt-BR");
    if (/documento|comprovante/.test(t)) return "#documento";
    if (/pedido|pagamento|token|retirada|compra/.test(t)) return "#pedidos";
    if (/aviso|evento|temporada|formatura/.test(t)) return "#avisos";
    if (/agendamento|quadra|jogos/.test(t)) return "#avisos";
    if (/dúvida|duvida|chamado|resposta da aapm/.test(t)) return "#ajuda";
    if (/usuário|usuario|aluno|conta/.test(t)) return "#usuarios";
    return "#inicio";
  }

  function navegarPara(destino) {
    const link = document.querySelector('.menu-navigation a[href="' + destino + '"]');
    if (link) link.click();
    else {
      const alvo = document.querySelector(destino);
      if (alvo) {
        document.querySelectorAll(".page-section.active").forEach(sec => sec.classList.remove("active"));
        alvo.classList.add("active");
      } else {
        window.location.hash = destino;
      }
    }
    if (window.bootstrap?.Dropdown) {
      const instancia = window.bootstrap.Dropdown.getInstance(botao);
      instancia?.hide();
    }
  }

  function aplicarPreferencia() {
    const ativa = localStorage.getItem("tc_notificacoes_ativas") !== "0";
    botao.hidden = !ativa;
    if (!ativa && badge) badge.hidden = true;
  }
  aplicarPreferencia();
  window.addEventListener("tc-preferencia-notificacoes", aplicarPreferencia);

  let carregando = false;
  async function carregar() {
    if (!token() || carregando) return;
    carregando = true;
    try {
      const dados = await requisicao("/api/notificacoes");
      const itens = Array.isArray(dados) ? dados : [];
      const naoLidas = itens.filter(n => Number(n.lida) === 0).length;
      if (badge) {
        badge.textContent = naoLidas > 99 ? "99+" : String(naoLidas);
        badge.hidden = naoLidas === 0;
        badge.setAttribute("aria-label", naoLidas + " notificações não lidas");
      }
      lista.replaceChildren();
      if (!itens.length) {
        lista.append(texto("p", "small text-secondary mb-0 py-2", "Você não tem notificações no momento."));
        return;
      }

      for (const item of itens) {
        const card = document.createElement("article");
        card.className = "tc-notification-item p-3 mb-2 rounded border";
        card.style.cssText = "position:relative;overflow-wrap:anywhere;";
        if (Number(item.lida) === 0) card.classList.add("is-unread");

        const abrir = document.createElement("button");
        abrir.type = "button";
        abrir.className = "btn btn-link text-start text-reset text-decoration-none p-0 w-100";
        abrir.append(
          texto("strong", "d-block mb-1", item.titulo || "Notificação"),
          texto("span", "d-block small mb-1", item.mensagem || ""),
          texto("small", "text-secondary d-block", item.criada_em || "")
        );
        abrir.addEventListener("click", async () => {
          abrir.disabled = true;
          try {
            if (Number(item.lida) === 0) {
              await requisicao("/api/notificacoes/" + encodeURIComponent(item.id) + "/lida", { method: "PATCH" });
            }
            navegarPara(destinoNotificacao(item));
            await carregar();
          } catch (erro) {
            abrir.disabled = false;
            lista.prepend(texto("p", "small text-danger", erro.message));
          }
        });
        card.append(abrir);

        const acoes = document.createElement("div");
        acoes.className = "d-flex justify-content-end flex-wrap gap-2 mt-2";
        if (Number(item.lida) === 0) {
          const ler = texto("button", "btn btn-sm btn-outline-secondary", "Marcar como lida");
          ler.type = "button";
          ler.addEventListener("click", async () => {
            ler.disabled = true;
            try {
              await requisicao("/api/notificacoes/" + encodeURIComponent(item.id) + "/lida", { method: "PATCH" });
              await carregar();
            } catch (erro) {
              ler.disabled = false;
              lista.prepend(texto("p", "small text-danger", erro.message));
            }
          });
          acoes.append(ler);
        }
        const excluir = texto("button", "btn btn-sm btn-outline-danger", "Excluir");
        excluir.type = "button";
        excluir.addEventListener("click", async () => {
          excluir.disabled = true;
          try {
            await requisicao("/api/notificacoes/" + encodeURIComponent(item.id), { method: "DELETE" });
            await carregar();
          } catch (erro) {
            excluir.disabled = false;
            lista.prepend(texto("p", "small text-danger", erro.message));
          }
        });
        acoes.append(excluir);
        card.append(acoes);
        lista.append(card);
      }
    } catch (erro) {
      lista.replaceChildren(texto("p", "small text-danger mb-0", erro.message));
      if (badge) badge.hidden = true;
    } finally {
      carregando = false;
    }
  }

  dropdown?.addEventListener("shown.bs.dropdown", carregar);
  atualizar.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    carregar();
  });
  carregar();
  window.setInterval(carregar, 60000);
})();