/* Botão de visualizar senha para campos de senha estáticos e dinâmicos. */
(() => {
  "use strict";
  function adicionarOlho(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== "password") return;
    if (input.dataset.eyeToggleReady === "1") return;
    const grupoExistente = input.closest(".input-group");
    if (grupoExistente && grupoExistente.querySelector("button")) {
      input.dataset.eyeToggleReady = "1";
      return;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "input-group password-eye-group";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(input);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-outline-secondary";
    button.setAttribute("aria-label", "Mostrar senha");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<i class="bi bi-eye" aria-hidden="true"></i>';
    button.addEventListener("click", () => {
      const mostrar = input.type === "password";
      input.type = mostrar ? "text" : "password";
      button.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
      button.setAttribute("aria-pressed", String(mostrar));
      const icon = button.querySelector("i");
      if (icon) {
        icon.classList.toggle("bi-eye", !mostrar);
        icon.classList.toggle("bi-eye-slash", mostrar);
      }
    });
    wrapper.append(button);
    input.dataset.eyeToggleReady = "1";
  }
  function verificar(root) {
    if (root instanceof HTMLInputElement) adicionarOlho(root);
    root.querySelectorAll?.('input[type="password"]').forEach(adicionarOlho);
  }
  function iniciar() {
    verificar(document);
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) verificar(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();