/* Consulta tokens persistidos no servidor para o aluno recuperar o código. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const tokenAuth = () => sessionStorage.getItem("techcampus_token");
  let pedidosCache = [];
  let temporizador = null;
  let atualizandoExpiracao = false;

  async function api(path, options = {}) {
    const headers = { Authorization: `Bearer ${tokenAuth()}`, ...(options.headers || {}) };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(`/api${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const e = new Error(data.erro || `Erro ${response.status}`);
      e.status = response.status;
      throw e;
    }
    return data;
  }

  const texto = (tag, classe, conteudo) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    el.textContent = conteudo ?? "";
    return el;
  };

  const dataBR = (valor) => {
    const d = new Date(String(valor || "").replace(" ", "T") + (String(valor || "").includes("Z") ? "" : "Z"));
    return Number.isNaN(d.getTime()) ? valor || "" : d.toLocaleString("pt-BR");
  };

  function formatarTempo(ms) {
    const segundos = Math.max(0, Math.ceil(ms / 1000));
    const minutos = Math.floor(segundos / 60);
    return `${String(minutos).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;
  }

  function iniciarContagem() {
    clearInterval(temporizador);
    temporizador = setInterval(() => {
      const agora = Date.now();
      let expirou = false;
      document.querySelectorAll("[data-token-expira]").forEach((el) => {
        const restante = Number(el.dataset.tokenExpira) - agora;
        if (restante <= 0) {
          el.textContent = "Token expirado.";
          el.classList.remove("text-success");
          el.classList.add("text-warning");
          expirou = true;
        } else {
          el.textContent = `Tempo restante: ${formatarTempo(restante)}`;
        }
      });
      if (expirou && !atualizandoExpiracao) {
        atualizandoExpiracao = true;
        carregar().finally(() => { atualizandoExpiracao = false; });
      }
    }, 1000);
  }

  function filtrarPedidos() {
    const busca = String($("pesquisaMeusTokens")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const filtrados = pedidosCache.filter((pedido) => {
      const itens = Array.isArray(pedido.itens) ? pedido.itens.map(i => i.nome).join(" ") : "";
      const textoBusca = `pedido ${pedido.id} ${pedido.status || ""} ${itens}`.toLocaleLowerCase("pt-BR");
      return !busca || textoBusca.includes(busca);
    });
    renderizarPedidos(filtrados);
  }

  function renderizarPedidos(pedidos) {
    const lista = $("listaTokens");
    if (!lista) return;
    lista.replaceChildren();

    if (!pedidos.length) {
      lista.append(texto("p", "text-secondary", pedidosCache.length
        ? "Nenhum pedido corresponde à pesquisa."
        : "Você ainda não possui pedidos."));
      return;
    }

    for (const pedido of pedidos) {
      const col = texto("div", "col-12 col-lg-6", "");
      const card = texto("article", "card h-100 border-secondary", "");
      const corpo = texto("div", "card-body", "");
      const titulo = texto("h5", "card-title", `Pedido #${pedido.id}`);
      const statusPedido = pedido.status === "pendente" && pedido.token_validado_em
        ? "Token validado"
        : pedido.status;
      const status = texto("p", "small text-secondary", `Status: ${statusPedido} · ${dataBR(pedido.criado_em)}`);
      if (pedido.token_validado_em) {
        status.append(texto("span", "d-block text-success mt-1", `Validado pelo APP em ${dataBR(pedido.token_validado_em)}`));
      }
      corpo.append(titulo, status);

      if (Array.isArray(pedido.itens)) {
        corpo.append(texto("p", "small", pedido.itens.map(i => `${i.nome} × ${i.quantidade}`).join(" · ")));
      }

      if (["cancelado", "rejeitado"].includes(pedido.status)) {
        corpo.append(texto("div", "alert alert-secondary mb-0", "Este pedido foi encerrado e não possui token ativo."));
      } else if (pedido.status === "entregue") {
        corpo.append(texto("div", "alert alert-success mb-0", "Retirada concluída. O token não pode ser reutilizado."));
      } else {
        const tokenInfo = pedido.tokenInfo;
        if (tokenInfo?.token) {
          const bloco = texto("div", "p-3 rounded border border-success-subtle mt-2", "");
          bloco.append(texto("div", "small text-secondary", "Token de retirada"));
          const codigo = texto("div", "fs-2 fw-bold text-success", tokenInfo.token);
          codigo.style.letterSpacing = ".2em";
          bloco.append(codigo);
          if (tokenInfo.expiraEm) {
            const contador = texto("div", "small fw-semibold text-success mt-2", "");
            contador.dataset.tokenExpira = String(tokenInfo.expiraEm);
            contador.textContent = `Tempo restante: ${formatarTempo(tokenInfo.expiraEm - Date.now())}`;
            bloco.append(contador);
          }
          const copiar = texto("button", "btn btn-sm btn-outline-secondary mt-2", "Copiar token");
          copiar.type = "button";
          copiar.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(tokenInfo.token);
              copiar.textContent = "Copiado!";
            } catch {
              copiar.textContent = tokenInfo.token;
            }
          });
          bloco.append(copiar);
          corpo.append(bloco);
        } else if (tokenInfo?.expirado) {
          corpo.append(texto("div", "alert alert-warning", "Seu token expirou."));
          const renovar = texto("button", "btn btn-danger", "Gerar novo token");
          renovar.type = "button";
          renovar.addEventListener("click", async () => {
            renovar.disabled = true;
            try {
              await api(`/pedidos/${pedido.id}/token/renovar`, { method: "POST" });
              await carregar();
            } catch (erro) {
              $("mensagemTokens").textContent = erro.message;
              renovar.disabled = false;
            }
          });
          corpo.append(renovar);
        } else if (tokenInfo?.aguardando) {
          corpo.append(texto("div", "alert alert-warning mb-0", "O token ficará disponível depois que o pagamento for confirmado."));
        } else {
          corpo.append(texto("div", "alert alert-secondary mb-0", tokenInfo?.erro || "Não foi possível consultar o token."));
        }
      }

      card.append(corpo);
      col.append(card);
      lista.append(col);
    }
  }

  async function carregar() {
    const lista = $("listaTokens");
    if (!lista || !tokenAuth()) return;
    lista.replaceChildren(texto("p", "text-secondary", "Carregando pedidos..."));
    try {
      pedidosCache = await api("/pedidos");
      await Promise.all(pedidosCache.map(async (pedido) => {
        if (["cancelado", "rejeitado", "entregue"].includes(pedido.status)) return;
        try {
          pedido.tokenInfo = await api(`/pedidos/${pedido.id}/token`);
        } catch (e) {
          if (e.status === 410) pedido.tokenInfo = { expirado: true };
          else if (e.status === 409) pedido.tokenInfo = { aguardando: true };
          else pedido.tokenInfo = { erro: e.message };
        }
      }));
      filtrarPedidos();
      iniciarContagem();
    } catch (e) {
      lista.replaceChildren(texto("div", "alert alert-danger", e.message));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("atualizarTokens")?.addEventListener("click", carregar);
    $("pesquisaMeusTokens")?.addEventListener("input", filtrarPedidos);
    if (location.hash === "#meus-tokens") carregar();
    window.addEventListener("hashchange", () => {
      if (location.hash === "#meus-tokens") carregar();
      else clearInterval(temporizador);
    });
  });
})();
