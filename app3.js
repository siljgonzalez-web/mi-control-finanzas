function addIncome(){
 const amount=Number(q("#incomeAmount").value),date=q("#incomeDate").value,reason=q("#incomeReason").value.trim();
 if(!(amount>0))return alert("Poné un monto válido.");
 const m=ensureMonth(selectedMonth());
 m.incomes.push({id:uid(),amount,date,reason:reason||"Ingreso",created:Date.now()});
 q("#incomeAmount").value="";q("#incomeReason").value="";
 save();renderAll();
}
function addExpense(){
 const amount=Number(q("#expenseAmount").value),date=q("#expenseDate").value,category=q("#expenseCategory").value,reason=q("#expenseReason").value.trim();
 if(!(amount>0))return alert("Poné un monto válido.");
 const m=ensureMonth(selectedMonth());
 m.expenses.push({id:uid(),amount,date,category,reason:reason||category,created:Date.now()});
 q("#expenseAmount").value="";q("#expenseReason").value="";
 save();renderAll();
}
function addBill(){
 const amount=Number(q("#billAmount").value),due=q("#billDue").value,category=q("#billCategory").value,reason=q("#billReason").value.trim();
 if(!(amount>0))return alert("Poné un monto válido.");
 const m=ensureMonth(selectedMonth());
 m.bills.push({id:uid(),amount,due,category,reason:reason||category,paid:false,created:Date.now()});
 q("#billAmount").value="";q("#billReason").value="";
 save();renderAll();
}
function togglePayment(id,custom,checked){
 if(custom){
   for(const m of Object.values(data.months)){
     const b=(m.bills||[]).find(x=>x.id===id);
     if(b){
       b.paid=checked;
       if(checked)b.paidAt=Date.now(); else delete b.paidAt;
       break;
     }
   }
 }else{
   data.paidFixed[id]=checked;
   if(checked)data.paidFixedAt[id]=Date.now(); else delete data.paidFixedAt[id];
 }
 movementPage=1;
 save();renderAll();
}
function deleteIncome(id){
 const m=ensureMonth(selectedMonth());m.incomes=m.incomes.filter(x=>x.id!==id);save();renderAll();
}
function deleteExpense(id){
 const m=ensureMonth(selectedMonth());m.expenses=m.expenses.filter(x=>x.id!==id);save();renderAll();
}

function removePayment(id,custom){
 const ok=confirm("¿Querés quitar esta cuota? Se eliminará de la app y dejará de contar en los totales.");
 if(!ok)return;
 if(custom){
   for(const m of Object.values(data.months)){
     const idx=(m.bills||[]).findIndex(x=>x.id===id);
     if(idx>=0){m.bills.splice(idx,1);break}
   }
 }else{
   data.removedFixed[id]=true;
   delete data.paidFixed[id];
   delete data.paidFixedAt[id];
 }
 movementPage=1;
 save();renderAll();
}

function updateActiveNav(){
 if(q("#movementsScreen")?.classList.contains("open"))return;
 const marker=window.innerHeight*0.5;
 const sections=[
   {id:"inicio",nav:"#inicio"},
   {id:"ingresos",nav:"#ingresos"},
   {id:"cuotas",nav:"#cuotas"},
   {id:"ahorro",nav:"#ahorro"}
 ];
 let active="#inicio",bestDistance=Infinity;
 sections.forEach(s=>{
   const el=document.getElementById(s.id);
   if(!el)return;
   const r=el.getBoundingClientRect();
   if(r.top<=marker && r.bottom>=marker){
     active=s.nav;bestDistance=0;return;
   }
   if(bestDistance===0)return;
   if(r.bottom>0 && r.top<window.innerHeight){
     const distance=Math.min(Math.abs(r.top-marker),Math.abs(r.bottom-marker));
     if(distance<bestDistance){bestDistance=distance;active=s.nav}
   }
 });
 qa(".navBtn").forEach(btn=>btn.classList.toggle("active",btn.getAttribute("href")===active));
}

function openMovementsScreen(){
 movementPage=1;
 renderAllMovements();
 q("#mainPage").classList.add("hidden");
 q(".bottomNav").style.display="none";
 q("#movementsScreen").classList.add("open");
 window.scrollTo({top:0,behavior:"auto"});
}

function closeMovementsScreen(){
 q("#movementsScreen").classList.remove("open");
 q("#mainPage").classList.remove("hidden");
 q(".bottomNav").style.display="";
 setTimeout(updateActiveNav,50);
}

function ensureMpImportUI(){
 if(q("#mpImportBtn"))return;
 const recent=q(".recentHead");
 if(!recent)return;
 const wrap=document.createElement("div");
 wrap.className="mpImportBox";
 wrap.style.margin="12px 0 2px";
 wrap.innerHTML=`
   <button id="mpImportBtn" type="button" style="width:100%;border:1px solid #cfe8f7;background:#eef9ff;color:#111;border-radius:16px;padding:10px 12px;display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;text-align:left">
     <span aria-hidden="true" style="width:42px;height:42px;border-radius:50%;background:#009ee3;color:#fff;display:grid;place-items:center;font-size:13px;font-weight:950">MP</span>
     <span style="display:flex;flex-direction:column;gap:2px;min-width:0"><strong style="font-size:12px;font-weight:950">Importar Mercado Pago</strong><small style="font-size:9px;color:#557786">Seleccionar reporte CSV</small></span>
     <span aria-hidden="true" style="font-size:24px;color:#009ee3;font-weight:900">›</span>
   </button>
   <input id="mpFileInput" type="file" accept=".csv,text/csv" hidden>
   <div id="mpFileName" style="display:none;margin:7px 4px 0;font-size:9px;color:#77736d;overflow-wrap:anywhere"></div>`;
 recent.parentNode.insertBefore(wrap,recent);
}

function bind(){
 ensureMpImportUI();
 const mpBtn=q("#mpImportBtn"),mpInput=q("#mpFileInput"),mpName=q("#mpFileName");
 if(mpBtn&&mpInput){
   mpBtn.addEventListener("click",()=>mpInput.click());
   mpInput.addEventListener("change",()=>{
     const file=mpInput.files&&mpInput.files[0];
     if(!file)return;
     if(mpName){mpName.textContent="Archivo seleccionado: "+file.name;mpName.style.display="block";}
     alert("Listo, seleccionaste el reporte de Mercado Pago. Todavía no voy a importar movimientos hasta adaptar el lector al formato exacto de tu archivo.");
   });
 }
 q("#viewMoreMovements").addEventListener("click",openMovementsScreen);
 q("#backMovements").addEventListener("click",closeMovementsScreen);
 qa("[data-movement-filter]").forEach(btn=>btn.addEventListener("click",()=>{
   movementFilter=btn.dataset.movementFilter;
   movementPage=1;
   renderAllMovements();
 }));
 q("#movPrev").addEventListener("click",()=>{if(movementPage>1){movementPage--;renderAllMovements();}});
 q("#movNext").addEventListener("click",()=>{movementPage++;renderAllMovements();});
 window.addEventListener("scroll",()=>requestAnimationFrame(updateActiveNav),{passive:true});
 window.addEventListener("resize",()=>requestAnimationFrame(updateActiveNav));

 q("#monthPicker").addEventListener("change",()=>{
   data.selectedMonth=selectedMonth();ensureMonth(selectedMonth());movementPage=1;save();setFormDates();renderAll();
 });
 q("#forecastToggle").addEventListener("click",()=>q("#forecastEdit").classList.toggle("open"));
 q("#forecastSave").addEventListener("click",()=>{
   const m=ensureMonth(selectedMonth());m.forecast=Math.max(0,Number(q("#forecastInput").value)||0);
   q("#forecastEdit").classList.remove("open");save();renderAll();
 });
 qa(".moveTab").forEach(btn=>btn.addEventListener("click",()=>{
   qa(".moveTab").forEach(x=>x.classList.toggle("active",x===btn));
   qa(".moveForm").forEach(f=>f.classList.toggle("active",f.dataset.form===btn.dataset.kind));
 }));
 q("#incomeAdd").addEventListener("click",addIncome);
 q("#expenseAdd").addEventListener("click",addExpense);
 q("#billAdd").addEventListener("click",addBill);
 q("#savingTargetSave").addEventListener("click",()=>{
   const m=ensureMonth(selectedMonth());m.savingTarget=Math.max(0,Number(q("#savingTargetInput").value)||0);save();renderAll();
 });
 q("#savingAdd").addEventListener("click",()=>{
   const v=Number(q("#savingAddInput").value);if(!(v>0))return alert("Poné cuánto querés ahorrar.");
   const m=ensureMonth(selectedMonth());m.saved=Number(m.saved||0)+v;q("#savingAddInput").value="";save();renderAll();
 });
 document.addEventListener("click",e=>{
   const rp=e.target.closest("[data-remove-payment]");
   if(rp)return removePayment(rp.dataset.removePayment,rp.dataset.custom==="1");
   const bi=e.target.closest("[data-delete-income]");if(bi)return deleteIncome(bi.dataset.deleteIncome);
   const be=e.target.closest("[data-delete-expense]");if(be)return deleteExpense(be.dataset.deleteExpense);
 });
 document.addEventListener("change",e=>{
   if(e.target.matches("[data-pay-id]"))togglePayment(e.target.dataset.payId,e.target.dataset.custom==="1",e.target.checked);
 });
 qa(".navBtn").forEach(btn=>btn.addEventListener("click",()=>setTimeout(updateActiveNav,80)));
}

fillMonths();
ensureMonth(selectedMonth());
setFormDates();
bind();
renderAll();

if(location.protocol!=="file:" && "serviceWorker" in navigator){
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
