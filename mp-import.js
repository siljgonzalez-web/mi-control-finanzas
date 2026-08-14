// Mercado Pago · importación CSV sin credenciales ni tokens
(function(){
  function normalizeMPHeader(value){
    return String(value||"").replace(/^\uFEFF/,"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  }
  function detectCSVDelimiter(text){
    const lines=String(text||"").split(/\r?\n/).filter(x=>x.trim());
    const sample=lines.find(x=>/release_date|transaction_type|fecha|transaction/i.test(x))||lines[0]||"";
    const counts={",":0,";":0,"\t":0};
    let quoted=false;
    for(let i=0;i<sample.length;i++){
      const c=sample[i];
      if(c==='"'){
        if(quoted && sample[i+1]==='"'){i++;continue}
        quoted=!quoted;continue;
      }
      if(!quoted && Object.prototype.hasOwnProperty.call(counts,c))counts[c]++;
    }
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  }
  function parseCSVText(text){
    const delimiter=detectCSVDelimiter(text),rows=[];
    let row=[],field="",quoted=false;
    const src=String(text||"").replace(/^\uFEFF/,"");
    for(let i=0;i<src.length;i++){
      const c=src[i];
      if(quoted){
        if(c==='"' && src[i+1]==='"'){field+='"';i++}
        else if(c==='"')quoted=false;
        else field+=c;
      }else if(c==='"')quoted=true;
      else if(c===delimiter){row.push(field);field=""}
      else if(c==='\n'){
        row.push(field.replace(/\r$/,"") );field="";
        if(row.some(x=>String(x).trim()!==""))rows.push(row);
        row=[];
      }else field+=c;
    }
    row.push(field.replace(/\r$/,"") );
    if(row.some(x=>String(x).trim()!==""))rows.push(row);
    return rows;
  }
  function findMovementHeaderIndex(rows){
    for(let i=0;i<rows.length;i++){
      const h=rows[i].map(normalizeMPHeader);
      const hasDate=h.some(x=>["release_date","date","fecha","transaction_date","operation_date","movement_date"].includes(x));
      const hasAmount=h.some(x=>["transaction_net_amount","transaction_amount","amount","importe","monto","net_amount","settlement_net_amount","net_credit_amount","net_debit_amount"].includes(x));
      if(hasDate&&hasAmount)return i;
    }
    return 0;
  }
  function parseMPAmount(value){
    let s=String(value??"").trim();
    if(!s)return NaN;
    let negative=/^\(.*\)$/.test(s);
    s=s.replace(/[()$\s\u00A0]/g,"").replace(/[^0-9,.-]/g,"");
    if(!s)return NaN;
    if(s.includes(",") && s.includes(".")){
      if(s.lastIndexOf(",")>s.lastIndexOf("."))s=s.replace(/\./g,"").replace(",",".");
      else s=s.replace(/,/g,"");
    }else if(s.includes(",")){
      const parts=s.split(",");
      s=(parts.length===2 && parts[1].length<=2)?parts[0].replace(/\./g,"")+"."+parts[1]:s.replace(/,/g,"");
    }else if((s.match(/\./g)||[]).length>1){
      const last=s.lastIndexOf("."),dec=s.length-last-1;
      s=dec<=2?s.slice(0,last).replace(/\./g,"")+s.slice(last):s.replace(/\./g,"");
    }
    const n=Number(s);
    return Number.isFinite(n)?(negative?-Math.abs(n):n):NaN;
  }
  function parseMPDate(value){
    const s=String(value||"").trim();
    if(!s)return null;
    let m=s.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)/);
    if(m)return `${m[1]}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[3])).padStart(2,"0")}`;
    m=s.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})/);
    if(m)return `${m[3]}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[1])).padStart(2,"0")}`;
    const d=new Date(s);
    if(!Number.isNaN(d.getTime()))return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return null;
  }
  function pickMP(row,aliases){
    for(const key of aliases){if(row[key]!=null && String(row[key]).trim()!=="")return row[key]}
    return "";
  }
  function mpDirection(text,amount){
    // En los reportes de cuenta de Mercado Pago el signo es la señal más confiable.
    if(Number(amount)<0)return "expense";
    const t=normalizeMPHeader(text).replace(/_/g," ");
    const out=["retiro","withdrawal","debito","debit","gasto","compra","purchase","transferencia enviada","envio de dinero","transfer sent","money out","salida","pago enviado","payment sent","cargo","fee","comision","charge","pago con qr","pago sube"];
    const inc=["ingreso","credito","credit","cobro","venta","sale","received","recibido","transferencia recibida","acredit","money in","entrada","refund received","devolucion","rendimientos"];
    if(out.some(k=>t.includes(k)))return "expense";
    if(inc.some(k=>t.includes(k)))return "income";
    if(Number(amount)>0)return "income";
    return null;
  }
  function existingMPKeys(){
    const keys=new Set();
    for(const m of Object.values(data.months)){
      for(const x of [...(m.incomes||[]),...(m.expenses||[])])if(x.mpKey)keys.add(x.mpKey);
    }
    return keys;
  }
  function importMercadoPagoCSV(text,fileName){
    const rows=parseCSVText(text);
    if(rows.length<2)throw new Error("El CSV no tiene movimientos para importar.");

    // El estado de cuenta real trae un resumen arriba. Buscamos la fila donde empiezan los movimientos.
    const headerIndex=findMovementHeaderIndex(rows);
    const headers=rows[headerIndex].map(normalizeMPHeader);
    const dataRows=rows.slice(headerIndex+1);

    const dateAliases=["release_date","date","fecha","transaction_date","date_created","creation_date","approved_date","operation_date","movement_date"];
    const descAliases=["transaction_type","description","descripcion","detalle","detail","concept","concepto","transaction_detail","operation_description","reference","motivo"];
    const typeAliases=["transaction_type","movement_type","operation_type","type","tipo","transaction_status","source_type"];
    const idAliases=["reference_id","source_id","transaction_id","operation_id","payment_id","id","external_reference"];
    const amountAliases=["transaction_net_amount","transaction_amount","amount","importe","monto","settlement_net_amount","net_amount","total_amount","value"];
    const creditAliases=["net_credit_amount","credit_amount","credito","haber","income_amount","ingreso"];
    const debitAliases=["net_debit_amount","debit_amount","debito","debe","expense_amount","egreso"];
    const existing=existingMPKeys(),seenBase=new Map();
    let imported=0,incomes=0,expenses=0,duplicates=0,skipped=0;
    let incomeAmount=0,expenseAmount=0;
    const touched=new Set();

    for(let r=0;r<dataRows.length;r++){
      const vals=dataRows[r],obj={};headers.forEach((h,i)=>{if(h)obj[h]=vals[i]??""});
      const date=parseMPDate(pickMP(obj,dateAliases));
      const desc=String(pickMP(obj,descAliases)||pickMP(obj,typeAliases)||"Movimiento Mercado Pago").trim();
      const typeText=String(pickMP(obj,typeAliases)||"").trim();
      const sourceId=String(pickMP(obj,idAliases)||"").trim();
      let direction=null,amount=NaN;
      const credit=parseMPAmount(pickMP(obj,creditAliases)),debit=parseMPAmount(pickMP(obj,debitAliases));
      if(Number.isFinite(credit) && Math.abs(credit)>0){direction="income";amount=Math.abs(credit)}
      else if(Number.isFinite(debit) && Math.abs(debit)>0){direction="expense";amount=Math.abs(debit)}
      else{
        const raw=parseMPAmount(pickMP(obj,amountAliases));
        if(Number.isFinite(raw) && raw!==0){direction=mpDirection(typeText+" "+desc,raw);amount=Math.abs(raw)}
      }
      if(!date || !(amount>0) || !direction){skipped++;continue}
      const month=date.slice(0,7);
      const base=[date,amount.toFixed(2),normalizeMPHeader(desc),sourceId].join("|");
      const occurrence=(seenBase.get(base)||0)+1;seenBase.set(base,occurrence);
      const mpKey="mpcsv|"+base+"|"+occurrence;
      if(existing.has(mpKey)){duplicates++;continue}
      const m=ensureMonth(month),common={id:uid(),amount,date,reason:desc||"Mercado Pago",created:Date.now()+r,mpKey,source:"Mercado Pago CSV",mpFile:fileName||"",mpReference:sourceId};
      if(direction==="income"){
        m.incomes.push(common);incomes++;incomeAmount+=amount;
      }else{
        m.expenses.push({...common,category:"Mercado Pago"});expenses++;expenseAmount+=amount;
      }
      existing.add(mpKey);touched.add(month);imported++;
    }
    if(imported){save();renderAll()}
    return {imported,incomes,expenses,incomeAmount,expenseAmount,duplicates,skipped,months:[...touched].sort()};
  }

  const oldBtn=document.querySelector("#mpImportBtn");
  const oldInput=document.querySelector("#mpFileInput");
  if(!oldBtn||!oldInput)return;

  // Reemplaza los nodos para quitar el listener provisional de versiones anteriores.
  const btn=oldBtn.cloneNode(true);
  oldBtn.replaceWith(btn);
  const input=oldInput.cloneNode(true);
  oldInput.replaceWith(input);

  btn.setAttribute("aria-label","Importar CSV de Mercado Pago");
  btn.setAttribute("title","Importar Mercado Pago");
  btn.addEventListener("click",()=>input.click());
  input.addEventListener("change",async()=>{
    const file=input.files&&input.files[0];
    if(!file)return;
    try{
      const text=await file.text();
      const result=importMercadoPagoCSV(text,file.name);
      const monthText=result.months.length?`\nMeses cargados: ${result.months.map(labelMonth).join(", ")}`:"";
      const expenseText=result.expenses?`\nGastos: ${result.expenses} · ${money(result.expenseAmount)}`:"";
      const incomeText=result.incomes?`\nEntradas: ${result.incomes} · ${money(result.incomeAmount)}`:"";
      alert(result.imported
        ? `Mercado Pago importado ✅${expenseText}${incomeText}${result.duplicates?`\n${result.duplicates} duplicados ignorados.`:""}${result.skipped?`\n${result.skipped} filas no reconocidas.`:""}${monthText}`
        : `No se agregaron movimientos nuevos.${result.duplicates?`\n${result.duplicates} ya estaban importados.`:""}${result.skipped?`\n${result.skipped} filas no pudieron interpretarse.`:""}`);
    }catch(err){
      console.error(err);
      alert("No pude interpretar ese CSV de Mercado Pago. Probá con el reporte de movimientos descargado directamente desde Mercado Pago.");
    }finally{input.value=""}
  });
})();
