"use strict";

const STORAGE_KEY="mi-control-v20";
const q=s=>document.querySelector(s);
const qa=s=>[...document.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:2}).format(Number(n)||0);
const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
const monthNames=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const fixedPayments=[
 {id:"go-0818",due:"2026-08-18",amount:55814.12,title:"GO premium",sub:"Cuota 4 de 4 · Última cuota"},
 {id:"go-0822",due:"2026-08-22",amount:12782.07,title:"GO premium",sub:"Cuota 1 de 2 · Falta 1 cuota"},
 {id:"go-0824a",due:"2026-08-24",amount:12782.07,title:"GO premium",sub:"Cuota 1 de 2 · Falta 1 cuota"},
 {id:"go-0824b",due:"2026-08-24",amount:21683.16,title:"GO premium",sub:"Cuota 2 de 3 · Falta 1 cuota"},
 {id:"mp-0901",due:"2026-09-01",amount:19708.87,title:"Crédito Mercado Pago",sub:"Incluye 5 cargos agrupados"},
 {id:"go-0902",due:"2026-09-02",amount:18401.08,title:"GO premium",sub:"Cuota 1 de 2 · Falta 1 cuota"},
 {id:"go-0921",due:"2026-09-21",amount:12782.08,title:"GO premium",sub:"Cuota 2 de 2 · Última cuota"},
 {id:"go-0923a",due:"2026-09-23",amount:12782.08,title:"GO premium",sub:"Cuota 2 de 2 · Última cuota"},
 {id:"go-0923b",due:"2026-09-23",amount:21683.15,title:"GO premium",sub:"Cuota 3 de 3 · Última cuota"},
 {id:"go-1002",due:"2026-10-02",amount:18401.08,title:"GO premium",sub:"Cuota 2 de 2 · Última cuota"}
];

let storageOK=true;
function load(){
 try{
   const raw=localStorage.getItem(STORAGE_KEY);
   if(raw)return JSON.parse(raw);
 }catch(e){storageOK=false}
 return {selectedMonth:null,months:{},paidFixed:{}};
}
let data=load();
if(!data.months)data.months={};
if(!data.paidFixed)data.paidFixed={};
if(!data.paidFixedAt)data.paidFixedAt={};
if(!data.removedFixed)data.removedFixed={};

let movementFilter="all";
let movementPage=1;
const MOVEMENTS_PER_PAGE=15;

function save(){
 try{
   localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
   storageOK=true;
 }catch(e){storageOK=false}
}

function currentISODate(){
 const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
 return d.toISOString().slice(0,10);
}
function currentMonthDefault(){
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function ensureMonth(key){
 if(!data.months[key]){
   data.months[key]={forecast:0,incomes:[],expenses:[],bills:[],savingTarget:0,saved:0};
 }
 const m=data.months[key];
 if(!Array.isArray(m.incomes))m.incomes=[];
 if(!Array.isArray(m.expenses))m.expenses=[];
 if(!Array.isArray(m.bills))m.bills=[];
 if(m.forecast==null)m.forecast=0;
 if(m.savingTarget==null)m.savingTarget=0;
 if(m.saved==null)m.saved=0;
 return m;
}
function selectedMonth(){return q("#monthPicker").value}
function labelMonth(key){
 const [y,m]=key.split("-").map(Number);
 return `${monthNames[m-1]} ${y}`;
}
function fillMonths(){
 const sel=q("#monthPicker");
 let out="";
 for(let y=2025;y<=2028;y++){
   for(let m=1;m<=12;m++){
     const k=`${y}-${String(m).padStart(2,"0")}`;
     out+=`<option value="${k}">${monthNames[m-1]} ${y}</option>`;
   }
 }
 sel.innerHTML=out;
 const preferred=data.selectedMonth || currentMonthDefault();
 sel.value=[...sel.options].some(o=>o.value===preferred)?preferred:"2026-08";
 data.selectedMonth=sel.value; save();
}
function setFormDates(){
 const k=selectedMonth(),today=currentISODate();
 const val=today.startsWith(k)?today:k+"-01";
 q("#incomeDate").value=val;
 q("#expenseDate").value=val;
 q("#billDue").value=val;
}
function fixedForMonth(key){return fixedPayments.filter(p=>p.due.startsWith(key) && !data.removedFixed[p.id])}
function customBillsAll(){
 return Object.entries(data.months).flatMap(([month,m])=>(m.bills||[]).map(b=>({...b,month,custom:true})));
}
function isPaidPayment(p){return p.custom ? !!p.paid : !!data.paidFixed[p.id]}
function selectedTotals(){
 const key=selectedMonth(),m=ensureMonth(key);
 const income=m.incomes.reduce((s,x)=>s+Number(x.amount),0);
 const expenses=m.expenses.reduce((s,x)=>s+Number(x.amount),0);
 const fixedMonth=fixedForMonth(key);
 const fixedPaid=fixedMonth.filter(isPaidPayment).reduce((s,x)=>s+x.amount,0);
 const fixedPending=fixedMonth.filter(x=>!isPaidPayment(x)).reduce((s,x)=>s+x.amount,0);
 const customPaid=m.bills.filter(x=>x.paid).reduce((s,x)=>s+Number(x.amount),0);
 const customPending=m.bills.filter(x=>!x.paid).reduce((s,x)=>s+Number(x.amount),0);
 const paid=fixedPaid+customPaid;
 const pending=fixedPending+customPending;
 const used=expenses+paid+Number(m.saved||0);
 const remaining=income-used;
 const safe=income-expenses-paid-pending-Number(m.savingTarget||0);
 return {m,income,expenses,paid,pending,used,remaining,safe};
}
function daysUntil(dateStr){
 const now=new Date();
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const d=new Date(dateStr+"T12:00:00");
 const due=new Date(d.getFullYear(),d.getMonth(),d.getDate());
 return Math.round((due-today)/86400000);
}
function daysRemainingMonth(key){
 const [y,m]=key.split("-").map(Number),today=new Date(),last=new Date(y,m,0);
 if(today.getFullYear()===y && today.getMonth()+1===m)return Math.max(1,last.getDate()-today.getDate()+1);
 if(new Date(y,m-1,1)>today)return last.getDate();
 return 1;
}
function allPayments(){
 return [
   ...fixedPayments.filter(x=>!data.removedFixed[x.id]).map(x=>({...x,custom:false})),
   ...customBillsAll().map(x=>({
     id:x.id,due:x.due,amount:Number(x.amount),title:x.reason||x.category||"Cuenta",
     sub:x.category||"Cuenta",custom:true,month:x.month,paid:!!x.paid
   }))
 ].sort((a,b)=>a.due.localeCompare(b.due));
}
function escapeHTML(s){
 return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function monthMovements(key=selectedMonth()){
 const m=ensureMonth(key);
 const movements=[];

 m.incomes.forEach(x=>movements.push({
   id:x.id,type:"income",source:"manual",date:x.date,amount:Number(x.amount),
   title:x.reason||"Ingreso",meta:"Entrada",created:Number(x.created)||0
 }));

 m.expenses.forEach(x=>movements.push({
   id:x.id,type:"expense",source:"manual",date:x.date,amount:Number(x.amount),
   title:x.reason||x.category||"Gasto",meta:x.category||"Gasto",created:Number(x.created)||0
 }));

 fixedForMonth(key).filter(isPaidPayment).forEach(p=>movements.push({
   id:"fixed-"+p.id,paymentId:p.id,type:"expense",source:"fixed-payment",
   date:p.due,amount:Number(p.amount),title:p.title,meta:p.sub||"Cuota / deuda",
   created:Number(data.paidFixedAt[p.id])||0
 }));

 m.bills.filter(x=>x.paid).forEach(x=>movements.push({
   id:"billpay-"+x.id,paymentId:x.id,type:"expense",source:"custom-payment",
   date:x.due||key+"-01",amount:Number(x.amount),title:x.reason||x.category||"Cuenta",
   meta:x.category||"Cuenta",created:Number(x.paidAt)||Number(x.created)||0
 }));

 return movements.sort((a,b)=>{
   const d=(b.date||"").localeCompare(a.date||"");
   if(d!==0)return d;
   return (Number(b.created)||0)-(Number(a.created)||0);
 });
}

function movementRow(x,allowDelete=true){
 const incoming=x.type==="income";
 const locked=x.source==="fixed-payment"||x.source==="custom-payment";
 const cls=incoming?"in":"out";
 const icon=incoming?"↑":"↓";
 const sign=incoming?"+":"−";
 let action="";
 if(allowDelete && x.source==="manual"){
   action=incoming
    ? `<button class="deleteBtn" data-delete-income="${x.id}" type="button">Eliminar</button>`
    : `<button class="deleteBtn" data-delete-expense="${x.id}" type="button">Eliminar</button>`;
 }
 const paymentClass=locked?" paymentExpense":"";
 const safeDate=x.date?new Date(x.date+"T12:00:00").toLocaleDateString("es-AR"):"";
 return `<div class="flowRow ${cls}${paymentClass}">
   <div class="flowIcon">${icon}</div>
   <div>
     <div class="flowTitle">${escapeHTML(x.title)}</div>
     <div class="flowMeta">${escapeHTML(x.meta||"")} · ${safeDate}</div>
   </div>
   <div>
     <div class="flowAmount">${sign} ${money(x.amount)}</div>
     ${action}
   </div>
 </div>`;
}

function renderRecentMovements(){
 const all=monthMovements(selectedMonth());
 const recent=all.slice(0,5);
 q("#recentMovementCount").textContent=`${Math.min(all.length,5)} de ${all.length}`;
 q("#recentMovements").innerHTML=recent.length
   ? recent.map(x=>movementRow(x,true)).join("")
   : '<div class="empty">Todavía no hay movimientos en este mes.</div>';
}

function renderAllMovements(){
 let items=monthMovements(selectedMonth());
 if(movementFilter!=="all")items=items.filter(x=>x.type===movementFilter);

 const totalPages=Math.max(1,Math.ceil(items.length/MOVEMENTS_PER_PAGE));
 movementPage=Math.min(Math.max(1,movementPage),totalPages);
 const start=(movementPage-1)*MOVEMENTS_PER_PAGE;
 const pageItems=items.slice(start,start+MOVEMENTS_PER_PAGE);

 q("#allMovementsMonthLabel").textContent=labelMonth(selectedMonth());
 q("#allMovementsList").innerHTML=pageItems.length
   ? pageItems.map(x=>movementRow(x,true)).join("")
   : '<div class="empty">No hay movimientos para este filtro.</div>';

 q("#movPageInfo").textContent=`${movementPage} de ${totalPages}`;
 q("#movPrev").disabled=movementPage<=1;
 q("#movNext").disabled=movementPage>=totalPages;

 qa("[data-movement-filter]").forEach(btn=>{
   btn.classList.toggle("active",btn.dataset.movementFilter===movementFilter);
 });
}
