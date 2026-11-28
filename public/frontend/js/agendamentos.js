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
    box.innerHTML='<div class="p-3 rounded-3 border border-secondary bg-black bg-opacity-25 mb-3"><div class="d-flex align-items-center gap-2 mb-1"><i class="bi bi-controller text-danger fs-5"></i><strong>Escolha um jogo</strong></div><p class="small text-secondary mb-0">Cada empréstimo permite 1 jogo por vez. Você pode utilizar até 2 tipos diferentes de jogos. Para solicitar outro, devolva primeiro o jogo atual.</p></div><div id="tcJogosLista" class="row g-2"></div><div id="tcJogosLimiteMsg" class="small mt-2 text-secondary"></div><div class="mt-3 p-3 rounded-3 border border-warning border-opacity-50"><div class="fw-bold"><i class="bi bi-calendar-check me-1"></i>Prazo de empréstimo: 14 dias</div><div class="small text-secondary mt-2">A contagem começa quando a administração registra a retirada. A solicitação precisa ser aprovada antes da retirada.</div></div>';
    body.insertBefore(box,$("agendamentoMsg"));
  }
  async function carregarEstoque(){
    const [catalogo,limites]=await Promise.all([api("/agendamentos/estoque"),api("/agendamentos/limites")]);
    estoque=catalogo;
    const lista=$("tcJogosLista");if(!lista)return;
    lista.replaceChildren();
    const limiteMsg=$("tcJogosLimiteMsg");
    if(limiteMsg){
      limiteMsg.textContent=limites.emprestimoEmAberto
        ?"Você já possui uma solicitação pendente ou um empréstimo em andamento. Aguarde a devolução para pedir outro jogo."
        :(limites.jogosDiferentesUtilizados?.length>=2
          ?"Você já utilizou seus 2 tipos de jogos. Pode solicitar novamente um desses jogos."
          :"Você ainda pode escolher até "+(2-(limites.jogosDiferentesUtilizados?.length||0))+" tipo(s) diferente(s) de jogo.");
    }
    if(!estoque.length){const p=document.createElement("p");p.className="small text-warning";p.textContent="O estoque ainda não foi cadastrado pela administração. Peça para o responsável atualizar as quantidades.";lista.append(p);return;}
    estoque.forEach(jogo=>{
      const row=document.createElement("label");row.className="col-12 col-md-6";
      const left=document.createElement("span");left.className="d-flex flex-column flex-grow-1 min-w-0";
      const name=document.createElement("strong");name.textContent=jogo.nome;
      const desc=document.createElement("small");desc.className="text-secondary";desc.textContent=jogo.descricao||"";
      const qty=document.createElement("small");qty.className="text-secondary";qty.textContent=(jogo.quantidade_disponivel??jogo.quantidade_total??0)+" disponível(is)";
      left.append(name,desc,qty);
      const controls=document.createElement("span");controls.className="d-flex align-items-center gap-2 ms-2";
      const check=document.createElement("input");check.type="checkbox";check.className="form-check-input m-0";check.dataset.jogoId=jogo.id;check.setAttribute("aria-label","Selecionar "+jogo.nome);
      const amount=document.createElement("span");amount.className="small text-secondary";amount.textContent="1 unidade";
      check.addEventListener("change",()=>{
        if(check.checked) lista.querySelectorAll('input[data-jogo-id]').forEach(other=>{if(other!==check)other.checked=false;});
      });
      controls.append(check,amount);const card=document.createElement("div");card.className="d-flex align-items-center justify-content-between gap-2 h-100 p-3 rounded-3 border border-secondary bg-dark";card.append(left,controls);row.append(card);lista.append(row);
    });
  }
  function selecionados(){
    return [...document.querySelectorAll("#tcJogosLista input[data-jogo-id]:checked")].map(check=>({jogo_id:Number(check.dataset.jogoId),quantidade:1}));
  }
  function dataLocal(data,hora){return data+"T"+hora+":00";}
  function fimUmaHora(inicio,horas=1){const d=new Date(inicio);d.setHours(d.getHours()+horas);const pad=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())+":00";}
  function mensagem(texto,erro=false){const el=$("agendamentoMsg");if(el){el.textContent=texto;el.className="small mt-3 mb-0 "+(erro?"text-danger":"text-success");}}
  async function enviarReserva(event){
    event.preventDefault();
    const recurso=$("agendamentoTipo").value;
    const data=$("agendamentoData").value,horario=$("agendamentoHorario").value;
    const nome=$("agendamentoNome")?.value.trim()||"",descricao=$("agendamentoDescricao")?.value.trim()||"";
    if(recurso==="Quadra"&&(nome.length<3||descricao.length<5))return mensagem("Informe o nome da atividade e uma descrição com pelo menos 5 caracteres.",true);
    if(recurso!=="Jogos de Tabuleiro"&&(!data||!horario))return mensagem("Selecione data e horário.",true);
    const inicio=recurso==="Jogos de Tabuleiro"?new Date().toISOString().slice(0,19):dataLocal(data,horario);
    const jogos=recurso==="Jogos de Tabuleiro"?selecionados():[];
    if(recurso==="Jogos de Tabuleiro"&&jogos.length!==1)return mensagem("Selecione somente 1 jogo por empréstimo.",true);
    const duracao=recurso==="Quadra"?Math.min(3,Math.max(1,Number($("agendamentoDuracao")?.value||1))):1;
    const fim=recurso==="Jogos de Tabuleiro"?new Date(Date.now()+14*24*60*60*1000).toISOString().slice(0,19):fimUmaHora(inicio,duracao);
    const button=$("formAgendamento").querySelector('[type="submit"]');button.disabled=true;
    try{
      const reserva=await api("/agendamentos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recurso,inicio,fim,jogos,nome,descricao})});
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
      const somenteJogos=recurso==="Jogos de Tabuleiro";
      for(const campo of [$("agendamentoData"),$("agendamentoHorario")]){const grupo=campo?.closest(".mb-3")||campo?.parentElement;if(grupo)grupo.hidden=somenteJogos;}
      $("agendamentoData").required=!somenteJogos;$("agendamentoHorario").required=!somenteJogos;
      $("agendamentoTitulo").textContent=recurso==="Quadra"?"Agendar Quadra":"Reservar Jogos de Tabuleiro";
      $("tcQuadraCampos").hidden=somenteJogos;$("tcDuracaoGrupo").hidden=somenteJogos;
      const box=$("tcJogosEscolha");box.hidden=recurso!=="Jogos de Tabuleiro";
      const hoje=new Date();$("agendamentoData").min=hoje.getFullYear()+"-"+String(hoje.getMonth()+1).padStart(2,"0")+"-"+String(hoje.getDate()).padStart(2,"0");
      $("agendamentoMsg").textContent="";
      form.reset();
      $("agendamentoTipo").value=recurso;
      $("tcQuadraCampos").hidden=somenteJogos;$("tcDuracaoGrupo").hidden=somenteJogos;
      if(recurso==="Jogos de Tabuleiro"){
        // Prazo calculado automaticamente quando a administração registra a retirada.
        try{await carregarEstoque();}catch(e){mensagem(e.message,true);}
      }
      const submit=form.querySelector('[type="submit"]');
      submit.textContent=admin?"Confirmar agendamento":"Solicitar reserva";
    });
    // Data de retirada registrada pela administração.
    form.addEventListener("submit",enviarReserva);
  }
  function montarPainelAdmin(){
    const section=$("pedidos");if(!section||$("tcAdminAgendamentos"))return;
    const box=document.createElement("section");box.id="tcAdminAgendamentos";box.className="mt-5 p-3 p-lg-4 rounded-3 border border-secondary bg-dark text-white";
    box.innerHTML='<div class="d-flex justify-content-between flex-wrap gap-2 align-items-center mb-3"><div><span class="text-danger small fw-bold text-uppercase">Administração</span><h3 class="fw-bold mb-1">Gestão de agendamentos</h3><p class="text-secondary small mb-0">Aprove empréstimos de jogos em uma área própria e gerencie as reservas da quadra separadamente.</p></div><button class="btn btn-outline-secondary btn-sm" id="tcAtualizarAgendamentos" type="button"><i class="bi bi-arrow-clockwise me-1"></i>Atualizar</button></div><div class="mb-3"><h5 class="fw-bold">Publicações da Quadra para aprovação</h5><div id="tcPublicacoesQuadraAdmin" class="d-grid gap-2"><p class="small text-secondary">Carregando...</p></div></div><div class="mb-4 p-3 rounded border border-danger border-opacity-50" id="tcAdminSolicitacoesJogos"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2"><div><h4 class="fw-bold mb-1"><i class="bi bi-controller me-2 text-danger"></i>Solicitações de Jogos</h4><p class="small text-secondary mb-0">Confira o aluno, o jogo solicitado e aprove ou recuse cada pedido.</p></div><span class="badge text-bg-danger">Aprovação necessária</span></div><div id="tcSolicitacoesJogosAdminLista" class="d-grid gap-2 mt-3"><p class="small text-secondary">Carregando...</p></div></div><div class="row g-3"><div class="col-12 col-xl-5"><div class="p-3 rounded border border-secondary h-100"><h5 class="fw-bold">Estoque de jogos</h5><form id="tcFormEstoque" class="d-grid gap-2"><input class="form-control bg-dark text-white border-secondary" id="tcJogoNome" maxlength="100" placeholder="Nome do jogo (ex.: Xadrez)" required><input class="form-control bg-dark text-white border-secondary" id="tcJogoDescricao" maxlength="300" placeholder="Descrição (opcional)"><label class="small" for="tcJogoQtd">Quantidade comprada/adicionada</label><input class="form-control bg-dark text-white border-secondary" id="tcJogoQtd" type="number" min="0" max="500" value="1" required><label class="small" for="tcJogoValor">Valor de reposição por unidade (R$)</label><input class="form-control bg-dark text-white border-secondary" id="tcJogoValor" type="number" min="0" step="0.01" value="0" required><button class="btn btn-danger" type="submit">Adicionar ao estoque</button><p class="small text-secondary mb-0">Atraso não gera multa diária. O valor é cobrado somente em caso de dano ou perda.</p></form><div id="tcEstoqueAdminLista" class="d-grid gap-2 mt-3"></div><p id="tcEstoqueMsg" class="small mt-2 mb-0"></p></div></div><div class="col-12 col-xl-7"><div class="p-3 rounded border border-secondary h-100"><h5 class="fw-bold">Reservas da Quadra</h5><div id="tcReservasAdminLista" class="d-grid gap-2"><p class="small text-secondary">Carregando...</p></div></div></div></div>';
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
      const gameList=$("tcSolicitacoesJogosAdminLista");gameList.replaceChildren();
      const gameLoans=reservas.filter(r=>r.recurso==="Jogos de Tabuleiro"&&(r.status==="pendente"||(r.status==="aprovado"&&!r.devolvido_em)));
      if(!gameLoans.length){const p=document.createElement("p");p.className="small text-secondary";p.textContent="Nenhuma solicitação ou empréstimo de jogo em aberto.";gameList.append(p);}
      gameLoans.forEach(r=>{
        const card=document.createElement("div");card.className="border border-secondary rounded p-3";
        const title=document.createElement("strong");title.textContent="Solicitação #"+r.id+" · Jogos de Tabuleiro";
        const who=document.createElement("p");who.className="small text-secondary mb-1";who.textContent="Aluno responsável: "+(r.solicitante||"Não identificado");
        const games=document.createElement("p");games.className="small mb-2";games.textContent="Jogo solicitado: "+(r.jogos||"Não informado");
        card.append(title,who,games);
        if(r.status==="pendente"){
          const state=document.createElement("p");state.className="small text-warning mb-2";state.textContent="Aguardando aprovação da administração.";card.append(state);
          const actions=document.createElement("div");actions.className="d-flex gap-2";
          [["aprovado","Aprovar solicitação","btn-success"],["rejeitado","Recusar solicitação","btn-outline-danger"]].forEach(([status,label,cls])=>{
            const b=document.createElement("button");b.type="button";b.className="btn btn-sm "+cls;b.textContent=label;b.onclick=()=>decidirReserva(r.id,status);actions.append(b);
          });
          card.append(actions);
        }else{
          const end=new Date(String(r.fim).replace(" ","T"));
          const state=document.createElement("p");state.className="small mb-2 "+(r.atrasado?"text-danger":"text-success");
          state.textContent=r.retirado_em?(r.atrasado?"EM ATRASO — prazo de devolução passou":"EMPRESTADO — devolução até "+end.toLocaleDateString("pt-BR")):"Aprovado — aguardando retirada do aluno";
          card.append(state);
          if(r.retirado_em){const pickup=document.createElement("p");pickup.className="small text-secondary mb-2";pickup.textContent="Retirado em: "+new Date(String(r.retirado_em).replace(" ","T")).toLocaleString("pt-BR");card.append(pickup);}
          const actions=document.createElement("div");actions.className="d-flex flex-wrap gap-2";
          if(!r.retirado_em){const b=document.createElement("button");b.className="btn btn-sm btn-outline-info";b.textContent="Registrar retirada";b.onclick=()=>acaoEmprestimo(r.id,"retirada");actions.append(b);}
          [["integro","Registrar devolução"],["danificado","Devolvido danificado"],["perdido","Jogo perdido"]].forEach(([cond,label])=>{const b=document.createElement("button");b.className="btn btn-sm btn-outline-success";b.textContent=label;b.onclick=()=>devolverJogo(r.id,cond);if(!r.retirado_em)b.disabled=true;actions.append(b);});
          card.append(actions);
        }
        gameList.append(card);
      });
      const list=$("tcReservasAdminLista");list.replaceChildren();
      const courtReservations=reservas.filter(r=>r.recurso==="Quadra"&&(r.status==="pendente"||r.status==="aprovado"));
      if(!courtReservations.length){const p=document.createElement("p");p.className="small text-secondary";p.textContent="Nenhuma reserva da Quadra em aberto.";list.append(p);}
      courtReservations.forEach(r=>{
        const card=document.createElement("div");card.className="border border-secondary rounded p-3";
        const start=new Date(String(r.inicio).replace(" ","T")),end=new Date(String(r.fim).replace(" ","T"));
        const title=document.createElement("strong");title.textContent="Quadra · "+start.toLocaleDateString("pt-BR")+" · "+start.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})+"–"+end.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
        const who=document.createElement("p");who.className="small text-secondary mb-2";who.textContent="Aluno responsável: "+(r.solicitante||"Não identificado");card.append(title,who);
        if(r.status==="aprovado"){const state=document.createElement("p");state.className="small text-success mb-2";state.textContent="Reserva confirmada no calendário.";card.append(state);const cancel=document.createElement("button");cancel.type="button";cancel.className="btn btn-sm btn-outline-danger";cancel.textContent="Cancelar reserva";cancel.onclick=()=>cancelarReservaQuadra(r.id);card.append(cancel);}
        else{const actions=document.createElement("div");actions.className="d-flex gap-2";[["aprovado","Autorizar","btn-success"],["rejeitado","Recusar","btn-outline-danger"]].forEach(([status,label,cls])=>{const b=document.createElement("button");b.type="button";b.className="btn btn-sm "+cls;b.textContent=label;b.onclick=()=>decidirReserva(r.id,status);actions.append(b);});card.append(actions);}
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
  async function cancelarReservaQuadra(id){
    const motivo=window.prompt("Informe o motivo do cancelamento da reserva (obrigatório):");
    if(motivo===null)return;
    if(motivo.trim().length<5){alert("Explique o motivo com pelo menos 5 caracteres.");return;}
    try{
      await api("/agendamentos/"+id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"cancelado",motivo:motivo.trim()})});
      await carregarPainelAdmin();document.dispatchEvent(new CustomEvent("tc-avisos-atualizados"));
      alert("Reserva cancelada. O aluno foi notificado com o motivo.");
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