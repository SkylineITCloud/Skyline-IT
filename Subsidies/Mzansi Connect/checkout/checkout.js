"use strict";
const quantity=document.getElementById('quantity'),design=document.getElementById('design');
function update(){const count=Number(quantity.value),service=50+25*(count-1);document.getElementById('price').textContent='R'+(count*350+service)+' per month for the first six months, then R'+service+' per month for service. Total device instalments: R'+(count*2100)+'.';document.getElementById('enquiry').href='mailto:projectpstg@gmail.com?subject='+encodeURIComponent('Mzansi Connect '+design.value+' pre-order enquiry')+'&body='+encodeURIComponent('I am interested in '+count+' '+design.value+' pre-order device(s). Please confirm delivery, shipping, refund terms and the final rand payment schedule before payment.');}
quantity.addEventListener('change',update);design.addEventListener('change',update);update();

const pageParams=new URLSearchParams(location.search);
if(['Pendant','Wristband','Clip'].includes(pageParams.get('design')))design.value=pageParams.get('design');
if(/^(?:[1-9]|10)$/.test(pageParams.get('quantity')||''))quantity.value=pageParams.get('quantity');
function applyAppearance(theme){
 const choice=theme==='original'?'original':'purple';document.body.dataset.theme=choice;
 document.querySelectorAll('[data-appearance]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.appearance===choice)));
 const base=new URL('../',location.href),home=new URL(choice==='purple'?'Purple/index.html':'index.html',base);
 const pages={safety:'Livestock tracker/web/demo.html',app:'Mzansi Connect App/web/index.html',cloud:'Mzansi Cloud/web/index.html',marketplace:'Mzansi Marketplace/web/index.html'};
 document.querySelectorAll('[data-page]').forEach(a=>{const key=a.dataset.page;const target=key==='checkout'?new URL('checkout/index.html',base):key==='home'||key==='shop'?new URL(home):new URL('Product/'+pages[key],home);target.searchParams.set('theme',choice);if(key==='shop')target.hash='shop';if(key==='checkout'){target.searchParams.set('design',design.value);target.searchParams.set('quantity',quantity.value);}a.href=target.href;});
 const current=new URL(location.href);current.searchParams.set('theme',choice);history.replaceState(null,'',current);
}
document.querySelectorAll('[data-appearance]').forEach(b=>b.addEventListener('click',()=>applyAppearance(b.dataset.appearance)));
applyAppearance(pageParams.get('theme'));update();
