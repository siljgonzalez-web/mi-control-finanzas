function renderHeader(){
 const {m,income,used,remaining}=selectedTotals();
 q("#heroAvailable").textContent=money(remaining);
 q("#heroIncome").textContent=money(income);
 q("#heroUsed").textContent=money(used);
 q("#forecastLabel").textContent=m.forecast?money(m.forecast):"Agregar";
 q("#forecastInput").value=m.forecast||"";
}
function renderIncome(){
 const {income}=selectedTotals();
 q("#incomeTotal").textContent=money(income);
 q("#incomeMonthLabel").textContent=labelMonth(selectedMonth());
 renderRecentMovements();
}
function renderExpenses(){
 // Los gastos se muestran dentro de Movimientos y Todos los movimientos.
}
function renderSummary(){
 const {income,used,remaining,pending,safe}=selectedTotals();
 const pct=income?used/income*100:0;
 const shownPct=Math.max(0,Math.round(pct));
 q("#percent").textContent=shownPct+"%";
 q("#remaining").textContent=money(remaining);
 q("#pending").textContent=money(pending);
 q("#used").textContent=money(used);
 q("#summaryDaily").textContent=money(Math.max(0,safe)/daysRemainingMonth(selectedMonth()));
 q("#summaryMonthLabel").textContent=labelMonth(selectedMonth());
 q("#ring").style.background=`conic-gradient(#111 ${Math.min(100,Math.max(0,pct))*3.6}deg,#e9e6df 0deg)`;
 let msg,bg,fg;
 if(!income){msg="Cargá el primer ingreso del mes para empezar.";bg="#f5f3ef";fg="#333"}
 else if(pct>=100){msg="🔴 El monto utilizado alcanzó o superó el total ingresado.";bg="#fff0ed";fg="#942d24"}
 else if(pct>=80){msg="🟠 El nivel de uso supera el 80% de los ingresos.";bg="#fff4e4";fg="#835000"}
 else if(pct>=50){msg="🟡 El nivel de uso supera la mitad de los ingresos.";bg="#fff9df";fg="#705d00"}
 else{msg="🟢 El nivel de uso se mantiene por debajo del 50% de los ingresos.";bg="#eaf7f0";fg="#226b4a"}
 q("#status").textContent=msg;q("#status").style.background=bg;q("#status").style.color=fg;
}
function renderPayments(){
 const list=allPayments();
 q("#paymentList").innerHTML=list.map(p=>{
   const paid=isPaidPayment(p),diff=daysUntil(p.due);
   const d=new Date(p.due+"T12:00:00");
   const mon=d.toLocaleDateString("es-AR",{month:"short"}).replace(".","").toUpperCase();
   const cls=paid?"paid":diff<0?"overdue":diff<=5?"dueSoon":"";
   let chip="";
   if(paid)chip='<span class="chip paid">Pagado</span>';
   else if(diff<0)chip=`<span class="chip late">Vencida hace ${Math.abs(diff)} día${Math.abs(diff)===1?"":"s"}</span>`;
   else if(diff===0)chip='<span class="chip warn">Vence hoy</span>';
   else if(diff<=5)chip=`<span class="chip warn">Vence en ${diff} día${diff===1?"":"s"}</span>`;
   return `<div class="payCard ${cls}">
    <div class="dateBox"><div class="dateDay">${String(d.getDate()).padStart(2,"0")}</div><div class="dateMon">${mon}</div></div>
    <div>
      <div class="payTitle">${escapeHTML(p.title)}</div>
      <div class="payMeta">${d.toLocaleDateString("es-AR",{day:"2-digit",month:"long",year:"numeric"})}</div>
      <div class="paySub">${escapeHTML(p.sub||"")}</div>
      ${chip}
      <label class="payCheck"><input type="checkbox" data-pay-id="${p.id}" data-custom="${p.custom?"1":"0"}" ${paid?"checked":""}> ${paid?"Pagado":"Marcar como pagado"}</label>
      <button class="removePaymentBtn" type="button" data-remove-payment="${p.id}" data-custom="${p.custom?"1":"0"}">Quitar cuota</button>
    </div>
    <div class="payAmount">${money(p.amount)}</div>
   </div>`;
 }).join("");
}
function renderAlerts(){
 const close=allPayments()
   .filter(p=>!isPaidPayment(p))
   .map(p=>({...p,diff:daysUntil(p.due)}))
   .filter(p=>p.diff<=5)
   .sort((a,b)=>a.due.localeCompare(b.due));
 const box=q("#dueAlerts");
 if(!close.length){box.style.display="none";box.innerHTML="";return}
 box.style.display="block";
 box.innerHTML=close.map(p=>{
   const late=p.diff<0;
   const when=late?`Venció hace ${Math.abs(p.diff)} día${Math.abs(p.diff)===1?"":"s"}`:p.diff===0?"Vence hoy":`Vence en ${p.diff} día${p.diff===1?"":"s"}`;
   return `<div class="dueAlert ${late?"late":"warn"}">
     <div class="dueIcon">${late?"!":"⏰"}</div>
     <div><div class="dueTitle">${escapeHTML(p.title)} — ${when}</div><div class="dueMeta">${money(p.amount)} · ${new Date(p.due+"T12:00:00").toLocaleDateString("es-AR")}</div></div>
   </div>`;
 }).join("");
}
function renderSavings(){
 const {m,safe}=selectedTotals();
 const target=Number(m.savingTarget)||0,saved=Number(m.saved)||0;
 const pct=target?Math.min(100,saved/target*100):0;
 q("#savingTargetLabel").textContent=money(target);
 q("#savedLabel").textContent=money(saved);
 q("#savingHint").textContent=target?`${Math.round(pct)}% de la meta`:"Sin meta";
 q("#saveProgressBar").style.width=pct+"%";
 q("#savingTargetInput").value=target||"";
 const daily=Math.max(0,safe)/daysRemainingMonth(selectedMonth());
 q("#dailyLimit").textContent=money(daily);
}
function renderAll(){
 renderHeader();renderIncome();renderSummary();renderPayments();renderAlerts();renderSavings();renderAllMovements();
 if(location.protocol!=="file:" && storageOK)q("#previewWarning").classList.add("hide");
 else q("#previewWarning").classList.remove("hide");
 requestAnimationFrame(updateActiveNav);
}
