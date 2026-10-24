"use strict";
const quantity = document.getElementById('quantity'), status = document.getElementById('status'), pay = document.getElementById('pay');
let reviewed = false;
async function post(path, body) {
 const response = await fetch(path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data = await response.json(); if(!response.ok) throw Error(data.error); return data;
}
async function run(fn) { try {await fn();} catch(e) {status.textContent=e.message;} }
quantity.onchange=()=>{reviewed=false;pay.disabled=true;document.getElementById('amount').textContent='Review the updated amount.';};
document.getElementById('quote').onclick=()=>run(async()=>{const q=await post('/quote',{quantity:Number(quantity.value)});document.getElementById('amount').textContent='First month: R'+q.zar+' → USD '+q.value+' at test rate '+q.test_usd_per_zar+' USD/ZAR. Service after month 6: R'+q.service_zar+'/month. No recurring payment created.';reviewed=true;pay.disabled=false;});
pay.onclick=()=>run(async()=>{if(!reviewed)return;pay.disabled=true;try{const r=await post('/orders',{quantity:Number(quantity.value)});sessionStorage.setItem('mzansi-sandbox-order',r.id);location.assign(r.approval);}finally{pay.disabled=false;}});
const params=new URLSearchParams(location.search), capture=document.getElementById('capture');
if(params.has('approved')){capture.hidden=false;status.textContent='PayPal returned. Payment is only confirmed after server verification.';}
if(params.has('cancelled'))status.textContent='Checkout cancelled. No capture requested.';
capture.onclick=()=>run(async()=>{capture.disabled=true;try{const id=sessionStorage.getItem('mzansi-sandbox-order');if(!id)throw Error('No order in this browser session.');const r=await post('/capture',{id});status.textContent='Sandbox payment confirmed: '+r.currency+' '+r.value+'. No real order fulfilled.';capture.hidden=true;}finally{capture.disabled=false;}});
