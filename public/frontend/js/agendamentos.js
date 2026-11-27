/* Agendamentos: estoque de jogos, reservas e aprovação administrativa. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const token=()=>sessionStorage.getItem("techcampus_token")||"";
  const api=async(path,options={})=>{
    const r=await fetch("/api"+path,{...options,headers:{Authorization:"Bearer "+token(),...(options.headers||{})}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(d.erro||"Não foi possível concluir a operação.");
    return d;
  };
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let estoque=[];
  let admin=false;

  function montarCamposJogos(){
    const form=$("formAgendamento"),body=form?.querySelector(".modal-body");
    if(!form||!body||$("tcJogosEscolha"))return;
    const box=document.createElement("div");
    box.id="tcJogosEscolha";box.className="mt-3";box.hidden=true;
    box.innerHTML='<label class="form-label fw-bold">Escolha os jogos disponíveis</label><div class="small text-secondary mb-2">Selecione os jogos e a quantidade desejada. A solicitação dependerá da autorização da administração.</div><div id="tcJogosLista" class="d-grid gap-2"></div><label class="form-label fw-bold mt-3" for="tcJogoDevolucao">Data limite para devolução</label><input id="tcJogoDevolucao" type="date" class="form-control bg-dark text-white border-secondary"><div class="small text-secondary mt-1">Combine a data de devolução com a administração.</div>';
    body.insertBefore(box,$("agendamentoMsg"));
  }
  async function carregarEstoque(){
    estoque=await api("/agendamentos/estoque");
    const lista=$("tcJogosLista");if(!lista)return;
    lista.replaceChildren();
    if(!estoque.length){const p=document.createElement("p");p.className="small text-warning";p.textContent="O estoque ainda não foi cadastrado pela administração. Peça para o responsável atualizar as quantidades.";lista.append(p);return;}
    estoque.forEach(jogo=>{
      const row=document.createElement("label");row.className="d-flex align-items-center justify-content-between gap-3 p-2 rounded border border-secondary";
      const left=document.createElement("span");left.className="d-flex flex-column";
      const name=document.createElement("strong");name.textContent=jogo.nome;
      const desc=document.createElement("small");desc.className="text-secondary";desc.textContent=jogo.descricao||"";
      const qty=document.createElement("small");qty.className="text-secondary";qty.textContent=(jogo.quantidade_disponivel??jogo.quantidade_total??0)+" disponível(is)";
      left.append(name,desc,qty);
      const controls=document.createElement("span");controls.className="d-flex align-items-center gap-2";
      const check=document.createElement("input");check.type="checkbox";check.className="form-check-input m-0";check.dataset.jogoId=jogo.id;check.setAttribute("aria-label","Selecionar "+jogo.nome);
      const amount=document.createElement("input");amount.type="number";amount.min="1";amount.max=String(jogo.quantidade_disponivel??0);amount.value="1";amount.disabled=true;amount.className="form-control form-control-sm bg-dark text-white border-secondary";amount.style.width="76px";amount.dataset.quantidadeJogo=jogo.id;
      check.addEventListener("change",()=>amount.disabled=!check.checked);
      controls.append(check,amount);row.append(left,controls);lista.append(row);
    });
  }
  function selecionados(){
    return [...document.querySelectorAll("#tcJogosLista input[data-jogo-id]:checked")].map(check=>({jogo_id:Number(check.dataset.jogoId),quantidade:Number(document.querySelector('[data-quantidade-jogo="'+check.dataset.jogoId+'"]').value)}));
  }
  function dataLocal(data,hora){return data+"T"+hora+":00";}
  function fimUmaHora(inicio){const d=new Date(inicio);d.setHours(d.getHours()+1);const pad=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())+":00";}
  function mensagem(texto,erro=false){const el=$("agendamentoMsg");if(el){el.textContent=texto;el.className="small mt-3 mb-0 "+(erro?"text-danger":"text-success");}}
  async function enviarReserva(event){
    event.preventDefault();
    const recurso=$("agendamentoTipo").value;
    const data=$("agendamentoData").value,horario=$("agendamentoHorario").value;
    if(!data||!horario)return mensagem("Selecione data e horário.",true);
    const inicio=dataLocal(data,horario);
    const jogos=recurso==="Jogos de Tabuleiro"?selecionados():[];
    if(recurso==="Jogos de Tabuleiro"&&!jogos.length)return mensagem("Selecione pelo menos um jogo.",true);
    const dataDevolucao=$("tcJogoDevolucao")?.value;
    const fim=recurso==="Jogos de Tabuleiro"?(dataDevolucao?dataDevolucao+"T23:59:00":""):fimUmaHora(inicio);
    if(recurso==="Jogos de Tabuleiro"&&(!dataDevolucao||Date.parse(fim)<=Date.parse(inicio)))return mensagem("Informe uma data de devolução posterior à retirada.",true);
    const button=$("formAgendamento").querySelector('[type="submit"]');button.disabled=true;
    try{
      const reserva=await api("/agendamentos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recurso,inicio,fim,jogos})});
      mensagem(reserva.status==="aprovado"?"Agendamento confirmado e incluído no calendário!":"Solicitação enviada! Aguarde a autorização da administração.");
      document.dispatchEvent(new CustomEvent("tc-avisos-atualizados"));
      setTimeout(()=>window.bootstrap?.Modal.getInstance($("modalAgendamento"))?.hide(),1100);
      await carregarPainelAdmin();
    }catch(error){mensagem(error.message,true);}finally{button.disabled=false;}
  }
  function instalarModal(){
    const modal=$("modalAgendamento"),form=$("formAgendamento");if(!modal||!form)return;
    montarCamposJogos();
    modal.addEventListener("show.bs.modal",async event=>{
      const trigger=event.relatedTarget;
      const recurso=trigger?.dataset.recurso||"Quadra";
      $("agendamentoTipo").value=recurso;
      $("agendamentoTitulo").textContent=recurso==="Quadra"?"Agendar Quadra":"Reservar Jogos de Tabuleiro";
      const box=$("tcJogosEscolha");box.hidden=recurso!=="Jogos de Tabuleiro";
      const hoje=new Date();$("agendamentoData").min=hoje.getFullYear()+"-"+String(hoje.getMonth()+1).padStart(2,"0")+"-"+String(hoje.getDate()).padStart(2,"0");
      $("agendamentoMsg").textContent="";
      form.reset();
      $("agendamentoTipo").value=recurso;
      if(recurso==="Jogos de Tabuleiro"){
        const devolucao=$("tcJogoDevolucao");devolucao.min=$("agendamentoData").value;const amanha=new Date();amanha.setDate(amanha.getDate()+1);devolucao.value=amanha.getFullYear()+"-"+String(amanha.getMonth()+1).padStart(2,"0")+"-"+String(amanha.getDate()).padStart(2,"0");
        try{await carregarEstoque();}catch(e){mensagem(e.message,true);}
      }
      const submit=form.querySelector('[type="submit"]');
      submit.textContent=admin?"Confirmar agendamento":"Solicitar reserva";
    });
    $("agendamentoData").addEventListener("change",()=>{const campo=$("tcJogoDevolucao");if(campo){campo.min=$("agendamentoData").value;if(campo.value<campo.min)campo.value=campo.min;}});
    form.addEventListener("submit",enviarReserva);
  }
  function montarPainelAdmin(){
    const section=$("pedidos");if(!section||$("tcAdminAgendamentos"))return;
    const box=document.createElement("section");box.id="tcAdminAgendamentos";box.className="mt-5 p-3 p-lg-4 rounded-3 border border-secondary bg-dark text-white";
    box.innerHTML='<div class="d-flex justify-content-between flex-wrap gap-2 align-items-center mb-3"><div><span class="text-danger small fw-bold text-uppercase">Administração</span><h3 class="fw-bold mb-1">Gestão de agendamentos</h3><p class="text-secondary small mb-0">Autorize reservas da quadra e controle os jogos disponíveis para empréstimo.</p></div><button class="btn btn-outline-secondary btn-sm" id="tcAtualizarAgendamentos" type="button"><i class="bi bi-arrow-clockwise me-1"></i>Atualizar</button></div><div class="mb-3"><h5 class="fw-bold">Publicações da Quadra para aprovação</h5><div id="tcPublicacoesQuadraAdmin" class="d-grid gap-2"><p class="small text-secondary">Carregando...</p></div></div><div class="row g-3"><div class="col-12 col-xl-5"><div class="p-3 rounded border border-secondary h-100"><h5 class="fw-bold">Estoque de jogos</h5><form id="tcFormEstoque" class="d-grid gap-2"><input class="form-control bg-dark text-white border-secondary" id="tcJogoNome" maxlength="100" placeholder="Nome do jogo (ex.: Xadrez)" required><input class="form-control bg-dark text-white border-secondary" id="tcJogoDescricao" maxlength="300" placeholder="Descrição (opcional)"><label class="small" for="tcJogoQtd">Quantidade comprada/adicionada</label><input class="form-control bg-dark text-white border-secondary" id="tcJogoQtd" type="number" min="0" max="500" value="1" required><label class="small" for="tcJogoValor">Valor de reposição por unidade (R$)</label><input class="form-control bg-dark text-white border-secondary" id="tcJogoValor" type="number" min="0" step="0.01" value="0" required><button class="btn btn-danger" type="submit">Adicionar ao estoque</button><p class="small text-secondary mb-0">Atraso não gera multa diária. O valor é cobrado somente em caso de dano ou perda.</p></form><div id="tcEstoqueAdminLista" class="d-grid gap-2 mt-3"></div><p id="tcEstoqueMsg" class="small mt-2 mb-0"></p></div></div><div class="col-12 col-xl-7"><div class="p-3 rounded border border-secondary h-100"><h5 class="fw-bold">Solicitações pendentes</h5><div id="tcReservasAdminLista" class="d-grid gap-2"><p class="small text-secondary">Carregando...</p></div></div></div></div>';
    const cards=section.querySelector(".row.g-4.justify-content-center");
    (cards||section.firstElementChild)?.after(box);
    $("tcAtualizarAgendamentos").addEventListener("click",carregarPainelAdmin);
    $("tcFormEstoque").addEventListener("submit",salvarJogo);
  }
  async function salvarJogo(event){
    event.preventDefault();const msg=$("tcEstoqueMsg");
    try{
      await api("/agendamentos/estoque",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome:$("tcJogoNome").value.trim(),descricao:$("tcJogoDescricao").value.trim(),quantidade:Number($("tcJogoQtd").value),valor_reposicao_centavos:Math.round(Number($("tcJogoValor").value)*100)})});
      msg.textContent="Estoque atualizado.";msg.className="small text-success mt-2";
      $("tcFormEstoque").reset();$("tcJogoQtd").value=1;$("tcJogoValor").value=0;
      await carregarPainelAdmin();await carregarEstoque();
    }catch(e){msg.textContent=e.message;msg.className="small text-danger mt-2";}
  }
  async function carregarPainelAdmin(){
    if(!admin||!$("tcAdminAgendamentos"))return;
    try{
      const [jogos,reservas,publicacoes]=await Promise.all([api("/agendamentos/estoque"),api("/agendamentos"),api("/agendamentos/quadra-publicacoes/admin")]);
      const pubs=$("tcPublicacoesQuadraAdmin");pubs.replaceChildren();
      const pendentes=publicacoes.filter(p=>p.status==="pendente");
      if(!pendentes.length){const empty=document.createElement("p");empty.className="small text-secondary";empty.textContent="Nenhuma publicação aguardando aprovação.";pubs.append(empty);}
      pendentes.forEach(p=>{
        const card=document.createElement("div");card.className="border border-secondary rounded p-3";
        const title=document.createElement("strong");title.textContent=p.titulo;
        const desc=document.createElement("p");desc.className="small mb-1";desc.textContent=p.descricao;
        const author=document.createElement("p");author.className="small text-secondary";author.textContent="Enviado por: "+p.autor_nome+" · Autorizou a divulgação";
        const actions=document.createElement("div");actions.className="d-flex gap-2";
        [["aprovado","Aprovar","btn-success"],["rejeitado","Rejeitar","btn-outline-danger"]].forEach(([status,label,cls])=>{
          const button=document.createElement("button");button.type="button";button.className="btn btn-sm "+cls;button.textContent=label;
          button.addEventListener("click",async()=>{button.disabled=true;try{await api("/agendamentos/quadra-publicacoes/"+p.id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});await carregarPainelAdmin();document.dispatchEvent(new CustomEvent("tc-avisos-atualizados"));}catch(error){alert(error.message);}finally{button.disabled=false;}});
          actions.append(button);
        });
        card.append(title,desc,author,actions);pubs.append(card);
      });
      const stock=$("tcEstoqueAdminLista");stock.replaceChildren();
      jogos.forEach(j=>{
        const row=document.createElement("div");row.className="d-flex justify-content-between align-items-center gap-2 border-bottom border-secondary py-2";
        const name=document.createElement("span");name.textContent=j.nome;
        const count=document.createElement("strong");count.textContent=j.quantidade_disponivel+" / "+j.quantidade_total;
        row.append(name,count);stock.append(row);
      });
      const list=$("tcReservasAdminLista");list.replaceChildren();
      const abertas=reservas.filter(r=>r.status==="pendente"||(r.recurso==="Jogos de Tabuleiro"&&r.status==="aprovado"&&!r.devolvido_em));
      if(!abertas.length){const p=document.createElement("p");p.className="small text-secondary";p.textContent="Nenhuma solicitação ou empréstimo em aberto.";list.append(p);}
      abertas.forEach(r=>{
        const card=document.createElement("div");card.className="border border-secondary rounded p-3";
        const start=new Date(String(r.inicio).replace(" ","T")),end=new Date(String(r.fim).replace(" ","T"));
        const title=document.createElement("strong");title.textContent=r.recurso+" · "+start.toLocaleDateString("pt-BR")+" · "+start.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})+"–"+end.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
        const who=document.createElement("p");who.className="small text-secondary mb-2";who.textContent="Aluno: "+(r.solicitante||"—")+" · "+(r.jogos||"Quadra");card.append(title,who);
        if(r.recurso==="Jogos de Tabuleiro"&&r.status==="aprovado"){
          const state=document.createElement("p");state.className="small mb-2 "+(r.atrasado?"text-danger":"text-secondary");state.textContent=r.atrasado?"EM ATRASO — prazo de devolução passou":(r.retirado_em?"Aguardando devolução":"Aguardando retirada");card.append(state);
          const actions=document.createElement("div");actions.className="d-flex flex-wrap gap-2";
          if(!r.retirado_em){const b=document.createElement("button");b.className="btn btn-sm btn-outline-info";b.textContent="Registrar retirada";b.onclick=()=>acaoEmprestimo(r.id,"retirada");actions.append(b);}
          [["integro","Devolvido íntegro"],["danificado","Danificado"],["perdido","Perdido"]].forEach(([cond,label])=>{const b=document.createElement("button");b.className="btn btn-sm btn-outline-success";b.textContent=label;b.onclick=()=>devolverJogo(r.id,cond);actions.append(b);});
          card.append(actions);
        }else if(r.status==="pendente"){
          const actions=document.createElement("div");actions.className="d-flex gap-2";
          [["aprovado","Autorizar","btn-success"],["rejeitado","Recusar","btn-outline-danger"]].forEach(([status,label,cls])=>{const b=document.createElement("button");b.type="button";b.className="btn btn-sm "+cls;b.textContent=label;b.onclick=()=>decidirReserva(r.id,status);actions.append(b);});card.append(actions);
        }
        list.append(card);
      });
    }catch(e){$("tcReservasAdminLista").textContent=e.message;}
  }
  async function acaoEmprestimo(id,acao){
    try{await api("/agendamentos/"+id+"/"+acao,{method:"PATCH"});await carregarPainelAdmin();}
    catch(e){alert(e.message);}
  }
  async function devolverJogo(id,condicao){
    if(!confirm("Confirmar registro da devolução: "+condicao+"?"))return;
    try{
      const resultado=await api("/agendamentos/"+id+"/devolucao",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({condicao})});
      if(resultado.cobranca_centavos)alert("Cobrança de reposição: R$ "+(resultado.cobranca_centavos/100).toFixed(2).replace(".",","));
      await carregarPainelAdmin();document.dispatchEvent(new CustomEvent("tc-avisos-atualizados"));
    }catch(e){alert(e.message);}
  }
  async function decidirReserva(id,status){
    try{await api("/agendamentos/"+id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});await carregarPainelAdmin();document.dispatchEvent(new CustomEvent("tc-avisos-atualizados"));}
    catch(e){alert(e.message);}
  }
  async function init(){
    if(!$("modalAgendamento")||!token())return;
    try{const perfil=await api("/perfil");admin=perfil.papel==="admin";}catch{}
    instalarModal();
    if(admin){montarPainelAdmin();carregarPainelAdmin();}
  }
  document.addEventListener("DOMContentLoaded",init);
})();