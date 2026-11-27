/* =========================================================
   AVISOS GERAIS - CALENDÁRIO (dados vindos da API)
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const calendarDays = document.getElementById("calendarDays");
  const calendarMonth = document.getElementById("calendarMonth");
  const previousButton = document.getElementById("calendarPrev");
  const nextButton = document.getElementById("calendarNext");
  const todayButton = document.getElementById("calendarToday");
  const agendaContainer = document.getElementById("agendaAvisos");
  const agendaEmpty = document.getElementById("agendaEmpty");
  if (!calendarDays || !calendarMonth) return;

  let statusCalendar = document.getElementById("calendarStatus");
  if (!statusCalendar) {
    statusCalendar = document.createElement("p");
    statusCalendar.id = "calendarStatus";
    statusCalendar.className = "small text-secondary mt-2 mb-0";
    statusCalendar.setAttribute("role", "status");
    calendarDays.insertAdjacentElement("afterend", statusCalendar);
  }

  let usuarioSessao = {};
  try { usuarioSessao = JSON.parse(sessionStorage.getItem("techcampus_usuario") || "{}"); } catch {}
  const papelSessao = String(usuarioSessao.papel || usuarioSessao.role || "").toLowerCase();
  const isAdminSessao = ["admin", "administrador"].includes(papelSessao);
  const adminTools = document.getElementById("avisosAdminFerramentas");
  const addButton = document.getElementById("avisosAdminAdicionar");
  if (isAdminSessao) {
    adminTools?.classList.remove("d-none");
    addButton?.classList.remove("d-none");
  }
  const categoriaValida = ["evento", "academico", "reuniao", "importante"];
  const nomesMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const nomesMesesCurto = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const categorias = {evento:"Evento",academico:"Acadêmico",reuniao:"Reunião",importante:"Importante"};
  let avisos = [];
  let reservasQuadra = [];
  let filtroAtual = "todos";
  let currentDate = new Date();

  function formatarData(valor) {
    if (!valor) return "Data não informada";
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {day:"numeric",month:"long",year:"numeric"});
  }
  function abrirAviso(aviso) {
    const modalElement = document.getElementById("avisoModal");
    if (!modalElement || !window.bootstrap?.Modal) return;
    const setText = (id, value) => { const el=document.getElementById(id); if(el) el.textContent=value || "Não informado"; };
    setText("avisoModalLabel", aviso.titulo);
    setText("modalAvisoCategoria", categorias[aviso.categoria] || "Aviso");
    const tag=document.getElementById("modalAvisoCategoria"); if(tag) tag.className="agenda-tag "+aviso.categoria;
    setText("modalAvisoData", formatarData(aviso.data));
    setText("modalAvisoHorario", aviso.horario || "Não informado");
    setText("modalAvisoLocal", aviso.local || "Não informado");
    setText("modalAvisoDescricao", aviso.descricao);
    const descricaoBloco = document.getElementById("modalAvisoDescricaoBloco");
    if (descricaoBloco) descricaoBloco.hidden = !String(aviso.descricao || "").trim();
    const adminActions = document.getElementById("modalAvisoAdminAcoes");
    const isAdmin = isAdminSessao;
    if (adminActions) {
      adminActions.classList.toggle("d-none", !isAdmin);
      const edit = document.getElementById("modalAvisoEditar");
      const occurred = document.getElementById("modalAvisoOcorrido");
      const remove = document.getElementById("modalAvisoExcluir");
      if (edit) edit.dataset.avisoId = String(aviso.id);
      if (remove) remove.dataset.avisoId = String(aviso.id);
      if (occurred) {
        occurred.dataset.avisoId = String(aviso.id);
        occurred.dataset.ocorrido = Number(aviso.ocorrido) === 1 ? "0" : "1";
        occurred.textContent = Number(aviso.ocorrido) === 1 ? "Desmarcar como ocorrido" : "Marcar como ocorrido";
      }
    }
    window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
  }
  function abrirDetalheReserva(reserva) {
    let modal=document.getElementById("tcReservaCalendarioModal");
    if(!modal){
      modal=document.createElement("div");
      modal.id="tcReservaCalendarioModal";
      modal.className="modal fade";
      modal.tabIndex=-1;
      modal.innerHTML='<div class="modal-dialog modal-dialog-centered"><div class="modal-content bg-dark text-white border border-secondary"><div class="modal-header border-secondary"><h5 class="modal-title">Detalhes da Quadra</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button></div><div class="modal-body"><div id="tcReservaCalendarioInfo"></div><p id="tcReservaCalendarioMsg" class="small mt-3 mb-0" role="status"></p></div><div class="modal-footer border-secondary" id="tcReservaCalendarioAcoes" hidden><button type="button" class="btn btn-outline-secondary" id="tcReservaCancelar">Cancelar publicação</button><button type="button" class="btn btn-danger" id="tcReservaDivulgar">Divulgar</button></div></div></div>';
      document.body.append(modal);
    }
    const info=modal.querySelector("#tcReservaCalendarioInfo");
    const data=new Date(String(reserva.inicio).replace(" ","T"));
    const fim=new Date(String(reserva.fim).replace(" ","T"));
    const status=reserva.status==="aprovado"?"Autorizado":reserva.status==="pendente"?"Aguardando autorização":reserva.status;
    info.replaceChildren();
    const linhas=reserva.tipo==="publicacao"?[["Título",reserva.titulo],["Descrição",reserva.descricao],["Publicado por",reserva.autor_nome],["Status","Aprovado pela Administração"]]:[
      ["Atividade",reserva.titulo||"Reserva da Quadra"],["Descrição",reserva.descricao||"—"],["Aluno",reserva.solicitante||"—"],["E-mail",reserva.email_solicitante||"—"],
      ["Data",data.toLocaleDateString("pt-BR")],
      ["Horário",data.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})+" – "+fim.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})],
      ["Duração",Math.max(1,Math.round((fim-data)/3600000))+" hora(s)"],["Status",status],...(reserva.motivo_cancelamento?[["Motivo do cancelamento",reserva.motivo_cancelamento]]:[])
    ];
    linhas.forEach(([label,value])=>{const p=document.createElement("p");p.className="mb-2";const b=document.createElement("strong");b.textContent=label+": ";p.append(b,document.createTextNode(value||"—"));info.append(p);});
    const actions=modal.querySelector("#tcReservaCalendarioAcoes");
    const msg=modal.querySelector("#tcReservaCalendarioMsg");
    if(msg) msg.textContent="";
    const pending=isAdminSessao && reserva.tipo!=="publicacao" && reserva.status==="pendente";
    const approved=isAdminSessao && reserva.tipo!=="publicacao" && reserva.status==="aprovado";
    if(actions){
      actions.hidden=!(pending||approved);
      actions.replaceChildren();
      const addAction=(label,cls,handler)=>{
        const button=document.createElement("button");button.type="button";button.className="btn "+cls;button.textContent=label;button.addEventListener("click",handler);actions.append(button);
      };
      const run=async(fn)=>{
        [...actions.querySelectorAll("button")].forEach(b=>b.disabled=true);
        try{await fn();window.bootstrap?.Modal.getOrCreateInstance(modal).hide();await carregarAvisosCalendario();}
        catch(error){if(msg)msg.textContent=error.message||"Não foi possível concluir.";[...actions.querySelectorAll("button")].forEach(b=>b.disabled=false);}
      };
      if(pending){
        addAction("Autorizar","btn-success",()=>run(()=>fetch("/api/agendamentos/"+reserva.id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(sessionStorage.getItem("techcampus_token")||"")},body:JSON.stringify({status:"aprovado"})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.erro||"Falha ao autorizar.");})));
        addAction("Recusar","btn-outline-danger",()=>{if(confirm("Recusar esta solicitação de reserva?"))run(()=>fetch("/api/agendamentos/"+reserva.id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(sessionStorage.getItem("techcampus_token")||"")},body:JSON.stringify({status:"rejeitado"})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.erro||"Falha ao recusar.");}));});
      }
      if(approved){
        addAction("Editar reserva","btn-outline-info",()=>{
          let editor=document.getElementById("tcEditarReservaModal");
          if(!editor){editor=document.createElement("div");editor.id="tcEditarReservaModal";editor.className="modal fade";editor.tabIndex=-1;editor.innerHTML='<div class="modal-dialog modal-dialog-centered"><div class="modal-content bg-dark text-white border border-secondary"><div class="modal-header border-secondary"><h5 class="modal-title">Editar reserva da Quadra</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><form id="tcEditarReservaForm"><div class="modal-body"><label class="form-label" for="tcEditarNome">Nome da atividade</label><input class="form-control bg-dark text-white border-secondary mb-3" id="tcEditarNome" maxlength="120" required><label class="form-label" for="tcEditarDescricao">Descrição</label><textarea class="form-control bg-dark text-white border-secondary mb-3" id="tcEditarDescricao" rows="2" maxlength="1000" required></textarea><label class="form-label" for="tcEditarData">Data</label><input class="form-control bg-dark text-white border-secondary mb-3" type="date" id="tcEditarData" required><label class="form-label" for="tcEditarHora">Horário de início</label><input class="form-control bg-dark text-white border-secondary mb-3" type="time" id="tcEditarHora" required><label class="form-label" for="tcEditarDuracao">Duração (máximo 3 horas)</label><select class="form-select bg-dark text-white border-secondary" id="tcEditarDuracao"><option value="1">1 hora</option><option value="2">2 horas</option><option value="3">3 horas</option></select><p class="small text-danger mt-2 mb-0" id="tcEditarReservaMsg"></p></div><div class="modal-footer border-secondary"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-danger" type="submit">Salvar alterações</button></div></form></div></div>';document.body.append(editor);}
          const inicioAtual=new Date(String(reserva.inicio).replace(" ","T"));document.getElementById("tcEditarNome").value=reserva.titulo||"";document.getElementById("tcEditarDescricao").value=reserva.descricao||"";document.getElementById("tcEditarData").value=String(reserva.inicio).slice(0,10);document.getElementById("tcEditarHora").value=String(reserva.inicio).slice(11,16);document.getElementById("tcEditarDuracao").value=String(Math.min(3,Math.max(1,Math.round((new Date(reserva.fim)-inicioAtual)/3600000))));
          const formEdit=document.getElementById("tcEditarReservaForm");formEdit.onsubmit=async ev=>{ev.preventDefault();const d=document.getElementById("tcEditarData").value,h=document.getElementById("tcEditarHora").value,horas=Number(document.getElementById("tcEditarDuracao").value),start=d+"T"+h+":00",endDate=new Date(start);endDate.setHours(endDate.getHours()+horas);const pad=n=>String(n).padStart(2,"0"),end=endDate.getFullYear()+"-"+pad(endDate.getMonth()+1)+"-"+pad(endDate.getDate())+"T"+pad(endDate.getHours())+":"+pad(endDate.getMinutes())+":00";try{const response=await fetch("/api/agendamentos/"+reserva.id,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(sessionStorage.getItem("techcampus_token")||"")},body:JSON.stringify({inicio:start,fim:end,nome:document.getElementById("tcEditarNome").value.trim(),descricao:document.getElementById("tcEditarDescricao").value.trim()})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.erro||"Falha ao editar.");window.bootstrap.Modal.getInstance(editor)?.hide();window.bootstrap.Modal.getInstance(modal)?.hide();await carregarAvisosCalendario();}catch(error){document.getElementById("tcEditarReservaMsg").textContent=error.message;}};
          window.bootstrap.Modal.getOrCreateInstance(editor).show();
        });
        addAction("Cancelar reserva","btn-outline-danger",()=>{
          let cancel=document.getElementById("tcCancelarReservaModal");if(!cancel){cancel=document.createElement("div");cancel.id="tcCancelarReservaModal";cancel.className="modal fade";cancel.tabIndex=-1;cancel.innerHTML='<div class="modal-dialog modal-dialog-centered"><div class="modal-content bg-dark text-white border border-secondary"><div class="modal-header border-secondary"><h5 class="modal-title">Cancelar reserva</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><form id="tcCancelarReservaForm"><div class="modal-body"><label class="form-label" for="tcMotivoCancelamento">Motivo do cancelamento</label><textarea id="tcMotivoCancelamento" class="form-control bg-dark text-white border-secondary" rows="3" minlength="5" required placeholder="Descreva o motivo"></textarea><p id="tcCancelarReservaMsg" class="small text-danger mt-2 mb-0"></p></div><div class="modal-footer border-secondary"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Voltar</button><button type="submit" class="btn btn-danger">Confirmar cancelamento</button></div></form></div></div>';document.body.append(cancel);}const cf=document.getElementById("tcCancelarReservaForm");cf.onsubmit=async ev=>{ev.preventDefault();const motivo=document.getElementById("tcMotivoCancelamento").value.trim();try{const response=await fetch("/api/agendamentos/"+reserva.id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(sessionStorage.getItem("techcampus_token")||"")},body:JSON.stringify({status:"cancelado",motivo})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.erro||"Falha ao cancelar.");window.bootstrap.Modal.getInstance(cancel)?.hide();window.bootstrap.Modal.getInstance(modal)?.hide();await carregarAvisosCalendario();}catch(error){document.getElementById("tcCancelarReservaMsg").textContent=error.message;}};window.bootstrap.Modal.getOrCreateInstance(cancel).show();
        });
      }
    }
    window.bootstrap?.Modal.getOrCreateInstance(modal).show();
  }
  function renderAgenda() {
    if (!agendaContainer) return;
    agendaContainer.replaceChildren();
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const proximos = avisos.filter(a => { if(!a.data) return false; const [y,m,d]=a.data.split("-").map(Number); return new Date(y,m-1,d)>=hoje; }).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,8);
    proximos.forEach(aviso=>{
      const item=document.createElement("button"); item.type="button"; item.className="agenda-item"+(Number(aviso.ocorrido)===1?" ocorrido":""); item.dataset.category=aviso.categoria; item.dataset.aviso=String(aviso.id);
      const [y,m,d]=aviso.data.split("-").map(Number);
      const date=document.createElement("div"); date.className="agenda-date"; const day=document.createElement("span");day.className="agenda-day";day.textContent=String(d).padStart(2,"0");const month=document.createElement("span");month.className="agenda-month";month.textContent=nomesMesesCurto[m-1];date.append(day,month);
      const content=document.createElement("div");content.className="agenda-content";const tag=document.createElement("span");tag.className="agenda-tag "+aviso.categoria;tag.textContent=categorias[aviso.categoria]||"Aviso";const title=document.createElement("h5");title.textContent=aviso.titulo;const desc=document.createElement("p");desc.textContent=aviso.descricao;desc.hidden=!aviso.descricao;const time=document.createElement("small");const icon=document.createElement("i");icon.className="bi bi-clock me-1";time.append(icon,document.createTextNode(aviso.horario||"Horário não informado"));content.append(tag,title,desc,time);const arrow=document.createElement("i");arrow.className="bi bi-chevron-right agenda-arrow";item.append(date,content,arrow);item.addEventListener("click",()=>abrirAviso(aviso));agendaContainer.append(item);
    });
    if(agendaEmpty) agendaEmpty.classList.toggle("d-none",proximos.length>0);
  }
  function createDayElement(dayNumber, otherMonth) {
    const element=document.createElement("div"); element.className="calendar-day";
    if(otherMonth){element.classList.add("other-month");const n=document.createElement("span");n.className="calendar-day-number";n.textContent=dayNumber;element.append(n);return element;}
    const year=currentDate.getFullYear(),month=currentDate.getMonth();
    const dateString=year+"-"+String(month+1).padStart(2,"0")+"-"+String(dayNumber).padStart(2,"0");
    const now=new Date(); if(dayNumber===now.getDate()&&month===now.getMonth()&&year===now.getFullYear())element.classList.add("today");
    const n=document.createElement("span");n.className="calendar-day-number";n.textContent=dayNumber;element.append(n);
    const events=document.createElement("div");events.className="calendar-events";
    const dayAvisos=avisos.filter(a=>a.data===dateString);
    const avisosVisiveis=dayAvisos.filter(a=>filtroAtual==="todos"||a.categoria===filtroAtual);
    avisosVisiveis.slice(0,3).forEach(aviso=>{
      const event=document.createElement("button");
      event.type="button";
      event.className="calendar-event "+aviso.categoria+(Number(aviso.ocorrido)===1?" ocorrido":"");
      event.title=Number(aviso.ocorrido)===1?"Ocorrido: "+aviso.titulo:aviso.titulo;
      const titleSpan = document.createElement("span");
      titleSpan.className = "calendar-event-title";
      titleSpan.textContent = aviso.titulo;
      event.append(titleSpan);
      if (Number(aviso.ocorrido) === 1) {
        event.setAttribute("aria-label", "Ocorrido: " + aviso.titulo);
      } else {
        event.setAttribute("aria-label", aviso.titulo);
      }
      event.addEventListener("click",(e)=>{e.stopPropagation();abrirAviso(aviso);});
      events.append(event);
    });
    const reservasDoDia=reservasQuadra
      .filter(r=>String(r.inicio||"").slice(0,10)===dateString)
      .filter(r=>r.tipo==="publicacao" || ["pendente","aprovado"].includes(r.status));
    // Uma reserva por faixa de horário: se houver registros duplicados, prioriza a pendente.
    const reservasUnicas=new Map();
    reservasDoDia.forEach(r=>{
      const chave=r.tipo==="publicacao"?"pub:"+r.id:String(r.inicio).slice(0,16)+"|"+String(r.fim).slice(0,16);
      const anterior=reservasUnicas.get(chave);
      if(!anterior || (anterior.status!=="pendente" && r.status==="pendente")) reservasUnicas.set(chave,r);
    });
    reservasUnicas.forEach(reserva=>{
      const event=document.createElement("button");
      event.type="button";
      const pendente=reserva.tipo!=="publicacao" && reserva.status==="pendente";
      event.className="calendar-event tc-reserva-quadra"+(pendente?" tc-reserva-pendente":"");
      const pessoa=reserva.solicitante||"Aluno não identificado";
      event.title=reserva.tipo==="publicacao"?"Jogo na Quadra: "+(reserva.titulo||""):("Quadra · "+pessoa+" · "+(pendente?"Aguardando autorização":"Autorizada"));
      const label=document.createElement("span");
      label.className="calendar-event-title";
      label.textContent=reserva.tipo==="publicacao"?"Jogo: "+(reserva.titulo||"Publicação"):(pendente?"Quadra · Pendente":"Quadra · "+pessoa);
      event.append(label);
      event.addEventListener("click",e=>{e.stopPropagation();abrirDetalheReserva(reserva);});
      events.append(event);
    });
    element.append(events);
    const temReserva=reservasQuadra.some(r=>String(r.inicio||"").slice(0,10)===dateString);
    if(avisosVisiveis.length||temReserva){element.classList.add("has-events");element.tabIndex=0;element.setAttribute("role","button");element.setAttribute("aria-label",(avisosVisiveis.length+" aviso(s), "+(temReserva?"reserva de quadra":"sem reserva de quadra")+" em "+formatarData(dateString)));if(avisosVisiveis.length){element.addEventListener("click",()=>abrirAviso(avisosVisiveis[0]));element.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();abrirAviso(avisosVisiveis[0]);}});}}
    return element;
  }
  function renderCalendar(){
    const year=currentDate.getFullYear(),month=currentDate.getMonth();calendarMonth.textContent=nomesMeses[month]+" "+year;calendarDays.replaceChildren();
    const firstDay=new Date(year,month,1).getDay(),lastDate=new Date(year,month+1,0).getDate(),previousLastDate=new Date(year,month,0).getDate();
    for(let i=firstDay-1;i>=0;i--)calendarDays.append(createDayElement(previousLastDate-i,true));
    for(let day=1;day<=lastDate;day++)calendarDays.append(createDayElement(day,false));
    const remaining=(7-(calendarDays.children.length%7))%7;for(let day=1;day<=remaining;day++)calendarDays.append(createDayElement(day,true));
  }
  function aplicarFiltro(filtro){
    filtroAtual = filtro || "todos";
    document.querySelectorAll(".avisos-filter").forEach(btn=>{const ativo=btn.dataset.filter===filtro;btn.classList.toggle("active",ativo);btn.classList.toggle("btn-danger",ativo);btn.classList.toggle("btn-outline-secondary",!ativo);});
    document.querySelectorAll("#agendaAvisos .agenda-item").forEach(item=>{item.style.display=filtroAtual==="todos"||item.dataset.category===filtroAtual?"flex":"none";});
    document.querySelectorAll("#calendarDays .calendar-day").forEach(day=>{const events=[...day.querySelectorAll(".calendar-event")];events.forEach(event=>{event.style.display=event.classList.contains("tc-reserva-quadra")||filtroAtual==="todos"||event.classList.contains(filtroAtual)?"":"none";});const visible=events.some(event=>event.style.display!=="none");day.classList.toggle("has-events",visible);});
    if(agendaEmpty){const visiveis=[...document.querySelectorAll("#agendaAvisos .agenda-item")].some(item=>item.style.display!=="none");agendaEmpty.classList.toggle("d-none",visiveis);}
  }
  document.querySelectorAll(".avisos-filter").forEach(button=>button.addEventListener("click",()=>aplicarFiltro(button.dataset.filter||"todos")));
  previousButton?.addEventListener("click",()=>{currentDate.setMonth(currentDate.getMonth()-1);renderCalendar();});
  nextButton?.addEventListener("click",()=>{currentDate.setMonth(currentDate.getMonth()+1);renderCalendar();});
  todayButton?.addEventListener("click",()=>{currentDate=new Date();renderCalendar();});
  async function carregarAvisosCalendario(dataAlvo = "") {
    try {
      const response = await fetch("/api/avisos", { cache: "no-store" });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error("A API de avisos respondeu HTTP " + response.status + ". Reinicie o servidor com a versão atual do projeto.");
      if (!Array.isArray(data)) throw new Error("A API de avisos retornou um formato inesperado.");
      const token=sessionStorage.getItem("techcampus_token")||"";
      try {
        const reservasResponse=await fetch("/api/agendamentos/calendario",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
        reservasQuadra=reservasResponse.ok?await reservasResponse.json():[];
      } catch { reservasQuadra=[]; }
      const avisosUnicos = new Map();
      data
        .filter(a => Number(a.publicado ?? 1) === 1)
        .map(a => ({
          id: Number(a.id),
          titulo: String(a.titulo || "Aviso"),
          categoria: categoriaValida.includes(a.categoria) ? a.categoria : "importante",
          data: String(a.data_evento || a.criado_em || "").trim().slice(0, 10),
          horario: String(a.horario || ""),
          local: String(a.local || ""),
          descricao: String(a.conteudo || ""),
          ocorrido: Number(a.ocorrido || 0)
        }))
        .filter(a => /^\d{4}-\d{2}-\d{2}$/.test(a.data))
        // Reservas/publicações da Quadra já são exibidas diretamente no calendário.
        // Evita repetir o mesmo acontecimento quando também existe um aviso manual
        // relacionado à Quadra na tabela de avisos.
        .filter(a => {
          const textoAviso = [a.titulo, a.local, a.descricao].join(" ").toLocaleLowerCase("pt-BR");
          const mencionaQuadra = /quadra/i.test(textoAviso);
          const existeItemQuadraNoDia = reservasQuadra.some(r =>
            String(r.inicio || "").slice(0, 10) === a.data
          );
          return !(mencionaQuadra && existeItemQuadraNoDia);
        })
        .forEach(a => {
          // Um mesmo aviso não deve aparecer duas vezes no mesmo dia
          // apenas porque foi cadastrado com locais/descrições diferentes.
          const chave = [a.titulo, a.data].map(v=>String(v||"").trim().toLocaleLowerCase("pt-BR")).join("|");
          if (!avisosUnicos.has(chave)) avisosUnicos.set(chave,a);
        });
      avisos = [...avisosUnicos.values()];
      if (dataAlvo && /^\d{4}-\d{2}-\d{2}$/.test(dataAlvo)) {
        const [ano, mes] = dataAlvo.split("-").map(Number);
        currentDate = new Date(ano, mes - 1, 1);
      }
      statusCalendar.textContent = avisos.length
        ? avisos.length + " aviso(s) publicado(s)."
        : "Nenhum aviso publicado com data válida.";
      statusCalendar.classList.remove("text-danger");
    } catch (error) {
      console.error("Erro ao carregar avisos do calendário:", error);
      avisos = [];
      statusCalendar.textContent = "Não foi possível carregar os avisos. " + error.message;
      statusCalendar.classList.add("text-danger");
    }
    renderCalendar();
    renderAgenda();
    aplicarFiltro(filtroAtual);
  }
  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "btn btn-outline-secondary btn-sm ms-2";
  refreshButton.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Atualizar calendário';
  refreshButton.addEventListener("click", () => carregarAvisosCalendario());
  (todayButton?.parentElement || calendarMonth?.parentElement)?.append(refreshButton);

  document.addEventListener("tc-avisos-atualizados", (event) => {
    carregarAvisosCalendario(event.detail?.data || "");
  });

  document.getElementById("modalAvisoEditar")?.addEventListener("click", (event) => {
    const aviso = avisos.find(item => String(item.id) === String(event.currentTarget.dataset.avisoId));
    if (!aviso) return;
    document.dispatchEvent(new CustomEvent("tc-editar-aviso", { detail: { aviso } }));
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById("avisoModal")).hide();
  });
  document.getElementById("modalAvisoOcorrido")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const response = await fetch("/api/avisos/" + encodeURIComponent(button.dataset.avisoId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (sessionStorage.getItem("techcampus_token") || "") },
        body: JSON.stringify({ ocorrido: Number(button.dataset.ocorrido) })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.erro || "Não foi possível atualizar o aviso.");
      const id = button.dataset.avisoId;
      await carregarAvisosCalendario();
      const atualizado = avisos.find(item => String(item.id) === String(id));
      if (atualizado) abrirAviso(atualizado);
    } catch (error) {
      window.alert(error.message || "Erro ao atualizar o aviso.");
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById("modalAvisoExcluir")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!window.confirm("Excluir este aviso do calendário?")) return;
    button.disabled = true;
    try {
      const response = await fetch("/api/avisos/" + encodeURIComponent(button.dataset.avisoId), {
        method: "DELETE",
        headers: { Authorization: "Bearer " + (sessionStorage.getItem("techcampus_token") || "") }
      });
      if (!response.ok) throw new Error("A API não confirmou a exclusão.");
      window.bootstrap.Modal.getOrCreateInstance(document.getElementById("avisoModal")).hide();
      await carregarAvisosCalendario();
    } catch (error) {
      window.alert(error.message || "Erro ao excluir o aviso.");
    } finally {
      button.disabled = false;
    }
  });
  window.addEventListener("hashchange", () => {
    if (location.hash === "#avisos") carregarAvisosCalendario();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && location.hash === "#avisos") carregarAvisosCalendario();
  });
  document.querySelectorAll('a[href="#avisos"]').forEach((link) => {
    link.addEventListener("click", () => carregarAvisosCalendario());
  });
  await carregarAvisosCalendario();
});
