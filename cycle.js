// Mi Control · ciclos financieros del 10 al 10
// Internamente cada ciclo incluye desde el día 10 inclusive hasta el próximo día 10 exclusivo.

const CYCLE_START_DAY=10;

function nextMonthKey(key){
  const [y,m]=String(key).split("-").map(Number);
  const d=new Date(y,m,1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function prevMonthKey(key){
  const [y,m]=String(key).split("-").map(Number);
  const d=new Date(y,m-2,1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function cycleBounds(key){
  const next=nextMonthKey(key);
  return {
    start:`${key}-${String(CYCLE_START_DAY).padStart(2,"0")}`,
    end:`${next}-${String(CYCLE_START_DAY).padStart(2,"0")}`
  };
}

function dateInCycle(date,key){
  const d=String(date||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
  const {start,end}=cycleBounds(key);
  return d>=start && d<end;
}

function cycleKeyForDate(dateStr){
  const d=String(dateStr||currentISODate()).slice(0,10);
  const m=d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return currentMonthDefault();
  const key=`${m[1]}-${m[2]}`;
  return Number(m[3])>=CYCLE_START_DAY?key:prevMonthKey(key);
}

function currentMonthDefault(){
  return cycleKeyForDate(currentISODate());
}

function labelMonth(key){
  const [y,m]=String(key).split("-").map(Number);
  const next=nextMonthKey(key);
  const [ny,nm]=next.split("-").map(Number);
  const a=monthNames[m-1].slice(0,3).toLowerCase();
  const b=monthNames[nm-1].slice(0,3).toLowerCase();
  return `10 ${a} → 10 ${b} ${ny}`;
}

function fillMonths(){
  const sel=q("#monthPicker");
  let out="";
  for(let y=2025;y<=2028;y++){
    for(let m=1;m<=12;m++){
      const k=`${y}-${String(m).padStart(2,"0")}`;
      out+=`<option value="${k}">${labelMonth(k)}</option>`;
    }
  }
  sel.innerHTML=out;
  const preferred=data.selectedMonth || currentMonthDefault();
  sel.value=[...sel.options].some(o=>o.value===preferred)?preferred:currentMonthDefault();
  data.selectedMonth=sel.value;
  save();
}

function setFormDates(){
  const key=selectedMonth(),today=currentISODate(),{start,end}=cycleBounds(key);
  const val=today>=start&&today<end?today:start;
  q("#incomeDate").value=val;
  q("#expenseDate").value=val;
  q("#billDue").value=val;
}

function allCycleItems(kind,key,dateField){
  return Object.values(data.months).flatMap(m=>(m[kind]||[])).filter(x=>dateInCycle(x[dateField],key));
}

function fixedForMonth(key){
  return fixedPayments.filter(p=>dateInCycle(p.due,key) && !data.removedFixed[p.id]);
}

function customBillsForCycle(key){
  return Object.values(data.months).flatMap(m=>(m.bills||[])).filter(x=>dateInCycle(x.due,key));
}

function selectedTotals(){
  const key=selectedMonth(),m=ensureMonth(key);
  const incomes=allCycleItems("incomes",key,"date");
  const expensesList=allCycleItems("expenses",key,"date");
  const bills=customBillsForCycle(key);
  const income=incomes.reduce((s,x)=>s+Number(x.amount||0),0);
  const expenses=expensesList.reduce((s,x)=>s+Number(x.amount||0),0);
  const fixedCycle=fixedForMonth(key);
  const fixedPaid=fixedCycle.filter(isPaidPayment).reduce((s,x)=>s+Number(x.amount||0),0);
  const fixedPending=fixedCycle.filter(x=>!isPaidPayment(x)).reduce((s,x)=>s+Number(x.amount||0),0);
  const customPaid=bills.filter(x=>x.paid).reduce((s,x)=>s+Number(x.amount||0),0);
  const customPending=bills.filter(x=>!x.paid).reduce((s,x)=>s+Number(x.amount||0),0);
  const paid=fixedPaid+customPaid;
  const pending=fixedPending+customPending;
  const used=expenses+paid+Number(m.saved||0);
  const remaining=income-used;
  const safe=income-expenses-paid-pending-Number(m.savingTarget||0);
  return {m,income,expenses,paid,pending,used,remaining,safe};
}

function daysRemainingMonth(key){
  const {start,end}=cycleBounds(key);
  const todayISO=currentISODate();
  const startDate=new Date(start+"T00:00:00");
  const endDate=new Date(end+"T00:00:00");
  const today=new Date(todayISO+"T00:00:00");
  if(today<startDate)return Math.max(1,Math.round((endDate-startDate)/86400000));
  if(today>=endDate)return 1;
  return Math.max(1,Math.ceil((endDate-today)/86400000));
}

function monthMovements(key=selectedMonth()){
  const movements=[];

  allCycleItems("incomes",key,"date").forEach(x=>movements.push({
    id:x.id,type:"income",source:"manual",date:x.date,amount:Number(x.amount),
    title:x.reason||"Ingreso",meta:x.source==="Mercado Pago CSV"?"Mercado Pago · Entrada":"Entrada",created:Number(x.created)||0
  }));

  allCycleItems("expenses",key,"date").forEach(x=>movements.push({
    id:x.id,type:"expense",source:"manual",date:x.date,amount:Number(x.amount),
    title:x.reason||x.category||"Gasto",meta:x.category||"Gasto",created:Number(x.created)||0
  }));

  fixedForMonth(key).filter(isPaidPayment).forEach(p=>movements.push({
    id:"fixed-"+p.id,paymentId:p.id,type:"expense",source:"fixed-payment",
    date:p.due,amount:Number(p.amount),title:p.title,meta:p.sub||"Cuota / deuda",
    created:Number(data.paidFixedAt[p.id])||0
  }));

  customBillsForCycle(key).filter(x=>x.paid).forEach(x=>movements.push({
    id:"billpay-"+x.id,paymentId:x.id,type:"expense",source:"custom-payment",
    date:x.due,amount:Number(x.amount),title:x.reason||x.category||"Cuenta",
    meta:x.category||"Cuenta",created:Number(x.paidAt)||Number(x.created)||0
  }));

  return movements.sort((a,b)=>{
    const d=(b.date||"").localeCompare(a.date||"");
    if(d!==0)return d;
    return (Number(b.created)||0)-(Number(a.created)||0);
  });
}

function deleteIncome(id){
  for(const m of Object.values(data.months)){
    const before=(m.incomes||[]).length;
    m.incomes=(m.incomes||[]).filter(x=>x.id!==id);
    if(m.incomes.length!==before)break;
  }
  save();renderAll();
}

function deleteExpense(id){
  for(const m of Object.values(data.months)){
    const before=(m.expenses||[]).length;
    m.expenses=(m.expenses||[]).filter(x=>x.id!==id);
    if(m.expenses.length!==before)break;
  }
  save();renderAll();
}

function renderRecentMovements(){
  const all=monthMovements(selectedMonth());
  const recent=all.slice(0,5);
  q("#recentMovementCount").textContent=`${Math.min(all.length,5)} de ${all.length}`;
  q("#recentMovements").innerHTML=recent.length
    ? recent.map(x=>movementRow(x,true)).join("")
    : '<div class="empty">Todavía no hay movimientos en este ciclo.</div>';
}

// Reaplica la interfaz una vez cargados los scripts anteriores.
fillMonths();
ensureMonth(selectedMonth());
setFormDates();
movementPage=1;
renderAll();
