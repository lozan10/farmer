'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Upload,Plus,X} from 'lucide-react';

export type CommRow={ref:string;type:string;title:string;district:string;quantity:string;status:string;happened_on:string|null};

/** Split one CSV line, honouring "quoted, fields". */
function splitLine(line:string):string[]{
  const out:string[]=[];let cur='';let q=false;
  for(let i=0;i<line.length;i++){const c=line[i];
    if(q){if(c==='"'&&line[i+1]==='"'){cur+='"';i++}else if(c==='"'){q=false}else cur+=c}
    else if(c==='"')q=true;else if(c===','){out.push(cur);cur=''}else cur+=c}
  out.push(cur);return out.map(s=>s.trim());
}

/** CSV -> rows. First line is a header; columns are matched by name. */
export function parseCsv(text:string):Partial<CommRow>[]{
  const lines=text.split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length)return[];
  const head=splitLine(lines[0]).map(h=>h.toLowerCase().replace(/[^a-z]/g,''));
  const pick=(cells:string[],...names:string[])=>{
    for(const n of names){const i=head.indexOf(n);if(i>=0&&cells[i])return cells[i]}
    return '';
  };
  return lines.slice(1).map(l=>{const c=splitLine(l);return{
    ref:pick(c,'ref','reference','code','id'),
    type:pick(c,'type','channel','communication','communicationtype'),
    title:pick(c,'title','name','campaign','description'),
    district:pick(c,'district','location','region','place'),
    quantity:pick(c,'quantity','count','volume','spots','copies','amount'),
    status:pick(c,'status','state')||'Completed',
    happened_on:pick(c,'date','happenedon','when')||null,
  }}).filter(r=>r.type||r.title);
}

const TYPES=['Radio ad','Banners','SMS blast','Farmer meeting','Posters & flyers','TV spot','Community outreach'];
const blank={ref:'',type:TYPES[0],title:'',district:'',quantity:'',status:'Completed',happened_on:''};

/** Admin-only tools for the Communication module: CSV import and single record. */
export default function CommAdmin({onSaved,onError}:{onSaved:(n:number)=>void;onError:(m:string)=>void}){
  const[form,setForm]=useState(blank);
  const[open,setOpen]=useState(false);
  const[busy,setBusy]=useState(false);
  const file=useRef<HTMLInputElement>(null);
  // The header this sits in has a backdrop blur, which would trap a fixed-position
  // child inside it — so the dialog is portalled to <body>.
  const[mounted,setMounted]=useState(false);
  useEffect(()=>{setMounted(true)},[]);

  async function send(rows:Partial<CommRow>[]){
    setBusy(true);
    try{
      const res=await fetch('/api/communications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows})});
      const body=await res.json().catch(()=>null);
      if(!res.ok||!body?.ok){onError(body?.reason??'Could not save the records.');return}
      onSaved(body.added??rows.length);setForm(blank);setOpen(false);
    }catch{onError('Could not reach the server.')}finally{setBusy(false)}
  }

  async function onFile(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0];e.target.value='';
    if(!f)return;
    const rows=parseCsv(await f.text());
    if(!rows.length){onError('No rows found in that file.');return}
    send(rows);
  }

  return <>
    <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={onFile}/>
    <button className="ghost" disabled={busy} onClick={()=>file.current?.click()}><Upload/>Upload CSV</button>
    <button className="primary" disabled={busy} onClick={()=>setOpen(true)}><Plus/>Add record</button>
    {open&&mounted&&createPortal(<div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Add communication record" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <div className="modal">
        <header><h3>Add communication</h3><button aria-label="Close" onClick={()=>setOpen(false)}><X/></button></header>
        <div className="modal-body">
          <label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
          <label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Radio Simba · morning slot"/></label>
          <label>District<input value={form.district} onChange={e=>setForm({...form,district:e.target.value})} placeholder="Kapchorwa"/></label>
          <label>Quantity<input value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="48 spots"/></label>
          <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['Completed','Active','In progress','Scheduled','Review'].map(t=><option key={t}>{t}</option>)}</select></label>
          <label>Date<input type="date" value={form.happened_on} onChange={e=>setForm({...form,happened_on:e.target.value})}/></label>
        </div>
        <footer>
          <button className="ghost" onClick={()=>setOpen(false)}>Cancel</button>
          <button className="primary" disabled={busy||!form.title.trim()} onClick={()=>send([form])}>Save record</button>
        </footer>
      </div>
    </div>,document.body)}
  </>;
}
