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
 const sections=[{id:"inicio",nav:"#inicio"},{id:"ingresos",nav:"#ingresos"},{id:"cuotas",nav:"#cuotas"},{id:"ahorro",nav:"#ahorro"}];
 let active="#inicio",bestDistance=Infinity;
 sections.forEach(s=>{
   const el=document.getElementById(s.id);if(!el)return;
   const r=el.getBoundingClientRect();
   if(r.top<=marker&&r.bottom>=marker){active=s.nav;bestDistance=0;return}
   if(bestDistance===0)return;
   if(r.bottom>0&&r.top<window.innerHeight){const d=Math.min(Math.abs(r.top-marker),Math.abs(r.bottom-marker));if(d<bestDistance){bestDistance=d;active=s.nav}}
 });
 qa(".navBtn").forEach(btn=>btn.classList.toggle("active",btn.getAttribute("href")===active));
}
function openMovementsScreen(){movementPage=1;renderAllMovements();q("#mainPage").classList.add("hidden");q(".bottomNav").style.display="none";q("#movementsScreen").classList.add("open");window.scrollTo({top:0,behavior:"auto"})}
function closeMovementsScreen(){q("#movementsScreen").classList.remove("open");q("#mainPage").classList.remove("hidden");q(".bottomNav").style.display="";setTimeout(updateActiveNav,50)}
function ensureMpImportUI(){
 if(q("#mpImportBtn"))return;
 const recent=q(".recentHead");if(!recent)return;
 const wrap=document.createElement("div");wrap.className="mpImportBox";
 wrap.innerHTML='<button id="mpImportBtn" class="mpImportBtn" type="button" aria-label="Importar Mercado Pago"><span class="mpImportLogo">MP</span></button><input id="mpFileInput" type="file" accept=".csv,text/csv" hidden>';
 recent.parentNode.insertBefore(wrap,recent);
}

function mpNorm(v){return String(v||"").replace(/^\uFEFF/,"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")}
function mpDelimiter(text){const l=(String(text).split(/\r?\n/).find(x=>x.trim())||"");const c={",":0,";":0,"\t":0};let qd=false;for(let i=0;i<l.length;i++){if(l[i]==='"'){if(qd&&l[i+1]==='"'){i++;continue}qd=!qd}else if(!qd&&c[l[i]]!=null)c[l[i]]++}return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]}
function mpParseCSV(text){const d=mpDelimiter(text),rows=[];let row=[],f="",quoted=false,s=String(text||"").replace(/^\uFEFF/,"");for(let i=0;i<s.length;i++){const ch=s[i];if(quoted){if(ch==='"'&&s[i+1]==='"'){f+='"';i++}else if(ch==='"')quoted=false;else f+=ch}else if(ch==='"')quoted=true;else if(ch===d){row.push(f);f=""}else if(ch==='\n'){row.push(f.replace(/\r$/,"") );f="";if(row.some(x=>String(x).trim()))rows.push(row);row=[]}else f+=ch}row.push(f.replace(/\r$/,"") );if(row.some(x=>String(x).trim()))rows.push(row);return rows}
function mpAmount(v){let s=String(v??"").trim();if(!s)return NaN;let neg=/^\(.*\)$/.test(s);s=s.replace(/[()$\s\u00A0]/g,"").replace(/[^0-9,.-]/g,"");if(s.includes(",")&&s.includes(".")){s=s.lastIndexOf(",")>s.lastIndexOf(".")?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"")}else if(s.includes(",")){const p=s.split(",");s=p.length===2&&p[1].length<=2?p[0].replace(/\./g,"")+"."+p[1]:s.replace(/,/g,"")}const n=Number(s);return Number.isFinite(n)?(neg?-Math.abs(n):n):NaN}
function mpDate(v){const s=String(v||"").trim();let m=s.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,"0")}-${String(+m[3]).padStart(2,"0")}`;m=s.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,"0")}-${String(+m[1]).padStart(2,"0")}`;return null}
function mpPick(o,a){for(const k of a)if(o[k]!=null&&String(o[k]).trim())return o[k];return ""}
function mpDirection(text,amount){const t=mpNorm(text).replace(/_/g," ");if(["retiro","debito","gasto","compra","purchase","envio","pago enviado","cargo","comision","fee","debit"].some(k=>t.includes(k)))return "expense";if(["ingreso","credito","cobro","venta","sale","received","recibido","acredit","entrada","devolucion"].some(k=>t.includes(k)))return "income";return amount<0?"expense":amount>0?"income":null}
function importMercadoPagoCSV(text,fileName){
 const rows=mpParseCSV(text);if(rows.length<2)throw new Error("CSV vacío");
 const h=rows[0].map(mpNorm),dateA=["date","fecha","release_date","transaction_date","date_created","creation_date","approved_date","operation_date","movement_date"],descA=["description","descripcion","detalle","detail","concept","concepto","transaction_detail","operation_description","reference","motivo"],typeA=["transaction_type","movement_type","operation_type","type","tipo","transaction_status","source_type"],idA=["source_id","transaction_id","operation_id","payment_id","id","external_reference","reference_id"],amountA=["transaction_amount","amount","importe","monto","settlement_net_amount","net_amount","total_amount","value"],creditA=["net_credit_amount","credit_amount","credito","haber","income_amount","ingreso"],debitA=["net_debit_amount","debit_amount","debito","debe","expense_amount","egreso"];
 const existing=new Set();for(const m of Object.values(data.months))for(const x of [...(m.incomes||[]),...(m.expenses||[])])if(x.mpKey)existing.add(x.mpKey);
 const seen=new Map(),months=new Set();let imported=0,incomes=0,expenses=0,duplicates=0,skipped=0;
 for(let r=1;r<rows.length;r++){
  const o={};h.forEach((k,i)=>{if(k)o[k]=rows[r][i]??""});const date=mpDate(mpPick(o,dateA)),desc=String(mpPick(o,descA)||mpPick(o,typeA)||"Movimiento Mercado Pago").trim(),type=String(mpPick(o,typeA)||""),sid=String(mpPick(o,idA)||"").trim();let dir=null,amount=NaN;
  const cr=mpAmount(mpPick(o,creditA)),db=mpAmount(mpPick(o,debitA));if(Number.isFinite(cr)&&Math.abs(cr)>0){dir="income";amount=Math.abs(cr)}else if(Number.isFinite(db)&&Math.abs(db)>0){dir="expense";amount=Math.abs(db)}else{const raw=mpAmount(mpPick(o,amountA));if(Number.isFinite(raw)&&raw!==0){dir=mpDirection(type+" "+desc,raw);amount=Math.abs(raw)}}
  if(!date||!(amount>0)||!dir){skipped++;continue}
  const base=[date,amount.toFixed(2),mpNorm(desc),mpNorm(type),sid].join("|"),occ=(seen.get(base)||0)+1;seen.set(base,occ);const key="mpcsv|"+base+"|"+occ;if(existing.has(key)){duplicates++;continue}
  const m=ensureMonth(date.slice(0,7)),common={id:uid(),amount,date,reason:desc,created:Date.now()+r,mpKey:key,source:"Mercado Pago CSV",mpFile:fileName||""};if(dir==="income"){m.incomes.push(common);incomes++}else{m.expenses.push({...common,category:"Mercado Pago"});expenses++}existing.add(key);months.add(date.slice(0,7));imported++;
 }
 if(imported){save();renderAll()}return{imported,incomes,expenses,duplicates,skipped,months:[...months].sort()}
}

function bind(){
 ensureMpImportUI();
 const mpBtn=q("#mpImportBtn"),mpInput=q("#mpFileInput");
 if(mpBtn&&mpInput){
   mpBtn.addEventListener("click",()=>mpInput.click());
   mpInput.addEventListener("change",async()=>{
     const file=mpInput.files&&mpInput.files[0];if(!file)return;
     try{
       const result=importMercadoPagoCSV(await file.text(),file.name);
       const monthText=result.months.length?`\nMeses cargados: ${result.months.map(labelMonth).join(", ")}`:"";
       alert(result.imported?`Mercado Pago importado ✅\n${result.imported} movimientos nuevos: ${result.incomes} ingresos y ${result.expenses} gastos.${result.duplicates?`\n${result.duplicates} duplicados ignorados.`:""}${result.skipped?`\n${result.skipped} filas no reconocidas.`:""}${monthText}`:`No se agregaron movimientos nuevos.${result.duplicates?`\n${result.duplicates} ya estaban importados.`:""}${result.skipped?`\n${result.skipped} filas no pudieron interpretarse.`:""}`);
     }catch(err){console.error(err);alert("No pude interpretar ese CSV de Mercado Pago. Probá con el reporte de movimientos descargado directamente desde Mercado Pago.")}
     finally{mpInput.value=""}
   });
 }
 q("#viewMoreMovements").addEventListener("click",openMovementsScreen);
 q("#backMovements").addEventListener("click",closeMovementsScreen);
 qa("[data-movement-filter]").forEach(btn=>btn.addEventListener("click",()=>{movementFilter=btn.dataset.movementFilter;movementPage=1;renderAllMovements()}));
 q("#movPrev").addEventListener("click",()=>{if(movementPage>1){movementPage--;renderAllMovements()}});
 q("#movNext").addEventListener("click",()=>{movementPage++;renderAllMovements()});
 window.addEventListener("scroll",()=>requestAnimationFrame(updateActiveNav),{passive:true});
 window.addEventListener("resize",()=>requestAnimationFrame(updateActiveNav));
 q("#monthPicker").addEventListener("change",()=>{data.selectedMonth=selectedMonth();ensureMonth(selectedMonth());movementPage=1;save();setFormDates();renderAll()});
 q("#forecastToggle").addEventListener("click",()=>q("#forecastEdit").classList.toggle("open"));
 q("#forecastSave").addEventListener("click",()=>{const m=ensureMonth(selectedMonth());m.forecast=Math.max(0,Number(q("#forecastInput").value)||0);q("#forecastEdit").classList.remove("open");save();renderAll()});
 qa(".moveTab").forEach(btn=>btn.addEventListener("click",()=>{qa(".moveTab").forEach(x=>x.classList.toggle("active",x===btn));qa(".moveForm").forEach(f=>f.classList.toggle("active",f.dataset.form===btn.dataset.kind))}));
 q("#incomeAdd").addEventListener("click",addIncome);q("#expenseAdd").addEventListener("click",addExpense);q("#billAdd").addEventListener("click",addBill);
 q("#savingTargetSave").addEventListener("click",()=>{const m=ensureMonth(selectedMonth());m.savingTarget=Math.max(0,Number(q("#savingTargetInput").value)||0);save();renderAll()});
 q("#savingAdd").addEventListener("click",()=>{const v=Number(q("#savingAddInput").value);if(!(v>0))return alert("Poné cuánto querés ahorrar.");const m=ensureMonth(selectedMonth());m.saved=Number(m.saved||0)+v;q("#savingAddInput").value="";save();renderAll()});
 document.addEventListener("click",e=>{const rp=e.target.closest("[data-remove-payment]");if(rp)return removePayment(rp.dataset.removePayment,rp.dataset.custom==="1");const bi=e.target.closest("[data-delete-income]");if(bi)return deleteIncome(bi.dataset.deleteIncome);const be=e.target.closest("[data-delete-expense]");if(be)return deleteExpense(be.dataset.deleteExpense)});
 document.addEventListener("change",e=>{if(e.target.matches("[data-pay-id]"))togglePayment(e.target.dataset.payId,e.target.dataset.custom==="1",e.target.checked)});
 qa(".navBtn").forEach(btn=>btn.addEventListener("click",()=>setTimeout(updateActiveNav,80)));
}
fillMonths();ensureMonth(selectedMonth());setFormDates();bind();renderAll();
if(location.protocol!=="file:"&&"serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}
