const SUPABASE_URL = 'https://hdgfmncycavoqjfeleem.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ogNczthN8mfe4kIczXC7yA_GMrzwixl';

const META_PIXEL_ID = '1483479293829689';
const META_CAPI_TOKEN = 'EAGVccZABOaOABSgREnJIl0ZBZBhy3wMRXpWGAutZBhaqKMI6sIIYhY3bCv7obc4yZChH17XujjJyyqso1F7AYPMVZAkwZAoLurHrPiHgBEaZCZA3JgWzk3CSsHRdx3e8Vc3V6h3ZCGhRCUZCmYFZBGae8D7zZA1ddDjknIaAXcURJUwOWx60lf8aNYZAmAk9ZBt7z0zRAbC3wZDZD';

// Canvas BG
(function(){
  const canvas = document.getElementById('bgCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let pts = [];
  function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;}
  resize(); window.addEventListener('resize',resize);
  for(let i=0;i<55;i++) pts.push({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:Math.random()*1.5+.5,a:Math.random()*.3+.07});
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=canvas.width;if(p.x>canvas.width)p.x=0;
      if(p.y<0)p.y=canvas.height;if(p.y>canvas.height)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(139,92,246,'+p.a+')';ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

let selectedType = '';

function handleSameCheck(){
  const cb=document.getElementById('sameCheck');
  const wa=document.getElementById('inp-wa');
  if(!cb||!wa) return;
  if(cb.checked){wa.value=document.getElementById('inp-phone').value;wa.disabled=true;}
  else{wa.disabled=false;}
}
const ph=document.getElementById('inp-phone');
if(ph) ph.addEventListener('input',function(){
  const cb=document.getElementById('sameCheck');
  if(cb&&cb.checked) document.getElementById('inp-wa').value=this.value;
});

function setBudget(el,val){
  document.getElementById('inp-budget').value=val;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('err-budget').textContent='';
}
const budgetInp=document.getElementById('inp-budget');
if(budgetInp) budgetInp.addEventListener('input',function(){
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
});

function selectType(card){
  document.querySelectorAll('.type-card').forEach(c=>c.classList.remove('selected'));
  card.classList.add('selected');
  selectedType=card.getAttribute('data-value');
  document.getElementById('err-type').textContent='';
}

function showErr(id,msg){const e=document.getElementById(id);if(e)e.textContent=msg;}
function clearErr(id){const e=document.getElementById(id);if(e)e.textContent='';}
function markErr(id,has){const e=document.getElementById(id);if(e){if(has)e.classList.add('error');else e.classList.remove('error');}}

function goToStep2(){
  const name=document.getElementById('inp-name').value.trim();
  const phone=document.getElementById('inp-phone').value.trim();
  const wa=document.getElementById('inp-wa').value.trim();
  const email=document.getElementById('inp-email').value.trim();
  let ok=true;
  ['err-name','err-phone','err-wa','err-email'].forEach(id=>clearErr(id));
  ['inp-name','inp-phone','inp-wa','inp-email'].forEach(id=>markErr(id,false));
  if(!name){showErr('err-name','Name is required.');markErr('inp-name',true);ok=false;}
  if(!phone||phone.replace(/\D/g,'').length<10){showErr('err-phone','Enter valid phone.');markErr('inp-phone',true);ok=false;}
  if(!wa||wa.replace(/\D/g,'').length<10){showErr('err-wa','Enter valid WhatsApp.');markErr('inp-wa',true);ok=false;}
  if(!email||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){showErr('err-email','Enter valid email.');markErr('inp-email',true);ok=false;}
  if(!ok) return;
  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
  document.getElementById('sdot1').classList.add('completed');
  document.getElementById('sline1').classList.add('completed');
  document.getElementById('sdot2').classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

function goToStep1(){
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step1').classList.add('active');
  document.getElementById('sdot2').classList.remove('active');
  document.getElementById('sline1').classList.remove('completed');
  document.getElementById('sdot1').classList.remove('completed');
  document.getElementById('sdot1').classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

// Meta Tracking Helper
async function sha256Browser(str) {
  if (!str) return '';
  try {
    const msgBuffer = new TextEncoder().encode(str.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return '';
  }
}

async function trackMetaSubscribeEvent(lead, eventId) {
  // 1. Browser Meta Pixel
  if (typeof fbq === 'function') {
    try {
      fbq('set', 'testEventCode', 'TEST50055');
      fbq('track', 'Subscribe', {
        content_name: lead.website_type || 'Website Inquiry',
        currency: 'INR',
        value: 0
      }, { eventID: eventId });
      console.log('Meta Pixel Browser: Subscribe event fired (Pixels: 1106298835129618 & 1483479293829689) with eventID:', eventId);
    } catch (e) {
      console.warn('Pixel browser error:', e);
    }
  }

  // 2. Server-side CAPI via /api/subscribe
  let serverOk = false;
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, event_id: eventId, test_event_code: 'TEST50055' })
    });
    if (res.ok) {
      const data = await res.json();
      console.log('Meta CAPI Server Response:', data);
      serverOk = true;
    }
  } catch (err) {
    console.warn('Server CAPI endpoint failed, falling back to direct Graph API call:', err);
  }

  // 3. Fallback direct Graph API call if running on static hosting
  if (!serverOk) {
    try {
      const emHash = lead.email ? await sha256Browser(lead.email) : null;
      let digits = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
      if (digits.length === 10) digits = '91' + digits;
      const phHash = digits ? await sha256Browser(digits) : null;
      const fnHash = lead.name ? await sha256Browser(lead.name.split(' ')[0]) : null;

      const userData = {
        client_user_agent: navigator.userAgent
      };
      if (emHash) userData.em = [emHash];
      if (phHash) userData.ph = [phHash];
      if (fnHash) userData.fn = [fnHash];

      const payload = {
        data: [{
          event_name: 'Subscribe',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'website',
          event_source_url: window.location.href,
          user_data: userData,
          custom_data: {
            content_name: lead.website_type || 'Website Inquiry',
            currency: 'INR',
            value: 0
          }
        }],
        test_event_code: 'TEST50055'
      };

      await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Meta CAPI direct fallback sent successfully.');
    } catch (e) {
      console.error('Direct Meta CAPI fallback error:', e);
    }
  }
}

async function submitForm(){
  const budget=document.getElementById('inp-budget').value.trim();
  const message=document.getElementById('inp-msg').value.trim();
  let ok=true;
  clearErr('err-type');clearErr('err-budget');markErr('inp-budget',false);
  if(!selectedType){showErr('err-type','Please select a website type.');ok=false;}
  if(!budget){showErr('err-budget','Please enter your budget.');markErr('inp-budget',true);ok=false;}
  if(!ok) return;

  const btn=document.getElementById('submitBtn');
  const txt=document.getElementById('submitBtnText');
  const ldr=document.getElementById('submitLoader');
  if(btn) btn.disabled=true;
  if(txt) txt.style.display='none';
  if(ldr) ldr.style.display='flex';

  const lead={
    name:document.getElementById('inp-name').value.trim(),
    phone:document.getElementById('inp-phone').value.trim(),
    whatsapp:document.getElementById('inp-wa').value.trim(),
    email:document.getElementById('inp-email').value.trim(),
    website_type:selectedType,
    budget:budget,
    message:message
  };

  const eventId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

  // Trigger Meta Pixel & Conversions API (Subscribe event)
  trackMetaSubscribeEvent(lead, eventId);

  // Save to Supabase
  try{
    const res=await fetch(SUPABASE_URL+'/rest/v1/leads',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Prefer':'return=minimal'},
      body:JSON.stringify(lead)
    });
    if(!res.ok){console.error('Supabase error:',await res.text());saveFallback(lead);}
  }catch(e){console.error('Network error:',e);saveFallback(lead);}

  if(btn) btn.disabled=false;
  if(txt) txt.style.display='';
  if(ldr) ldr.style.display='none';

  document.getElementById('step2').classList.remove('active');
  document.getElementById('stepSuccess').classList.add('active');
  document.getElementById('sdot2').classList.add('completed');
  document.getElementById('sline2').classList.add('completed');
  document.getElementById('sdot3').classList.add('active','completed');

  const d=document.getElementById('successDetails');
  if(d) d.innerHTML='<strong>Name:</strong> '+lead.name+'<br/><strong>WhatsApp:</strong> '+lead.whatsapp+'<br/><strong>Website Type:</strong> '+lead.website_type+'<br/><strong>Budget:</strong> '+lead.budget;
  window.scrollTo({top:0,behavior:'smooth'});
}

function saveFallback(lead){
  const leads=JSON.parse(localStorage.getItem('wl_leads_fb')||'[]');
  lead.id=Date.now().toString();lead.created_at=new Date().toISOString();
  leads.unshift(lead);localStorage.setItem('wl_leads_fb',JSON.stringify(leads));
}

function resetForm(){
  ['inp-name','inp-phone','inp-wa','inp-email','inp-budget','inp-msg'].forEach(id=>{
    const el=document.getElementById(id);if(el){el.value='';el.disabled=false;}
  });
  const sc=document.getElementById('sameCheck');if(sc) sc.checked=false;
  selectedType='';
  document.querySelectorAll('.type-card').forEach(c=>c.classList.remove('selected'));
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
  document.getElementById('stepSuccess').classList.remove('active');
  document.getElementById('step1').classList.add('active');
  document.getElementById('sdot1').classList.remove('completed');
  document.getElementById('sdot1').classList.add('active');
  ['sdot2','sdot3'].forEach(id=>document.getElementById(id).classList.remove('active','completed'));
  ['sline1','sline2'].forEach(id=>document.getElementById(id).classList.remove('completed'));
  window.scrollTo({top:0,behavior:'smooth'});
}
