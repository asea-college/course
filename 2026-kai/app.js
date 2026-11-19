'use strict';
const TITLE='아세아항공직업전문학교 2026 직업계고 카이제작실무과정';
const BASE='https://asea-college.github.io/course/2026-kai/';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STUDENT=document.body.dataset.class||'',IS_STUDENT=!!STUDENT,CAN_EDIT=!IS_STUDENT;
const SHARED_API='https://zbpeyklwpotjyveipzxd.supabase.co/functions/v1/kai-shared-schedule';
function calendarFeed(scope='all'){return SHARED_API+'?format=ics&class='+scope;}
let state,original,actor='링크 편집자',dirty=false,busy=false,page=IS_STUDENT?'student':'all',group=STUDENT||'A반',teacher='',room='',month='2026-11',layout='month',detail=true,week='2026-11-02',day=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),pendingNotice=null;
let rangeEnabled=false,rangeStart='2026-10-26',rangeEnd='2026-12-18';
function formatDate(value){if(!value)return '';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?value:value+'('+['일','월','화','수','목','금','토'][d.getDay()]+')';}
function inPeriod(date){return rangeEnabled?date>=rangeStart&&date<=rangeEnd:date.startsWith(month);}
function rangeLabel(){return rangeEnabled?formatDate(rangeStart)+' ~ '+formatDate(rangeEnd):month;}
function monthKeys(){if(!rangeEnabled)return [month];const out=[];let y=+rangeStart.slice(0,4),m=+rangeStart.slice(5,7);const last=rangeEnd.slice(0,7);while(true){const key=y+'-'+String(m).padStart(2,'0');if(key>last)break;out.push(key);if(++m>12){m=1;y++;}}return out;}
function rangeControls(){return `<form id="range-form" class="range-controls"><label>시작일<input id="range-start" type="date" value="${rangeStart}" required></label><span>~</span><label>종료일<input id="range-end" type="date" value="${rangeEnd}" required></label><button class="${rangeEnabled?'primary':''}">기간 조회</button>${rangeEnabled?'<button type="button" id="range-reset">기간 해제</button>':''}</form>${rangeEnabled?`<div class="range-summary">조회 기간: ${esc(rangeLabel())}</div>`:''}`;}
const menus={all:'통합 일정',class:'반별 시간표',person:'개인별 일정',room:'강의실별 일정',history:'변경 이력',notices:'학생 공지',share:'학생 배포·구독',settings:'교시·공유 설정'};
function msg(s){$('message').textContent=s}function setDirty(){dirty=true;$('dirty').textContent='미공유 수정 있음 · 공유 저장 필요';$('publish').disabled=!CAN_EDIT||busy;window.onbeforeunload=()=>dirty?true:undefined}
function opts(values,current){return values.map(x=>`<option value="${esc(x)}" ${x===current?'selected':''}>${esc(x)}</option>`).join('')}
function unique(key){return [...new Set(state.events.map(e=>e[key]).filter(Boolean))].sort()}
function time(n){return (state.times[n]||[]).join('~')}
function merged(rows){const out=[];for(const e of [...rows].sort((a,b)=>a.date.localeCompare(b.date)||a.group.localeCompare(b.group)||a.period-b.period)){const p=out.at(-1);if(p&&p.date===e.date&&p.group===e.group&&p.title===e.title&&p.subject===e.subject&&p.teacher===e.teacher&&p.room===e.room&&p.last+1===e.period){p.last=e.period;p.ids.push(e.id)}else out.push({...e,last:e.period,ids:[e.id]})}return out}
function selected(){return state.events.filter(e=>inPeriod(e.date)&&(!IS_STUDENT||e.group===STUDENT)&&(page!=='class'||e.group===group)&&(page!=='person'||e.teacher===teacher)&&(page!=='room'||e.room===room))}
function periodText(e){return `${e.period===e.last?e.period:e.period+'~'+e.last}교시 · ${(state.times[e.period]||[])[0]||'?'}~${(state.times[e.last]||[])[1]||'?'}`}
function lesson(e){return `<article class="lesson"><div class="meta">${esc(periodText(e))}${!IS_STUDENT&&state.history.some(h=>h.after?.id===e.id)?' · 변경됨':''}</div><button class="openlesson" data-event="${esc(e.id)}"><div class="subject" title="${esc(e.title)}">${esc(e.title)}</div></button><button class="person" data-teacher="${esc(e.teacher)}">${esc(e.teacher||'강사 미정')}</button><div class="meta">${esc(e.room||'장소 미정')}</div></article>`}
function controls(){let s=`<input id="month" type="month" value="${month}" aria-label="조회 월">`;if(page==='class')s+=`<select id="group" aria-label="반">${opts(['A반','B반'],group)}</select>`;if(page==='person')s+=`<select id="teacher" aria-label="강사">${opts(unique('teacher'),teacher)}</select>`;if(page==='room')s+=`<select id="room" aria-label="강의실">${opts(unique('room'),room)}</select>`;if(['all','class','person','room'].includes(page))s+=`<button data-layout="month" class="${layout==='month'?'active':''}">월간</button><button data-layout="week" class="${layout==='week'?'active':''}">주간</button><button data-layout="list" class="${layout==='list'?'active':''}">일정표</button>${layout==='week'?`<input id="week" type="date" value="${week}" aria-label="조회 주">`:''}${layout==='month'?`<button id="detail">${detail?'전체 윤곽으로':'세부사항 모두 표시'}</button>`:''}`;if(CAN_EDIT&&['all','class'].includes(page))s+='<button id="add">일정 추가</button>';if(!IS_STUDENT)s+='<button id="change-plan">시간표 변경·교차 검증</button>';return s+rangeControls()}
function monthPanel(panelMonth=month){const rows=selected().filter(e=>e.date.startsWith(panelMonth)),[y,m]=panelMonth.split('-').map(Number),weekends=rows.some(e=>[0,6].includes(new Date(e.date+'T12:00:00').getDay())),days=weekends?['일','월','화','수','목','금','토']:['월','화','수','목','금'];let html=days.map(d=>`<div class="weekday">${d}</div>`).join('');let offset=new Date(y,m-1,1).getDay();if(!weekends){offset=(offset+6)%7;if(offset>=5)offset=0;}html+='<div class="day"></div>'.repeat(offset);for(let d=1;d<=new Date(y,m,0).getDate();d++){if(!weekends&&[0,6].includes(new Date(y,m-1,d).getDay()))continue;const date=`${panelMonth}-${String(d).padStart(2,'0')}`,single=page==='class'||IS_STUDENT,groups=single?[group]:['A반','B반'];html+=`<div class="day"><button class="date" data-day="${date}">${formatDate(date)}</button><div class="lanes ${single?'single':''}">${groups.map(g=>{const a=merged(rows.filter(e=>e.date===date&&e.group===g));return `<div class="lane"><div class="classlabel">${g}</div>${detail?a.map(lesson).join(''):a.map(e=>`<div class="outline" title="${esc(e.title+' / '+e.teacher+' / '+e.room)}"><span class="meta">${e.period===e.last?e.period:e.period+'~'+e.last}교시</span><br>${esc(e.subject)}</div>`).join('')}</div>`}).join('')}</div></div>`}return `<div class="scroll"><div class="calendar ${weekends?'weekends':''}">${html}</div></div>`}
function monthView(){return monthKeys().map(key=>(rangeEnabled?`<h3 class="month-label">${key}</h3>`:'')+monthPanel(key)).join('');}
function weekView(){const anchor=new Date(week+'T12:00:00');anchor.setDate(anchor.getDate()-(anchor.getDay()+6)%7);const dates=Array.from({length:7},(_,i)=>{const d=new Date(anchor);d.setDate(d.getDate()+i);return d.toLocaleDateString('sv-SE')});const rows=state.events.filter(e=>dates.includes(e.date)&&(!rangeEnabled||inPeriod(e.date))&&(!IS_STUDENT||e.group===STUDENT)&&(page!=='class'||e.group===group)&&(page!=='person'||e.teacher===teacher)&&(page!=='room'||e.room===room));const ds=dates.filter((d,i)=>i<5||rows.some(e=>e.date===d));const groups=page==='class'||IS_STUDENT?[group]:['A반','B반'];return `<div class="scroll"><table class="week"><thead><tr><th>교시 / 시간</th>${ds.map(d=>`<th>${formatDate(d)}</th>`).join('')}</tr></thead><tbody>${[1,2,3,4,5,6,7,8].map(n=>`<tr><th>${n===4?'점심시간':n+'교시'}<br><small>${esc(time(n))}</small></th>${ds.map(d=>`<td>${n===4?'—':`<div class="lanes ${groups.length===1?'single':''}">${groups.map(g=>`<div><div class="classlabel">${g}</div>${rows.filter(e=>e.date===d&&e.period===n&&e.group===g).map(e=>lesson({...e,last:e.period})).join('')}</div>`).join('')}</div>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function reportHTML(rows=selected(),label=null){const title=label||({person:teacher+' 개인 강의일정표',room:room+' 강의실 사용일정표',class:group+' 시간표',student:STUDENT+' 시간표'}[page]||'통합 시간표');const items=merged(rows),chunks=[];for(let i=0;i<items.length;i+=23)chunks.push(items.slice(i,i+23));if(!chunks.length)chunks.push([]);return chunks.map((chunk,i)=>`<section class="paper page"><div class="paperhead"><small>ASEA COLLEGE · 2026 KAI COURSE</small><h2>${esc(title)}</h2><div>${TITLE}</div><p>조회 기간: ${esc(rangeLabel())}${page==='person'?`　|　성명: ${esc(teacher)}　|　담당 반: ${esc([...new Set(rows.map(e=>e.group))].join(', '))}`:''}${page==='room'?`　|　강의실: ${esc(room)}`:''}</p></div><table><thead><tr><th>날짜</th><th>교시 / 시간</th><th>반</th><th>과목 / 내용</th><th>강사</th><th>강의실</th></tr></thead><tbody>${chunk.map(e=>`<tr><td>${formatDate(e.date)}</td><td>${esc(periodText(e))}</td><td>${e.group}</td><td>${esc(e.title)}</td><td>${esc(e.teacher)}</td><td>${esc(e.room)}</td></tr>`).join('')}</tbody></table><div class="foot"><span>공유판 v${state.revision} · ${esc(formatDate(state.updatedAt?.slice(0,10)||'2026-11-05'))}</span><span>${i+1} / ${chunks.length}</span></div></section>`).join('')}
function noticesView(){const list=state.notices.filter(n=>n.published&&(!IS_STUDENT||n.group==='전체'||n.group===STUDENT));return `${CAN_EDIT&&!IS_STUDENT?'<button id="newnotice">새 공지 작성</button>':''}${list.length?list.slice().reverse().map(n=>`<article class="notice"><span class="tag">${esc(n.group)} · ${esc(formatDate(n.createdAt.slice(0,10)))}</span><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><small>${esc(n.author)}</small><div class="actions"><button data-notice-image="${n.id}">공지 JPG</button><button data-notice-print="${n.id}">공지 인쇄</button></div></article>`).join(''):'<p class="noresult">등록된 공개 공지가 없습니다.</p>'}`}
function historyBatches(){
  const batches=new Map();for(const h of state.history){const key=h.batchId||h.id;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(h);}return [...batches].map(([id,entries])=>({id,entries}));
}
function historySummary(entries,key){
  const items=entries.map(h=>h[key]).filter(Boolean),events=items.filter(e=>!e.times),times=items.filter(e=>e.times);
  return merged(events).map(e=>'<div class="history-slot"><b>'+esc(e.title)+'</b><p>'+esc(formatDate(e.date)+' '+e.group+' · '+periodText(e))+'</p><small>'+esc(e.teacher+' / '+e.room)+'</small></div>').join('')+times.map(e=>'<div class="history-slot">'+snapshot(e)+'</div>').join('')||'<p class="muted">일정 없음</p>';
}
function historyView(){
  const batches=historyBatches(),restored=new Set(state.history.map(h=>h.restoresBatchId).filter(Boolean));
  return batches.length?batches.reverse().map(({id,entries})=>{const first=entries[0];return '<section class="history history-card"><div class="history-card-head"><span class="tag">'+esc(first.kind)+' · '+esc(new Date(first.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))+'</span>'+(restored.has(id)?'<span class="tag">복원 이력 있음</span>':'')+'</div><p>'+esc(first.author)+' · '+esc(first.reason)+'</p><div class="compare"><div><h4>변경 전</h4>'+historySummary(entries,'before')+'</div><div><h4>변경 후</h4>'+historySummary(entries,'after')+'</div></div>'+(CAN_EDIT?'<div class="actions"><button class="primary" data-history-restore="'+esc(id)+'">기존 일정대로 복원</button><small>이 작업 전체를 변경 전으로 되돌립니다. 복원 후 공유 저장하세요.</small></div>':'')+'</section>';}).join(''):'<p class="noresult">아직 변경 이력이 없습니다. 일정 변경을 저장하면 기록됩니다.</p>';
}
function planHistoryRestore(key){
  const batch=historyBatches().find(b=>b.id===key);if(!batch)return {errors:['복원할 변경 이력을 찾지 못했습니다.']};
  let events=structuredClone(state.events),times=structuredClone(state.times);const changes=[],errors=[];
  const matches=(a,b)=>!!a&&!!b&&['id','date','group','period',...lessonFields].every(k=>(a[k]??'')===(b[k]??''));
  for(const h of [...batch.entries].reverse()){
    if(h.after?.times||h.before?.times){
      if(!h.after?.times||!h.before?.times||JSON.stringify(times)!==JSON.stringify(h.after.times)){errors.push('교시 시간이 이후에 다시 변경되었습니다. 나중의 시간 변경부터 복원해 주세요.');continue;}
      changes.push({before:{times:structuredClone(times)},after:structuredClone(h.before)});times=structuredClone(h.before.times);continue;
    }
    const id=h.after?.id||h.before?.id,current=events.find(e=>e.id===id);
    if(!id||(h.after?!matches(current,h.after):!!current)){errors.push('복원 대상 수업이 이후에 다시 변경되었습니다. 나중 변경을 먼저 복원해 주세요.');continue;}
    changes.push({before:current?structuredClone(current):null,after:structuredClone(h.before||null)});
    events=events.filter(e=>e.id!==id);if(h.before)events.push(structuredClone(h.before));
  }
  if(!errors.length){const before=scheduleConflicts(state.events),after=scheduleConflicts(events,times);for(const [key,value] of after)if(!before.has(key))errors.push('복원 시 '+value);}
  return {errors:[...new Set(errors)],events,times,changes,batch};
}
function restoreHistory(key){
  if(!CAN_EDIT)return;const result=planHistoryRestore(key);if(result.errors.length)return msg(result.errors.join('\n'));
  const batchId=crypto.randomUUID(),reason='기존 일정 복원 · '+result.batch.entries[0].reason;
  for(const c of result.changes){log('기존 일정 복원',c.before,c.after,reason);Object.assign(state.history.at(-1),{batchId,restoresBatchId:key});}
  state.events=result.events;state.times=result.times;
  const groups=new Set(result.changes.flatMap(c=>[c.before?.group,c.after?.group]).filter(Boolean));
  for(const g of groups){const restored=merged(result.changes.map(c=>c.after).filter(e=>e?.group===g)),removed=merged(result.changes.filter(c=>c.before?.group===g&&!c.after).map(c=>c.before));addNotice(g,'수업 일정 복원 안내',reason+'\n'+restored.map(e=>formatDate(e.date)+' '+periodText(e)+' / '+e.title+' / '+e.teacher+' / '+e.room).join('\n')+(removed.length?'\n추가 일정 취소: '+removed.map(e=>formatDate(e.date)+' '+periodText(e)+' '+e.title).join(', '):''));}
  if(result.changes.some(c=>c.after?.times))addNotice('전체','교시 시간 복원 안내',reason);
  setDirty();render();msg('변경 작업 한 건을 기존 일정대로 복원했습니다. 수정·공지 공유 저장을 누르면 모두에게 반영됩니다.');
}
function snapshot(e){if(!e)return '없음';if(e.times)return Object.entries(e.times).map(([n,t])=>`${n}교시 ${t.join('~')}`).join(' / ');return esc(`${formatDate(e.date)||''} ${e.group||''} ${e.period||''}교시 / ${e.title||''} / ${e.teacher||''} / ${e.room||''}`)}
function studentView(){const rows=state.events.filter(e=>e.date===day);return `${rangeControls()}<div class="actions"><input type="date" id="day" value="${day}" aria-label="조회 날짜"><button id="student-month">${layout==='month'?'일별 보기':'월간 보기'}</button><span class="readonly">${STUDENT} · 조회 전용</span></div>${noticesView()}${layout==='month'?monthView():rangeEnabled?reportHTML(selected(),STUDENT+' 기간별 시간표'):`<section class="daily"><h3>${formatDate(day)} · ${STUDENT}</h3>${merged(rows).map(lesson).join('')||'<p>이 날짜의 수업이 없습니다.</p>'}</section>`}`}
function sharing(){return `<section class="paper"><h3>학생 반별 링크</h3><p>로그인 없이 해당 반 일정·공개 공지만 표시합니다. 링크를 아는 사람은 조회할 수 있습니다.</p><div class="links">${['a','b'].map(g=>`<div><b>${g.toUpperCase()}반</b><br><a href="${g}.html" target="_blank">${BASE+g+'.html'}</a><div class="actions"><button data-copy="${BASE+g+'.html'}">링크 복사</button><button data-qr="${BASE+g+'.html'}">QR 보기</button></div></div>`).join('')}</div></section><section class="paper"><h3>2026 직업계고 카이과정 · 캘린더 구독</h3><p>Google 캘린더의 ‘다른 캘린더 → URL로 추가’에 아래 주소를 붙여 넣으세요. 파일 가져오기 대신 URL 구독을 해야 갱신됩니다.</p>${['all','a','b'].map(g=>`<p>${g==='all'?'통합':g.toUpperCase()+'반'}: <a href="${calendarFeed(g)}">${calendarFeed(g)}</a> <button data-copy="${calendarFeed(g)}">복사</button></p>`).join('')}<a href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener">Google 캘린더 URL 구독 설정 열기</a><p class="muted">새 구독 주소는 공유 저장 즉시 최신 자료를 제공합니다. 이전 github.io의 .ics 주소로 구독했다면 위 주소로 다시 등록해 주세요. 웹사이트 → 구독 캘린더 단방향 갱신입니다. Google의 재조회 주기에 따라 반영이 지연될 수 있습니다. Google 캘린더에서 수정한 내용은 웹사이트로 가져오지 않습니다.</p></section>`}
function settings(){return '<section class="paper"><h3>교시별 수업 시간</h3><form id="timesform"><div class="timegrid">'+[1,2,3,4,5,6,7,8].map(n=>'<label>'+n+'교시 '+(n===4?'(점심시간)':'')+'<div><input type="time" name="s'+n+'" value="'+state.times[n][0]+'" required> ~ <input type="time" name="e'+n+'" value="'+state.times[n][1]+'" required></div></label>').join('')+'</div><p><input name="reason" placeholder="변경 사유" required></p><button>시간 변경 기록</button></form></section><section class="paper"><h3>링크로 함께 수정하기</h3><p>이 시간표 링크를 가진 누구나 로그인 없이 수정할 수 있습니다. 변경 후 왼쪽의 수정·공지 공유 저장을 누르면 모든 사람에게 반영됩니다.</p><button id="backup">현재 수정본 JSON 백업</button><p class="muted">다른 사람이 먼저 저장하면 덮어쓰지 않고 알려 드립니다. 저장한 버전은 공유 저장소에 보관됩니다.</p></section>';}
function todaySummary(){
  const date=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
  return '<section class="today-summary"><div class="today-heading"><b>오늘의 일정</b><small>'+esc(formatDate(date))+'</small></div>'+['A반','B반'].map(g=>'<div class="today-class"><b>'+g+'</b><div class="today-items">'+(merged(state.events.filter(e=>e.date===date&&e.group===g)).map(e=>'<div class="today-item" title="'+esc(e.subject+' / '+e.title+' / '+e.teacher+' / '+periodText(e))+'"><small>'+(e.period===e.last?e.period:e.period+'~'+e.last)+'교시</small><span class="today-course">'+esc(e.subject+(e.title!==e.subject?' · '+e.title:''))+'</span><b>'+esc(e.teacher||'강사 미정')+'</b></div>').join('')||'<small>오늘 수업 없음</small>')+'</div></div>').join('')+'</section>';
}
function render(){if(!state)return;const todayBox=$('today-summary');if(todayBox){todayBox.hidden=IS_STUDENT||page!=='all';todayBox.innerHTML=todayBox.hidden?'':todaySummary();}teacher=teacher||unique('teacher')[0]||'';room=room||unique('room')[0]||'';$('viewtitle').textContent=IS_STUDENT?STUDENT+' 수업 일정':menus[page];$('toolbar').innerHTML=IS_STUDENT?'':(['all','class','person','room'].includes(page)?controls():'');$('version').textContent=`공유판 v${state.revision}`;$('view').innerHTML=IS_STUDENT?studentView():page==='history'?historyView():page==='notices'?noticesView():page==='share'?sharing():page==='settings'?settings():layout==='list'?reportHTML():layout==='week'?weekView():monthView();document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));bind();}
function on(id,event,fn){const el=$(id);if(el)el[event]=fn}
function bind(){document.querySelectorAll('[data-history-restore]').forEach(b=>b.onclick=()=>restoreHistory(b.dataset.historyRestore));on('change-plan','onclick',()=>changePlanner());on('range-form','onsubmit',e=>{e.preventDefault();const from=$('range-start').value,to=$('range-end').value;if(!from||!to||from>to)return msg('종료일은 시작일과 같거나 이후여야 합니다.');rangeStart=from;rangeEnd=to;rangeEnabled=true;month=from.slice(0,7);week=from;layout='list';render();msg('지정 기간의 일정을 조회했습니다. 인쇄와 JPG에도 같은 기간이 적용됩니다.');});on('range-reset','onclick',()=>{rangeEnabled=false;render();msg('기간 조회를 해제했습니다.');});on('backup','onclick',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='KAI-수정본-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});for(const [id,fn] of Object.entries({month:e=>{month=e.target.value;rangeEnabled=false},group:e=>{group=e.target.value},teacher:e=>{teacher=e.target.value},room:e=>{room=e.target.value},week:e=>{week=e.target.value},day:e=>{day=e.target.value;month=day.slice(0,7);rangeEnabled=false}}))on(id,'onchange',e=>{fn(e);render()});on('detail','onclick',()=>{detail=!detail;render()});on('student-month','onclick',()=>{layout=layout==='month'?'list':'month';render()});on('add','onclick',()=>editEvent(null));on('newnotice','onclick',noticeEditor);document.querySelectorAll('[data-layout]').forEach(b=>b.onclick=()=>{layout=b.dataset.layout;render()});document.querySelectorAll('[data-teacher]').forEach(b=>b.onclick=()=>{if(!b.dataset.teacher)return;if(IS_STUDENT){const rows=selected().filter(e=>e.teacher===b.dataset.teacher);show(`<h3>${esc(b.dataset.teacher)} · ${STUDENT} 강의 일정</h3>${reportHTML(rows,b.dataset.teacher+' 강의 일정')}`)}else{teacher=b.dataset.teacher;page='person';layout='list';render()}});document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>editEvent(state.events.find(e=>e.id===b.dataset.event)));document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{day=b.dataset.day;const rows=selected().filter(e=>e.date===day);show(`<h3>${formatDate(day)} 시간표</h3>${merged(rows).map(lesson).join('')||'수업 없음'}`);bindModalLinks()});document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.copy).then(()=>msg('링크를 복사했습니다.')).catch(()=>msg('복사하지 못했습니다. 표시된 주소를 직접 복사해 주세요.')));document.querySelectorAll('[data-qr]').forEach(b=>b.onclick=()=>{show('<h3>학생 링크 QR</h3><div id="qrcode"></div><p>'+esc(b.dataset.qr)+'</p>');new QRCode($('qrcode'),{text:b.dataset.qr,width:180,height:180})});document.querySelectorAll('[data-notice-image]').forEach(b=>b.onclick=()=>exportNotice(b.dataset.noticeImage,false));document.querySelectorAll('[data-notice-print]').forEach(b=>b.onclick=()=>exportNotice(b.dataset.noticePrint,true));on('timesform','onsubmit',e=>{e.preventDefault();const f=new FormData(e.target),times={};for(let n=1;n<=8;n++){times[n]=[f.get('s'+n),f.get('e'+n)];if(times[n][0]>=times[n][1])return msg('시작 시간은 종료 시간보다 빨라야 합니다.');if(n>1&&times[n][0]<times[n-1][1])return msg('교시 시간이 겹칩니다.')}log('교시시간 변경',{times:state.times},{times},f.get('reason'));state.times=times;setDirty();render();msg('교시 시간을 변경했습니다. 공유 저장하면 구독 파일도 갱신됩니다.')});}
function show(html){$('modalbody').innerHTML=html;if(!$('modal').open)$('modal').showModal()}
function bindModalLinks(){document.querySelectorAll('#modal [data-event]').forEach(b=>b.onclick=()=>editEvent(state.events.find(e=>e.id===b.dataset.event)))}
function editEvent(e,single=false){if(e&&CAN_EDIT&&!IS_STUDENT&&!single)return changePlanner(e);if(!CAN_EDIT||IS_STUDENT){if(e)show(`<h3>${esc(e.title)}</h3><p>${formatDate(e.date)} · ${e.group} · ${e.period}교시 ${esc(time(e.period))}</p><p>${esc(e.teacher||'강사 미정')} · ${esc(e.room||'장소 미정')}</p>`);return}show(`<h3>${e?'일정 수정':'일정 추가'}</h3>${e?'<p class="muted">선택한 묶음의 첫 교시를 수정합니다. 다른 교시는 주간 보기에서 각각 선택하세요.</p>':''}<form id="eventform"><label>날짜<input type="date" name="date" value="${e?.date||day}" required></label><label>반<select name="group">${opts(['A반','B반'],e?.group||group)}</select></label><label>교시<select name="period">${opts([1,2,3,5,6,7,8].map(String),String(e?.period||1))}</select></label>${[['subject','과목'],['title','강의 내용'],['teacher','강사'],['room','강의실']].map(([k,l])=>`<label>${l}<input name="${k}" value="${esc(e?.[k]||'')}" ${k==='title'?'required':''}></label>`).join('')}<label>변경 사유<input name="reason" required></label><label><input style="width:auto" type="checkbox" name="notify" checked> 학생용 변경 공지도 생성</label><div class="actions"><button class="primary">수정 기록</button>${e?'<button id="deleteevent" type="button">이 일정 삭제</button>':''}</div></form>`);$('eventform').onsubmit=ev=>{ev.preventDefault();const f=new FormData(ev.target),next={...(e||{}),id:e?.id||'new-'+crypto.randomUUID(),date:f.get('date'),group:f.get('group'),period:Number(f.get('period')),subject:f.get('subject').trim(),title:f.get('title').trim(),teacher:f.get('teacher').trim(),room:f.get('room').trim()};if(state.events.some(x=>x.id!==next.id&&x.date===next.date&&x.group===next.group&&x.period===next.period))return msg('같은 반·날짜·교시에 이미 일정이 있습니다.');const beforeConflicts=scheduleConflicts(state.events),newConflicts=[...scheduleConflicts(state.events.filter(x=>x.id!==next.id).concat(next))].filter(([key])=>!beforeConflicts.has(key));if(newConflicts.length)return msg(newConflicts.map(([,value])=>value).join('\n'));log(e?'일정 수정':'일정 추가',e,next,f.get('reason'));if(e)state.events[state.events.findIndex(x=>x.id===e.id)]=next;else state.events.push(next);if(f.get('notify'))addNotice(next.group,'수업 일정 변경 안내',`${formatDate(next.date)} · ${next.group} · ${next.period}교시\n변경 전: ${e?e.title+' / '+e.teacher+' / '+e.room:'신규 일정'}\n변경 후: ${next.title} / ${next.teacher} / ${next.room}\n사유: ${f.get('reason')}`);setDirty();$('modal').close();render();msg('변경을 기록했습니다. 공유 저장하면 학생 화면에도 반영됩니다.')};if(e)$('deleteevent').onclick=()=>{const f=new FormData($('eventform'));if(!f.get('reason'))return $('eventform').reportValidity();if(!confirm('해당 교시 일정을 삭제하고 변경 이력을 남길까요?'))return;log('일정 삭제',e,null,f.get('reason'));state.events=state.events.filter(x=>x.id!==e.id);if(f.get('notify'))addNotice(e.group,'수업 취소 안내',`${formatDate(e.date)} ${e.period}교시 · ${e.title}\n사유: ${f.get('reason')}`);setDirty();$('modal').close();render()}}
const teachingPeriods=[1,2,3,5,6,7,8];
const slotKey=e=>`${e.date}|${e.group}|${e.period}`;
const lessonFields=['subject','title','teacher','room'];
const sameLesson=(a,b)=>lessonFields.every(k=>(a?.[k]||'')===(b?.[k]||''));
function scheduleConflicts(events,times=state.times){
  const found=new Map(),days=new Map();
  for(const e of events){if(!days.has(e.date))days.set(e.date,[]);days.get(e.date).push(e);}
  for(const rows of days.values())for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j],ta=times[a.period],tb=times[b.period];
    if(!ta||!tb||ta[0]>=tb[1]||tb[0]>=ta[1])continue;
    const kinds=[];
    if(a.group===b.group)kinds.push('반');
    if(a.teacher?.trim()&&a.teacher.trim()===b.teacher?.trim())kinds.push('강사');
    if(a.room?.trim()&&a.room.trim()===b.room?.trim())kinds.push('강의실');
    for(const kind of kinds){const pair=[a.id,b.id].sort().join('|');const resource=kind==='반'?a.group:kind==='강사'?a.teacher.trim():a.room.trim();found.set(`${kind}|${pair}|${resource}`,`${formatDate(a.date)} ${a.period}·${b.period}교시 ${kind} 중복 (${resource}): ${a.group} ${a.title} / ${b.group} ${b.title}`);}
  }
  return found;
}
function validatePlan(rows){
  const errors=[],warnings=[],keys=new Set(),before=scheduleConflicts(state.events);
  for(const row of rows){
    const e=row.after,key=slotKey(e);
    if(keys.has(key))errors.push('변경안에 같은 슬롯이 두 번 있습니다.');keys.add(key);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!teachingPeriods.includes(e.period)||!['A반','B반'].includes(e.group))errors.push('날짜·반·교시를 확인하세요.');
    if(!e.subject?.trim()||!e.title?.trim()||!e.teacher?.trim()||!e.room?.trim())errors.push(`${formatDate(e.date)} ${e.group} ${e.period}교시: 과목·내용·강사·강의실을 모두 채우세요.`);
  }
  const replaced=new Set(rows.map(r=>slotKey(r.after))),events=state.events.filter(e=>!replaced.has(slotKey(e))).concat(rows.map(r=>r.after));
  const conflicts=scheduleConflicts(events);
  for(const [key,value] of conflicts){if(!before.has(key))errors.push(value);}
  const counts=list=>{const m=new Map();for(const e of list){const key=e.group+' / '+e.subject;m.set(key,(m.get(key)||0)+1);}return m;};
  const oldCounts=counts(state.events),newCounts=counts(events),hours=[];
  for(const key of new Set([...oldCounts.keys(),...newCounts.keys()])){const prev=oldCounts.get(key)||0,next=newCounts.get(key)||0;if(prev!==next)hours.push(`${key}: ${prev} → ${next}교시 (${next-prev>0?'+':''}${next-prev})`);}
  warnings.push(...hours);
  return {errors:[...new Set(errors)],warnings,hours,events,existing:conflicts.size-[...conflicts.keys()].filter(k=>!before.has(k)).length};
}
function slotMinutes(e){const t=state.times[e.period];if(!t)return 0;const minutes=s=>{const [h,m]=s.split(':').map(Number);return h*60+m;};return minutes(t[1])-minutes(t[0]);}
function exchangeRows(left,right,assignments,rooms=new Map()){
  const errors=[],all=[...left,...right],seen=new Set();
  for(const e of all){if(seen.has(e.id))errors.push('같은 슬롯을 양쪽에 중복 선택할 수 없습니다.');seen.add(e.id);}
  const total=rows=>rows.reduce((n,e)=>n+slotMinutes(e),0),leftMinutes=total(left),rightMinutes=total(right);
  if(!left.length||!right.length)errors.push('양쪽에서 맞바꿀 수업 슬롯을 선택하세요.');
  if(leftMinutes!==rightMinutes)errors.push(`수업 총량이 ${Math.abs(leftMinutes-rightMinutes)}분 다릅니다. ${leftMinutes>rightMinutes?'오른쪽 대상 수업':'왼쪽 변경할 수업'}에 추가 수업을 불러오세요.`);
  const rows=[],used=new Set();
  if(!errors.length)for(const [destinations,sources] of [[left,right],[right,left]])for(const dest of destinations){
    const source=sources.find(e=>e.id===assignments.get(dest.id));
    if(!source){errors.push('선택한 교시에 배치할 수업이 부족합니다. 양쪽 시간 선택을 확인하세요.');continue;}
    if(used.has(source.id))errors.push('한 수업 슬롯을 두 번 배치할 수 없습니다.');used.add(source.id);
    if(slotMinutes(dest)!==slotMinutes(source))errors.push('교시 길이가 다릅니다. 같은 수업시간 길이의 슬롯끼리 배치하세요.');
    const after={...dest};for(const k of lessonFields)after[k]=source[k]||'';
    if(rooms.has(source.id))after.room=rooms.get(source.id);
    rows.push({before:structuredClone(dest),after});
  }
  if(!errors.length&&used.size!==all.length)errors.push('빠진 수업 슬롯이 있습니다. 추가 수업까지 모두 배치하세요.');
  return {rows,errors:[...new Set(errors)],leftMinutes,rightMinutes};
}
function compactChanges(rows){
  const out=[];for(const r of [...rows].sort((a,b)=>slotKey(a.after).localeCompare(slotKey(b.after)))){
    const prev=out.at(-1);if(prev&&prev.after.date===r.after.date&&prev.after.group===r.after.group&&prev.last+1===r.after.period&&sameLesson(prev.before,r.before)&&sameLesson(prev.after,r.after))prev.last=r.after.period;
    else out.push({...r,last:r.after.period});
  }return out;
}
function changePlanner(seed){
  if(IS_STUDENT)return;
  const base=JSON.stringify(state.events),blocks=merged(state.events),baskets={left:new Map(),right:new Map()},assignments=new Map(),rooms=new Map();
  const chosen=side=>[...baskets[side].values()];
  const sorted=side=>chosen(side).sort((a,b)=>slotKey(a).localeCompare(slotKey(b)));
  const modules=side=>blocks.map(b=>{const ids=b.ids.filter(id=>baskets[side].has(id));return ids.length?{...b,ids,period:state.events.find(e=>e.id===ids[0]).period,last:state.events.find(e=>e.id===ids.at(-1)).period}:null;}).filter(Boolean);
  const selectedTimes=b=>merged(b.ids.map(id=>state.events.find(e=>e.id===id))).map(e=>periodText(e)).join(' / ');
  const selectedPeriods=b=>merged(b.ids.map(id=>state.events.find(e=>e.id===id))).map(e=>(e.period===e.last?e.period:e.period+'~'+e.last)+'교시').join(', ');
  const selectedModule=id=>[...modules('left'),...modules('right')].find(b=>b.ids[0]===id);
  function placeModule(side,moduleId,start){const sources=modules(side).flatMap(b=>b.ids.map(id=>state.events.find(e=>e.id===id))),destinations=sorted(side==='left'?'right':'left');if(sources.length!==destinations.length)return null;const sourceIndex=sources.findIndex(e=>e.id===moduleId),destIndex=destinations.findIndex(e=>e.id===start),out=new Map();if(sourceIndex<0||destIndex<0)return null;for(let n=0;n<sources.length;n++){const dest=destinations[(destIndex-sourceIndex+n+sources.length)%sources.length];if(slotMinutes(dest)!==slotMinutes(sources[n]))return null;out.set(dest.id,sources[n].id);}return out;}
  const label=e=>`${formatDate(e.date)} ${e.group} ${e.period}교시 ${time(e.period)} / ${e.title} / ${e.teacher||'강사 미정'}`;
  const sideName=side=>side==='left'?'변경할 수업':'맞바꿀 대상 수업';
  show(`<h3>수업 선택 · 시간 총량 맞교환</h3><p>수업에서 바꿀 교시를 선택하세요. 선택한 시간만 맞바꾸고, 연속된 시간은 변경안에서 한 카드로 묶어 표시합니다. 각 과목의 기존 강의실은 유지합니다.</p><button id="exchange-manual">강사만 변경 / 직접 슬롯 편집</button>${!CAN_EDIT?'<p class="readonly">학생 화면은 조회 전용입니다.</p>':''}<div class="exchange-sides">${['left','right'].map(side=>`<section class="exchange-side"><h4>${sideName(side)}</h4><label>교수·강사<select id="exchange-${side}-teacher"><option value="">전체 강사</option>${opts(unique('teacher'),side==='left'?seed?.teacher:'')}</select></label><label>과목<select id="exchange-${side}-subject"><option value="">전체 과목</option>${opts(unique('subject'),side==='left'?seed?.subject:'')}</select></label><label>수업 일정<select id="exchange-${side}-block"></select></label><div id="exchange-${side}-periods" class="exchange-periods"></div><button class="primary" id="exchange-${side}-add">선택 시간 반영</button><div id="exchange-${side}-basket"></div></section>`).join('')}</div><div id="exchange-balance" role="status" aria-live="polite"></div><div id="exchange-affected"></div><div id="exchange-starts"></div><div id="exchange-preview"></div><div id="exchange-check" role="status" aria-live="polite"></div><form id="exchange-form"><label>변경 사유<input id="exchange-reason" required></label><label><input id="exchange-hours" type="checkbox"> 반별 과목 시수 증감을 확인했습니다</label><label><input id="exchange-notify" type="checkbox" checked> 학생 공지에 변경 전후 함께 기록</label><div class="exchange-submit-area"><p id="exchange-action-hint"></p><button class="primary" id="exchange-apply" disabled>변경하기</button></div></form>`);
  $('modal').classList.add('plan-dialog');
  $('exchange-manual').onclick=()=>manualPlanner(seed);
  function pickPeriods(side){
    const value=$('exchange-'+side+'-block').value,b=value===''?null:blocks[Number(value)];
    const hasSelected=b?.ids.some(id=>baskets[side].has(id));
    $('exchange-'+side+'-periods').innerHTML=b?'<div class="module-summary"><b>바꿀 교시 선택</b><br>'+esc(periodText(b))+' · 기존 강의실 '+esc(b.room||'미정')+'</div>'+b.ids.map(id=>{const e=state.events.find(e=>e.id===id);return '<label><input type="checkbox" data-exchange-pick="'+side+'" value="'+esc(id)+'" '+(!hasSelected||baskets[side].has(id)?'checked':'')+'> '+e.period+'교시 <small>'+esc(time(e.period))+'</small></label>';}).join(''):'<p>조건에 맞는 수업이 없습니다.</p>';
  }
  function pickList(side){
    const teacher=$(`exchange-${side}-teacher`).value,subjectSelect=$(`exchange-${side}-subject`),previousSubject=subjectSelect.value;
    const subjects=[...new Set(blocks.filter(e=>!teacher||e.teacher===teacher).map(e=>e.subject).filter(Boolean))].sort();
    const selectedSubject=subjects.includes(previousSubject)?previousSubject:subjects.length===1?subjects[0]:'';
    subjectSelect.innerHTML='<option value="">전체 과목</option>'+opts(subjects,selectedSubject);subjectSelect.value=selectedSubject;
    const subject=subjectSelect.value;
    const list=blocks.map((e,i)=>({e,i})).filter(({e})=>(!teacher||e.teacher===teacher)&&(!subject||e.subject===subject));
    $(`exchange-${side}-block`).innerHTML=list.map(({e,i})=>`<option value="${i}">${esc(formatDate(e.date)+' '+e.group+' '+e.period+'~'+e.last+'교시 / '+e.title+' / '+e.teacher)}</option>`).join('');
    if(side==='left'&&seed){const selected=list.find(x=>x.e.ids.includes(seed.id));if(selected)$(`exchange-${side}-block`).value=String(selected.i);}pickPeriods(side);
  }
  function autoAssign(){
    assignments.clear();for(const [source,dest] of [['left','right'],['right','left']]){
      const sources=modules(source).flatMap(b=>b.ids.map(id=>state.events.find(e=>e.id===id))),available=sorted(dest);
      if(sources.length!==available.length)continue;
      for(const e of sources){const index=available.findIndex(d=>slotMinutes(d)===slotMinutes(e));if(index<0)break;assignments.set(available.splice(index,1)[0].id,e.id);}
    }
  }
  function check(){
    const plan=exchangeRows(sorted('left'),sorted('right'),assignments,rooms),result=validatePlan(plan.rows),errors=[...plan.errors,...result.errors],changed=plan.rows.filter(r=>!sameLesson(r.before,r.after));
    document.querySelectorAll('[data-exchange-room-status]').forEach(el=>{
      const ids=el.dataset.exchangeRoomStatus.split('|'),bookings=[],current=result.events.filter(e=>ids.includes(e.id));
      for(const e of current){const t=state.times[e.period];for(const other of result.events){const ot=state.times[other.period];if(other.id!==e.id&&other.date===e.date&&e.room?.trim()&&other.room?.trim()===e.room.trim()&&t&&ot&&t[0]<ot[1]&&ot[0]<t[1])bookings.push(formatDate(e.date)+' '+e.period+'교시: '+other.group+' '+other.title+' / '+other.teacher);}}
      const empty=current.some(e=>!e.room?.trim());el.textContent=empty?'강의실을 입력하세요.':bookings.length?'같은 시간 예약: '+[...new Set(bookings)].join(' · '):'수업 묶음 전체 시간의 강의실 중복 예약 없음';el.classList.toggle('plan-errors',empty||!!bookings.length);
    });
    $('exchange-check').innerHTML=`<h4>교차 검증 · ${blocks.filter(b=>b.ids.some(id=>changed.some(r=>assignments.get(r.after.id)===id))).length}개 수업 묶음 변경</h4>${errors.length?`<ul class="plan-errors">${errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`:'<p class="plan-ok">모든 수업 시간 총량 유지 · 새 반·강사·강의실 중복 없음</p>'}${result.hours.length?`<p>반별 과목 시수 변화</p><ul>${result.hours.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`:''}${result.existing?`<p class="muted">기존 중복 ${result.existing}건은 유지됩니다.</p>`:''}`;
    $('exchange-apply').disabled=!CAN_EDIT||!changed.length||!!errors.length||(result.hours.length&&!$('exchange-hours').checked);
    $('exchange-action-hint').textContent=!CAN_EDIT?'학생 화면은 조회 전용입니다.':errors.length?'양쪽 수업을 추가하고 위 검증 항목을 해결하면 기록할 수 있습니다.':!changed.length?'기록할 변경사항이 없습니다.':result.hours.length&&!$('exchange-hours').checked?'반별 과목 시수 증감을 확인해 주세요.':'검증을 통과했습니다. 변경 사유를 입력하고 변경하기를 누르세요. 학생 화면 반영은 왼쪽의 수정·공지 공유 저장을 눌러야 합니다.';
    return {...result,changed,errors};
  }
  function preview(){
    const plan=exchangeRows(sorted('left'),sorted('right'),assignments,rooms);
    $('exchange-starts').innerHTML='';
    $('exchange-preview').innerHTML=plan.errors.length?'':
      '<datalist id="exchange-room-options">'+unique('room').map(r=>'<option value="'+esc(r)+'">').join('')+'</datalist><h4>현재 → 변경 · 수업 묶음 단위</h4><p>선택한 연속 시간을 한 카드로 표시합니다. 강의실 변경은 카드에 포함된 선택 시간에 함께 적용됩니다.</p>'+
      ['left','right'].map(side=>modules(side).map(b=>{
        const destSide=side==='left'?'right':'left',destinations=sorted(destSide),placed=destinations.filter(e=>b.ids.includes(assignments.get(e.id))).sort((a,z)=>a.period-z.period),first=destinations.find(e=>assignments.get(e.id)===b.ids[0]),last=placed.at(-1),roomValue=rooms.has(b.ids[0])?rooms.get(b.ids[0]):b.room||'';
        const options=destinations.filter(e=>placeModule(side,b.ids[0],e.id));
        const spans=merged(placed.map(e=>({...e,title:b.title,subject:b.subject,teacher:b.teacher,room:b.room})));
        const destinationText=spans.map(e=>formatDate(e.date)+' '+e.group+' '+periodText(e)).join(' / ');
        return '<section class="exchange-module"><h4>'+esc(b.title+' · '+b.ids.length+'시간 / '+b.teacher)+'</h4><div class="compare"><div><b>현재 수업 묶음</b><p>'+esc(formatDate(b.date)+' '+b.group+' / '+b.room)+'</p><p>'+esc(selectedTimes(b))+'</p></div><div><b>변경 수업 묶음</b><p>'+esc(destinationText)+'</p><label>묶음 시작 슬롯<select data-module-start="'+esc(b.ids[0])+'" data-module-side="'+side+'">'+options.map(e=>'<option value="'+esc(e.id)+'" '+(e.id===first?.id?'selected':'')+'>'+esc(formatDate(e.date)+' '+e.group+' '+e.period+'교시 · '+time(e.period))+'</option>').join('')+'</select></label><div class="exchange-room"><label>이 수업 묶음의 강의실<input data-module-room="'+esc(b.ids[0])+'" list="exchange-room-options" value="'+esc(roomValue)+'"></label><small>기본 강의실: '+esc(b.room||'미정')+' · '+b.ids.length+'시간 전체에 적용</small><button type="button" data-module-room-reset="'+esc(b.ids[0])+'">기존 강의실로 복원</button><p data-exchange-room-status="'+esc(placed.map(e=>e.id).join('|'))+'"></p></div></div></div></section>';
      }).join('')).join('');
    document.querySelectorAll('[data-module-start]').forEach(select=>select.onchange=()=>{
      const side=select.dataset.moduleSide,plan=placeModule(side,select.dataset.moduleStart,select.value);if(!plan)return;
      for(const [id,value] of plan)assignments.set(id,value);$('exchange-hours').checked=false;preview();
    });
    document.querySelectorAll('[data-module-room]').forEach(input=>input.oninput=()=>{const b=selectedModule(input.dataset.moduleRoom);for(const id of b.ids)rooms.set(id,input.value.trim());check();});
    document.querySelectorAll('[data-module-room-reset]').forEach(button=>button.onclick=()=>{const b=selectedModule(button.dataset.moduleRoomReset);for(const id of b.ids)rooms.delete(id);preview();});check();
  }
  function draw(){
    $('exchange-hours').checked=false;
    for(const side of ['left','right'])$('exchange-'+side+'-basket').innerHTML=modules(side).map(b=>'<div class="exchange-chip"><span>'+esc(formatDate(b.date)+' '+b.group+' '+selectedPeriods(b)+' / '+b.title+' / '+b.teacher+' / '+b.ids.length+'시간 · '+b.room)+'</span><button type="button" data-module-remove="'+esc(b.ids[0])+'" data-side="'+side+'">묶음 제외</button></div>').join('')||'<p class="muted">선택한 수업 묶음 없음</p>';
    document.querySelectorAll('[data-module-remove]').forEach(button=>button.onclick=()=>{const b=selectedModule(button.dataset.moduleRemove);for(const id of b.ids){baskets[button.dataset.side].delete(id);rooms.delete(id);}autoAssign();draw();});
    const plan=exchangeRows(sorted('left'),sorted('right'),assignments),delta=plan.leftMinutes-plan.rightMinutes;
    $('exchange-balance').innerHTML='<b>변경할 수업 '+modules('left').length+'개 묶음 · '+plan.leftMinutes+'분 ↔ 대상 수업 '+modules('right').length+'개 묶음 · '+plan.rightMinutes+'분</b><p>'+(delta?(delta>0?'대상 수업':'변경할 수업')+' 쪽에 '+Math.abs(delta)+'분을 추가하거나 긴 쪽에서 바꿀 교시만 선택하세요.':plan.leftMinutes?'시간 총량 일치 · 선택한 시간만 맞교환합니다.':'양쪽에서 수업 묶음을 추가하세요.')+'</p>';
    const shorter=delta>0?'right':'left',anchor=sorted(shorter).at(-1),selected=new Set([...baskets.left.keys(),...baskets.right.keys()]);
    const candidates=anchor?blocks.filter(b=>b.date===anchor.date&&b.group===anchor.group&&b.period>anchor.period&&!b.ids.some(id=>selected.has(id))):[];
    $('exchange-affected').innerHTML=delta?'<section class="exchange-impact"><h4>추가로 선택할 수업</h4><p>부족한 시간만 추가하거나, 위에서 긴 수업의 일부 교시를 선택해 총량을 맞출 수 있습니다.</p>'+candidates.map(b=>{let minutes=0;const ids=[];for(const id of b.ids){const e=state.events.find(e=>e.id===id);if(minutes>=Math.abs(delta))break;ids.push(id);minutes+=slotMinutes(e);}return '<button type="button" data-module-extra="'+esc(ids.join('|'))+'" data-side="'+shorter+'">'+esc(formatDate(b.date)+' '+b.title+' / '+minutes+'분 추가')+'</button>';}).join('')+'</section>':'';
    document.querySelectorAll('[data-module-extra]').forEach(button=>button.onclick=()=>{for(const id of button.dataset.moduleExtra.split('|'))baskets[button.dataset.side].set(id,state.events.find(e=>e.id===id));autoAssign();draw();});preview();
  }
  for(const side of ['left','right']){
    $('exchange-'+side+'-teacher').onchange=()=>pickList(side);$('exchange-'+side+'-subject').onchange=()=>pickList(side);$('exchange-'+side+'-block').onchange=()=>pickPeriods(side);pickList(side);
    $('exchange-'+side+'-add').onclick=()=>{
      const value=$('exchange-'+side+'-block').value,b=value===''?null:blocks[Number(value)];if(!b)return;
      const ids=[...document.querySelectorAll('[data-exchange-pick="'+side+'"]:checked')].map(input=>input.value);
      if(!ids.length){$('exchange-check').textContent='바꿀 교시를 하나 이상 선택하세요.';return;}
      if(ids.some(id=>baskets[side==='left'?'right':'left'].has(id))){$('exchange-check').textContent='반대쪽에 이미 선택된 교시입니다. 먼저 제외하세요.';return;}
      const savedRoom=b.ids.map(id=>rooms.get(id)).find(value=>value!==undefined);
      for(const id of b.ids){baskets[side].delete(id);rooms.delete(id);}
      if(savedRoom!==undefined)for(const id of ids)rooms.set(id,savedRoom);
      for(const id of ids)baskets[side].set(id,state.events.find(e=>e.id===id));autoAssign();draw();
    };
  }
  $('exchange-hours').onchange=check;
  $('exchange-form').onsubmit=ev=>{
    ev.preventDefault();if(!CAN_EDIT)return;if(JSON.stringify(state.events)!==base)return $('exchange-check').textContent='시간표가 갱신되었습니다. 변경 창을 다시 열어 주세요.';
    const result=check(),reason=$('exchange-reason').value.trim();if(result.errors.length||!result.changed.length||!reason||(result.hours.length&&!$('exchange-hours').checked))return;
    const batchId=crypto.randomUUID();for(const r of result.changed){log('수업 시간 총량 맞교환',r.before,r.after,reason);state.history.at(-1).batchId=batchId;}
    state.events=result.events;
    if($('exchange-notify').checked)for(const g of new Set(result.changed.map(r=>r.after.group)))addNotice(g,'수업 맞교환 안내',compactChanges(result.changed.filter(r=>r.after.group===g)).map(r=>`${formatDate(r.after.date)} ${r.after.period===r.last?r.after.period:r.after.period+'~'+r.last}교시 ${state.times[r.after.period][0]}~${state.times[r.last][1]}\n현재: ${r.before.title} / ${r.before.teacher} / ${r.before.room}\n변경: ${r.after.title} / ${r.after.teacher} / ${r.after.room}`).join('\n\n')+'\n\n사유: '+reason);
    setDirty();$('modal').close();render();msg(`수업 묶음의 시간 총량·강의실·강사 충돌을 검증해 맞교환을 기록했습니다. 공유 저장하면 배포됩니다.`);
  };
  if(seed){const b=blocks.find(b=>b.ids.includes(seed.id));for(const id of b?.ids||[])baskets.left.set(id,state.events.find(e=>e.id===id));}draw();
}
function manualPlanner(seed){
  if(IS_STUDENT)return;
  const base=JSON.stringify(state.events),draft=new Map();
  const add=e=>{const key=slotKey(e);if(!draft.has(key)){const before=state.events.find(x=>slotKey(x)===key)||null;draft.set(key,{before:before&&structuredClone(before),after:before?structuredClone(before):{id:'new-'+crypto.randomUUID(),date:e.date,group:e.group,period:e.period,subject:'',title:'',teacher:'',room:''}});}return draft.get(key);};
  const blocks=merged(state.events),subjects=unique('subject');
  show(`<h3>시간표 변경 · 슬롯 교차 검증</h3>${seed&&CAN_EDIT?'<button id="plan-single">선택한 한 교시만 수정·삭제</button>':''}<p>대상 과목과 수업을 선택하세요. 현재·변경 슬롯을 비교하며 강사 변경, 수업 맞교환, 빈자리 보충을 한 번에 기록합니다.</p>${!CAN_EDIT?'<p class="readonly">학생 화면은 조회 전용입니다.</p>':''}<div class="plan-pickers"><label>대상 과목<select id="plan-subject">${opts(subjects,seed?.subject||subjects[0])}</select></label><label>대상 수업<select id="plan-block"></select></label><button id="plan-select">선택 수업을 변경안에 추가</button></div><div class="plan-pickers"><label>추가 / 이동 날짜<input id="plan-date" type="date" value="${esc(seed?.date||day)}"></label><label>반<select id="plan-group">${opts(['A반','B반'],seed?.group||group)}</select></label><label>시작 교시<select id="plan-period">${opts(teachingPeriods.map(String),'1')}</select></label><button id="plan-slot">슬롯 추가</button><button id="plan-swap">선택 수업 이동·맞교환</button></div><p class="muted">이동·맞교환은 선택 수업의 교시 수만큼 적용합니다(점심 제외). 이동 위치에 수업이 있으면 원래 자리로 맞바꾸고, 빈자리이면 원래 자리를 직접 채워야 합니다. 강사 가능일·담당 자격은 별도 확인이 필요합니다.</p><datalist id="plan-teachers">${unique('teacher').map(v=>`<option value="${esc(v)}">`).join('')}</datalist><datalist id="plan-rooms">${unique('room').map(v=>`<option value="${esc(v)}">`).join('')}</datalist><div class="plan-pickers"><label>선택 수업의 변경 강사<input id="plan-bulk-teacher" list="plan-teachers" placeholder="변경할 강사 이름"></label><button id="plan-bulk-apply">선택 수업 전체 교시에 강사 적용</button></div><div id="plan-rows"></div><div id="plan-check" role="status" aria-live="polite"></div><form id="plan-form"><label>변경 사유<input id="plan-reason" required></label><label><input id="plan-hours" type="checkbox"> 과목별 시수 증감을 확인했습니다</label><label><input id="plan-notify" type="checkbox" checked> 변경 전후를 학생 공지로 함께 기록</label><div class="actions"><button type="button" id="plan-validate">교차 검증</button><button id="plan-apply" class="primary" ${!CAN_EDIT?'disabled':''}>변경안 일괄 기록</button></div></form>`);
  $('modal').classList.add('plan-dialog');on('plan-single','onclick',()=>{$('modal').classList.remove('plan-dialog');editEvent(seed,true);});
  const blockList=()=>{const filtered=blocks.map((e,i)=>({e,i})).filter(x=>x.e.subject===$('plan-subject').value);$('plan-block').innerHTML=filtered.map(({e,i})=>`<option value="${i}">${esc(formatDate(e.date)+' '+e.group+' '+e.period+'~'+e.last+'교시 / '+e.title+' / '+e.teacher)}</option>`).join('');if(seed){const selected=filtered.find(x=>x.e.ids.includes(seed.id));if(selected)$('plan-block').value=String(selected.i);}};
  const selectedBlock=()=>blocks[Number($('plan-block').value)];
  const check=()=>{
    const rows=[...draft.values()],result=validatePlan(rows),changed=rows.filter(r=>!sameLesson(r.before,r.after));
    $('plan-check').innerHTML=`<h4>교차 검증 · ${changed.length}개 슬롯 변경</h4>${result.errors.length?`<ul class="plan-errors">${result.errors.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="plan-ok">새 반·강사·강의실 중복 없음 · 빈자리 없음</p>'}${result.hours.length?`<p>과목별 시수 변화 (전체 과정)</p><ul>${result.hours.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>반별·과목별 총 시수 유지</p>'}${result.existing?`<p class="muted">기존 중복 ${result.existing}건은 유지됩니다. 합반 여부 등 기존 일정 확인이 필요합니다.</p>`:''}`;
    $('plan-apply').disabled=!CAN_EDIT||!changed.length||!!result.errors.length||(result.hours.length&&!$('plan-hours').checked);
    return {...result,changed};
  };
  const draw=()=>{
    $('plan-hours').checked=false;
    $('plan-rows').innerHTML=[...draft.values()].sort((a,b)=>slotKey(a.after).localeCompare(slotKey(b.after))).map(r=>{const e=r.after,key=slotKey(e);return `<section class="plan-row"><div class="plan-row-head"><b>${esc(formatDate(e.date))} · ${esc(e.group)} · ${e.period}교시 <small>${esc(time(e.period))}</small></b><button type="button" data-plan-remove="${esc(key)}">변경안에서 제외</button></div><div class="compare"><div><h4>현재</h4><p>${r.before?snapshot(r.before):'빈 슬롯'}</p></div><div><h4>변경</h4><label>기존 수업으로 채우기<select data-plan-fill="${esc(key)}"><option value="">직접 입력 / 수업 선택</option>${blocks.map((b,i)=>`<option value="${i}">${esc(b.group+' '+b.date+' '+b.period+'교시 / '+b.title+' / '+b.teacher)}</option>`).join('')}</select></label><div class="plan-fields">${[['subject','과목'],['title','강의 내용'],['teacher','강사'],['room','강의실']].map(([k,l])=>`<label>${l}<input data-plan-key="${esc(key)}" data-plan-field="${k}" aria-label="${esc(e.group+' '+e.date+' '+e.period+'교시 변경 '+l)}" value="${esc(e[k])}" ${k==='teacher'?'list="plan-teachers"':k==='room'?'list="plan-rooms"':''}></label>`).join('')}</div></div></div></section>`;}).join('')||'<p class="noresult">위에서 변경하려는 수업을 선택하세요.</p>';
    document.querySelectorAll('[data-plan-field]').forEach(input=>input.oninput=()=>{draft.get(input.dataset.planKey).after[input.dataset.planField]=input.value.trim();$('plan-hours').checked=false;check();});
    document.querySelectorAll('[data-plan-fill]').forEach(select=>select.onchange=()=>{if(select.value==='')return;const row=draft.get(select.dataset.planFill),source=blocks[Number(select.value)];for(const k of lessonFields)row.after[k]=source[k]||'';draw();});
    document.querySelectorAll('[data-plan-remove]').forEach(button=>button.onclick=()=>{draft.delete(button.dataset.planRemove);draw();});
    check();
  };
  $('plan-subject').onchange=blockList;blockList();
  $('plan-bulk-apply').onclick=()=>{const b=selectedBlock(),name=$('plan-bulk-teacher').value.trim();if(!b||!name)return;for(const id of b.ids)add(state.events.find(e=>e.id===id)).after.teacher=name;draw();};
  $('plan-select').onclick=()=>{const b=selectedBlock();if(b)for(const id of b.ids)add(state.events.find(e=>e.id===id));draw();};
  const destination=()=>({date:$('plan-date').value,group:$('plan-group').value,period:Number($('plan-period').value)});
  $('plan-slot').onclick=()=>{const d=destination();if(!d.date)return;add(d);draw();};
  $('plan-swap').onclick=()=>{
    const b=selectedBlock(),to=destination();if(!b||!to.date)return;
    const periods=teachingPeriods.slice(teachingPeriods.indexOf(to.period),teachingPeriods.indexOf(to.period)+b.ids.length);
    if(periods.length!==b.ids.length)return $('plan-check').textContent='이동할 교시가 부족합니다. 시작 교시를 앞당기세요.';
    const sources=b.ids.map(id=>state.events.find(e=>e.id===id)),targets=periods.map(period=>({...to,period}));
    if(targets.some(t=>sources.some(s=>slotKey(t)===slotKey(s))))return $('plan-check').textContent='원래 수업과 겹치는 위치입니다. 겹치지 않는 날짜·반·교시를 선택하세요.';
    const affected=[...sources,...targets];
    if(affected.some(e=>{const r=draft.get(slotKey(e));return r&&!sameLesson(r.before,r.after);})&&!confirm('이동 대상에 작성 중인 변경안이 있습니다. 해당 슬롯을 현재 시간표 기준으로 다시 맞바꿀까요?'))return;
    sources.forEach((source,i)=>{const a=add(source),z=add(targets[i]),occupant=z.before;for(const k of lessonFields){z.after[k]=source[k]||'';a.after[k]=occupant?.[k]||'';}});draw();
  };
  $('plan-validate').onclick=check;$('plan-hours').onchange=check;
  $('plan-form').onsubmit=ev=>{
    ev.preventDefault();if(!CAN_EDIT)return;
    if(JSON.stringify(state.events)!==base)return $('plan-check').textContent='시간표가 갱신되었습니다. 창을 닫고 변경안을 다시 작성하세요.';
    const result=check();if(!result.changed.length||result.errors.length||(result.hours.length&&!$('plan-hours').checked))return;
    const reason=$('plan-reason').value.trim();if(!reason)return $('plan-reason').focus();
    const batchId=crypto.randomUUID();
    for(const r of result.changed){log('슬롯 일괄 변경',r.before,r.after,reason);state.history.at(-1).batchId=batchId;}
    state.events=result.events;
    if($('plan-notify').checked)for(const g of new Set(result.changed.map(r=>r.after.group))){const details=result.changed.filter(r=>r.after.group===g).map(r=>`${formatDate(r.after.date)} ${r.after.period}교시\n현재: ${r.before?r.before.title+' / '+r.before.teacher+' / '+r.before.room:'빈 슬롯'}\n변경: ${r.after.title} / ${r.after.teacher} / ${r.after.room}`).join('\n\n');addNotice(g,'수업 시간표·강사 변경 안내',details+'\n\n사유: '+reason);}
    setDirty();$('modal').close();render();msg(`${result.changed.length}개 슬롯을 교차 검증해 기록했습니다. 공유 저장하면 학생 시간표·공지·구독 파일에 함께 반영됩니다.`);
  };
  if(seed){const b=selectedBlock();if(b)for(const id of b.ids)add(state.events.find(e=>e.id===id));}draw();
}
function log(kind,before,after,reason){state.history.push({id:crypto.randomUUID(),kind,before:structuredClone(before),after:structuredClone(after),reason,at:new Date().toISOString(),author:actor})}
function addNotice(group,title,body){state.notices.push({id:crypto.randomUUID(),group,title,body,published:true,author:actor,createdAt:new Date().toISOString()})}
function noticeEditor(){show('<h3>학생 공지 작성</h3><form id="noticeform"><label>대상<select name="group"><option>전체</option><option>A반</option><option>B반</option></select></label><label>제목<input name="title" required></label><label>공지 내용<textarea name="body" required></textarea></label><button class="primary">공개 공지로 기록</button></form>');$('noticeform').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);addNotice(f.get('group'),f.get('title'),f.get('body'));setDirty();$('modal').close();render();msg('공지 초안을 기록했습니다. 공유 저장 후 학생 링크에서 확인할 수 있습니다.')}}
function ical(data,which='all'){const clean=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'),stamp=(data.updatedAt||new Date().toISOString()).replace(/[-:]/g,'').replace(/\.\d+Z/,'Z'),rows=data.events.filter(e=>which==='all'||e.group===(which==='a'?'A반':'B반'));const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ASEA COLLEGE//KAI 2026//KO','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+clean('2026 직업계고 카이과정'+(which==='all'?'':' '+which.toUpperCase()+'반')),'X-WR-TIMEZONE:Asia/Seoul'];for(const e of rows){const t=data.times[e.period],d=e.date.replaceAll('-',''),uid=e.id.replace('A반','a').replace('B반','b');lines.push('BEGIN:VEVENT','UID:'+uid+'@asea-college.github.io','DTSTAMP:'+stamp,'SEQUENCE:'+data.revision,'DTSTART;TZID=Asia/Seoul:'+d+'T'+t[0].replace(':','')+'00','DTEND;TZID=Asia/Seoul:'+d+'T'+t[1].replace(':','')+'00','SUMMARY:'+clean(`[${e.group}] ${e.title}`),'LOCATION:'+clean(e.room),'DESCRIPTION:'+clean(`${e.period}교시 / 강사: ${e.teacher}\n${e.subject}\n${BASE+(e.group==='A반'?'a':'b')+'.html'}`),'END:VEVENT')}lines.push('END:VCALENDAR');return lines.map(line=>{let out='',length=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(length+bytes>73){out+='\r\n ';length=1}out+=char;length+=bytes}return out}).join('\r\n')+'\r\n'}
async function readShared(){
  const r=await fetch(SHARED_API+'?class='+(IS_STUDENT?(STUDENT==='A반'?'a':'b'):'all'),{cache:'no-store'}),data=await r.json();if(!r.ok)throw new Error(data.error||'공유 시간표를 불러오지 못했습니다.');return data;
}
async function publish(){
  if(!CAN_EDIT||busy)return;if(!dirty)return msg('공유할 변경사항이 없습니다.');
  busy=true;$('publish').disabled=true;msg('공유 시간표를 저장하고 있습니다…');
  try{
    const r=await fetch(SHARED_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({baseRevision:original.revision,next:state})}),next=await r.json();
    if(!r.ok)throw new Error(next.error||'공유 저장에 실패했습니다.');
    state=next;original=structuredClone(next);dirty=false;window.onbeforeunload=null;$('dirty').textContent='공유판 v'+state.revision+' · 저장됨';render();msg('공유 저장 완료. 다른 사람과 학생 화면에도 반영됩니다. 구독 캘린더는 제공자의 재조회 주기에 따라 갱신됩니다.');
  }catch(err){msg('저장 실패: '+err.message);}finally{busy=false;$('publish').disabled=!dirty;}
}
function printContext(){
  const scope=IS_STUDENT?STUDENT:page==='class'?group:page==='person'?teacher+' 개인별':page==='room'?room+' 강의실별':menus[page]||'통합';
  const mode=IS_STUDENT?(layout==='month'?'월간':rangeEnabled?'기간별':'일별'):layout==='month'?'월간':layout==='week'?'주간':'일정표';
  let range=rangeLabel();
  if(IS_STUDENT&&layout!=='month'&&!rangeEnabled)range=formatDate(day);
  else if(layout==='week'){
    const d=new Date(week+'T12:00:00');d.setDate(d.getDate()-(d.getDay()+6)%7);const first=d.toLocaleDateString('sv-SE');d.setDate(d.getDate()+6);const last=d.toLocaleDateString('sv-SE');const shownStart=rangeEnabled&&rangeStart>first?rangeStart:first,shownEnd=rangeEnabled&&rangeEnd<last?rangeEnd:last;range=shownStart<=shownEnd?formatDate(shownStart)+' ~ '+formatDate(shownEnd):formatDate(first)+' ~ '+formatDate(last)+' (지정 기간의 수업 없음)';
  }
  return {scope,mode,range,label:scope+' '+mode+' 시간표',monthly:layout==='month'&&(IS_STUDENT||['all','class','person','room'].includes(page))};
}
function cleanPrint(html){
  return html.replace(/<div class="actions">[\s\S]*?<\/div>/g,'').replace(/<button\b([^>]*)>/g,'<span$1>').replace(/<\/button>/g,'</span>').replace(/\s(?:id|data-[\w-]+|title)="[^"]*"/g,'');
}
function printSection(content,ctx,index,total,note=''){
  return `<section class="paper page print-page"><div class="print-title"><small>ASEA COLLEGE · KAI COURSE 2026</small><h2>${esc(ctx.label)}</h2><p>${TITLE}</p><div class="print-meta"><span>기간: ${esc(ctx.range)}</span><span>조회 대상: ${esc(ctx.scope)}</span><span>${ctx.monthly?(detail?'세부사항 표시':'전체 윤곽'):ctx.mode}</span>${note?`<span>${esc(note)}</span>`:''}</div></div><div class="print-content">${cleanPrint(content)}</div><div class="foot"><span>공유판 v${state.revision} · ${esc(formatDate(state.updatedAt?.slice(0,10)))}${dirty?' · 미공유 수정본':''}</span><span>${index} / ${total}</span></div></section>`;
}
function buildPrintDocument(format='screen'){
  const ctx=printContext();
  if(!IS_STUDENT&&['share','settings'].includes(page))throw new Error('설정 화면에서는 인쇄할 수 없습니다. 시간표 또는 공지 화면을 선택해 주세요.');
  if(ctx.monthly){
    const sections=[];
    for(const key of monthKeys()){
      const html=monthPanel(key);
      if(format!=='split'){sections.push({content:html,note:key});continue;}
      const grid=html.slice(html.indexOf('<div class="calendar'),html.lastIndexOf('</div></div>'));
      const inner=grid.slice(grid.indexOf('>')+1),heads=inner.match(/<div class="weekday">[\s\S]*?<\/div>/g)||[];
      const rest=inner.slice(heads.join('').length),cells=[];let depth=0,from=0,match;
      const tags=/<\/?div\b[^>]*>/g;
      while((match=tags.exec(rest))){if(match[0].startsWith('</'))depth--;else{if(depth===0)from=match.index;depth++;}if(depth===0)cells.push(rest.slice(from,tags.lastIndex));}
      for(let i=0;i<cells.length;i+=heads.length)sections.push({content:`<div class="calendar ${heads.length===7?'weekends':''}">${heads.join('')+cells.slice(i,i+heads.length).join('')}</div>`,note:`${key} · ${i/heads.length+1}번째 주`});
    }
    return {ctx,paper:format==='split'?'A4':'A3',html:sections.map((item,i)=>printSection(item.content,ctx,i+1,sections.length,item.note)).join('')};
  }
  if(IS_STUDENT){
    if(rangeEnabled)return {ctx,paper:'A4',html:reportHTML(selected(),STUDENT+' 기간별 시간표')};
    const rows=state.events.filter(e=>e.date===day&&e.group===STUDENT);
    return {ctx,paper:'A4',html:printSection(`<div class="print-daily">${merged(rows).map(lesson).join('')||'<p>수업이 없습니다.</p>'}</div>`,ctx,1,1)};
  }
  if(page==='notices'||page==='history')return {ctx,paper:'A4',html:printSection(page==='notices'?noticesView():historyView(),{...ctx,label:menus[page],mode:'목록'},1,1)};
  if(layout==='week')return {ctx,paper:'A3',html:printSection(weekView(),ctx,1,1)};
  return {ctx,paper:'A4',html:reportHTML(selected())};
}
function printHTML(html,paper='A4'){
  $('printarea').innerHTML=html;
  let size=document.getElementById('print-page-size');
  if(!size){size=document.createElement('style');size.id='print-page-size';document.head.append(size);}
  size.textContent=`@media print{@page{size:${paper} landscape;margin:10mm}}`;
  document.fonts.ready.then(()=>window.print());
}
function openPrintPreview(){
  try{
    const ctx=printContext(),initial=buildPrintDocument();
    show(`<div class="print-preview-tools"><h3>현재 화면 인쇄 미리보기</h3><p>${esc(ctx.label)} · ${esc(ctx.range)}</p>${ctx.monthly?'<label>출력 배치<select id="print-format"><option value="screen">월간 한눈에 보기 · A3 가로</option><option value="split">월간 달력을 주별로 나누기 · A4 가로</option></select></label>':'<p class="muted">선택한 조회 대상과 화면 모드를 그대로 출력합니다.</p>'}<div class="actions"><button id="print-confirm" class="primary">이대로 인쇄 / PDF</button><button id="print-image">이 모드로 JPG 저장</button></div></div><div id="print-preview-pages" class="print-preview-pages">${initial.html}</div>`);
    $('modal').classList.add('print-dialog');
    const build=()=>buildPrintDocument($('print-format')?.value||'screen');
    on('print-format','onchange',()=>{$('print-preview-pages').innerHTML=build().html;});
    $('print-confirm').onclick=()=>{const result=build();printHTML(result.html,result.paper);};
    $('print-image').onclick=()=>{const result=build();jpgHTML(result.html,'KAI-'+result.ctx.scope+'-'+result.ctx.mode+'-'+(rangeEnabled?rangeStart+'_'+rangeEnd:month));};
  }catch(err){msg(err.message);}
}

function reportRows(){if(layout!=='week')return selected();const d=new Date(week+'T12:00:00');d.setDate(d.getDate()-(d.getDay()+6)%7);const start=d.toLocaleDateString('sv-SE');d.setDate(d.getDate()+6);const end=d.toLocaleDateString('sv-SE');return state.events.filter(e=>e.date>=start&&e.date<=end&&(!rangeEnabled||inPeriod(e.date))&&(!IS_STUDENT||e.group===STUDENT)&&(page!=='class'||e.group===group)&&(page!=='person'||e.teacher===teacher)&&(page!=='room'||e.room===room))}
async function jpgHTML(html,name){if(!window.html2canvas)return msg('이미지 저장 기능을 불러오지 못했습니다. 새로고침해 주세요.');msg('출력 이미지를 만들고 있습니다…');const container=document.createElement('div');container.style.cssText='position:absolute;left:-20000px;top:0;width:1400px;background:white;padding:45px;color:#1d334d';container.innerHTML=html;document.body.append(container);try{await document.fonts.ready;const pages=container.querySelectorAll('.page');for(let i=0;i<pages.length;i++){const canvas=await html2canvas(pages[i],{scale:1.6,backgroundColor:'#ffffff',logging:false});await new Promise(resolve=>canvas.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name}-${i+1}.jpg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);resolve()},'image/jpeg',.95))}msg('JPG 저장 완료. 여러 페이지이면 브라우저의 다중 다운로드를 허용해 주세요.')}catch(err){msg('이미지 저장 실패: '+err.message)}finally{container.remove()}}
function exportNotice(id,print){const n=state.notices.find(x=>x.id===id);if(!n)return;const html=`<section class="paper page"><div class="paperhead"><small>${TITLE}</small><h2>${esc(n.title)}</h2><p>${esc(n.group)} · ${esc(formatDate(n.createdAt.slice(0,10)))}</p></div><p style="white-space:pre-line;font-size:20px">${esc(n.body)}</p><div class="foot"><span>교육운영 담당 · ${esc(n.author)}</span><span>공유판 v${state.revision}</span></div></section>`;print?printHTML(html):jpgHTML(html,'KAI-공지')}
async function start(){try{
  state=await readShared();original=structuredClone(state);
  if(IS_STUDENT){document.body.classList.add('student');$('menu').hidden=true;$('sidebar').remove();$('nav')?.remove();layout='list';}
  else{
    $('nav').innerHTML=Object.entries(menus).map(([k,v])=>'<button data-page="'+k+'">'+v+'</button>').join('');
    document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;render();});
    $('publish').onclick=publish;$('publish').disabled=true;$('dirty').textContent='공유판 v'+state.revision+' · 저장됨';
    $('menu').onclick=()=>{const hidden=document.body.classList.toggle('collapsed');$('menu').setAttribute('aria-expanded',String(!hidden));};
  }
  $('close').onclick=()=>$('modal').close();$('modal').addEventListener('close',()=>$('modal').classList.remove('print-dialog','plan-dialog'));
  $('print').onclick=openPrintPreview;$('jpg').onclick=()=>{try{const result=buildPrintDocument();jpgHTML(result.html,'KAI-'+result.ctx.scope+'-'+result.ctx.mode+'-'+(rangeEnabled?rangeStart+'_'+rangeEnd:month));}catch(err){msg(err.message);}};
  render();msg(IS_STUDENT?'해당 반의 공개 일정입니다. 마지막 공유: '+new Date(state.updatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'링크를 가진 누구나 수정할 수 있습니다. 변경 후 수정·공지 공유 저장을 눌러 주세요.');
}catch(err){msg(err.message);}}
if(typeof document!=='undefined'){start();setInterval(async()=>{
  if(!state||dirty||busy||document.hidden)return;
  try{const next=await readShared();if(next.revision>state.revision){state=next;original=structuredClone(next);if(!IS_STUDENT)$('dirty').textContent='공유판 v'+state.revision+' · 저장됨';render();msg('최신 공유 일정과 공지를 반영했습니다.');}}catch{}
},15000);}
