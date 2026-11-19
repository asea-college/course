// Public editing is intentional: anyone with the calendar link may save this schedule.
// Database credentials remain in Edge Function environment variables.
const BASE='https://asea-college.github.io/course/2026-kai/';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
async function database(method:string,query:string,body?:unknown){
  const secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  const key=secrets.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key)throw new Error('공유 저장소 설정을 확인해 주세요.');
  const response=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/kai_schedule_state?'+query,{method,headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok)throw new Error('공유 저장소 요청에 실패했습니다.');
  return response.json();
}
function validate(data:any){
  if(!data||!Array.isArray(data.events)||data.events.length>5000||!Array.isArray(data.history)||data.history.length>20000||!Array.isArray(data.notices)||data.notices.length>5000)throw new Error('시간표 자료 형식이 올바르지 않습니다.');
  let end='00:00';
  for(let n=1;n<=8;n++){const t=data.times?.[n];if(!Array.isArray(t)||t.length!==2||t.some((v:any)=>typeof v!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))||t[0]>=t[1]||t[0]<end)throw new Error('교시 시간이 올바르지 않거나 겹칩니다.');end=t[1];}
  const ids=new Set();
  for(const e of data.events){
    if(!e||typeof e.id!=='string'||!e.id||e.id.length>150||ids.has(e.id)||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||new Date(e.date+'T00:00:00Z').toISOString().slice(0,10)!==e.date||!['A반','B반'].includes(e.group)||![1,2,3,5,6,7,8].includes(e.period))throw new Error('수업 날짜·반·교시 또는 ID가 올바르지 않습니다.');
    ids.add(e.id);for(const k of ['title','subject','teacher','room'])if(typeof e[k]!=='string'||e[k].length>2000)throw new Error('수업 내용을 확인해 주세요.');
    if(!e.title.trim())throw new Error('수업 내용을 입력해 주세요.');
  }
  for(const n of data.notices)if(!n||typeof n.id!=='string'||!/^[A-Za-z0-9_-]{1,150}$/.test(n.id)||!['전체','A반','B반'].includes(n.group)||typeof n.title!=='string'||typeof n.body!=='string'||n.body.length>100000||typeof n.createdAt!=='string'||typeof n.author!=='string'||typeof n.published!=='boolean')throw new Error('공지 내용을 확인해 주세요.');
  for(const h of data.history)if(!h||typeof h.id!=='string'||typeof h.kind!=='string'||typeof h.at!=='string'||typeof h.reason!=='string'||typeof h.author!=='string')throw new Error('변경 이력 형식을 확인해 주세요.');
}
function conflicts(data:any){
  const out=new Map(),days=new Map();for(const e of data.events){if(!days.has(e.date))days.set(e.date,[]);days.get(e.date).push(e);}
  for(const rows of days.values())for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j],ta=data.times[a.period],tb=data.times[b.period];if(ta[0]>=tb[1]||tb[0]>=ta[1])continue;
    for(const [kind,key] of [['반','group'],['강사','teacher'],['강의실','room']])if(a[key].trim()&&a[key].trim()===b[key].trim())out.set(kind+'|'+[a.id,b.id].sort().join('|')+'|'+a[key].trim(),`${a.date} ${a.period}·${b.period}교시 ${kind} 중복: ${a[key]}`);
  }
  return out;
}
function student(data:any,group:string){return {revision:data.revision,updatedAt:data.updatedAt,times:data.times,events:data.events.filter((e:any)=>e.group===group),notices:data.notices.filter((n:any)=>n.published&&(n.group==='전체'||n.group===group))};}
// Same iCalendar serialization as the calendar app; filled from app.js at build time.
function ical(data,which='all'){const clean=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'),stamp=(data.updatedAt||new Date().toISOString()).replace(/[-:]/g,'').replace(/\.\d+Z/,'Z'),rows=data.events.filter(e=>which==='all'||e.group===(which==='a'?'A반':'B반'));const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ASEA COLLEGE//KAI 2026//KO','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+clean('2026 직업계고 카이과정'+(which==='all'?'':' '+which.toUpperCase()+'반')),'X-WR-TIMEZONE:Asia/Seoul'];for(const e of rows){const t=data.times[e.period],d=e.date.replaceAll('-',''),uid=e.id.replace('A반','a').replace('B반','b');lines.push('BEGIN:VEVENT','UID:'+uid+'@asea-college.github.io','DTSTAMP:'+stamp,'SEQUENCE:'+data.revision,'DTSTART;TZID=Asia/Seoul:'+d+'T'+t[0].replace(':','')+'00','DTEND;TZID=Asia/Seoul:'+d+'T'+t[1].replace(':','')+'00','SUMMARY:'+clean(`[${e.group}] ${e.title}`),'LOCATION:'+clean(e.room),'DESCRIPTION:'+clean(`${e.period}교시 / 강사: ${e.teacher}\n${e.subject}\n${BASE+(e.group==='A반'?'a':'b')+'.html'}`),'END:VEVENT')}lines.push('END:VCALENDAR');return lines.map(line=>{let out='',length=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(length+bytes>73){out+='\r\n ';length=1}out+=char;length+=bytes}return out}).join('\r\n')+'\r\n'}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!['GET','POST'].includes(req.method))return json({error:'지원하지 않는 요청입니다.'},405);
  try{
    const rows=await database('GET','id=eq.2026-kai&select=revision,document'),current=rows[0];if(!current)return json({error:'공유 시간표가 준비되지 않았습니다.'},503);
    if(req.method==='GET'){
      const url=new URL(req.url),scope=url.searchParams.get('class')||'all';
      if(!['all','a','b'].includes(scope))return json({error:'반을 확인해 주세요.'},400);
      if(url.searchParams.get('format')==='ics')return new Response(ical(current.document,scope),{headers:{...headers,'Content-Type':'text/calendar; charset=utf-8'}});
      return json(scope==='all'?current.document:student(current.document,scope==='a'?'A반':'B반'));
    }
    const text=await req.text();if(new TextEncoder().encode(text).length>3000000)return json({error:'저장할 자료가 너무 큽니다.'},413);
    const payload=JSON.parse(text);if(!Number.isInteger(payload.baseRevision))return json({error:'공유판 버전을 확인해 주세요.'},400);
    if(payload.baseRevision!==current.revision)return json({error:'다른 사람이 먼저 저장했습니다. 수정본을 JSON으로 백업한 뒤 새로고침해 주세요.'},409);
    const next=payload.next;validate(next);
    if(JSON.stringify(next)===JSON.stringify(current.document))return json(current.document);
    if(JSON.stringify(next.history.slice(0,current.document.history.length))!==JSON.stringify(current.document.history))return json({error:'기존 변경 이력은 유지해야 합니다.'},400);
    const before=conflicts(current.document),after=conflicts(next),fresh=[...after].filter(([key])=>!before.has(key));
    if(fresh.length)return json({error:fresh.slice(0,10).map(([,value])=>value).join('\n')},422);
    next.revision=current.revision+1;next.updatedAt=new Date().toISOString();
    const saved=await database('PATCH','id=eq.2026-kai&revision=eq.'+current.revision,{revision:next.revision,document:next,updated_at:next.updatedAt});
    if(!saved.length)return json({error:'다른 사람이 먼저 저장했습니다. 최신 자료를 다시 불러오세요.'},409);
    return json(saved[0].document);
  }catch(error){return json({error:error instanceof Error?error.message:'공유 저장에 실패했습니다.'},400);}
});
