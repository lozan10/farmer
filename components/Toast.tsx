'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {CheckCircle2,AlertTriangle,ChevronDown,X} from 'lucide-react';

export type ToastMsg={id:number;title:string;kind?:'ok'|'error'};

/**
 * Auto-dismissing notification: counts down, pauses on click, collapses to the
 * title. Styled inline on purpose — it must look the same no matter what the
 * page stylesheet does around it.
 */
const S:Record<string,CSSProperties>={
  card:{position:'fixed',right:20,bottom:20,zIndex:60,width:330,maxWidth:'calc(100vw - 32px)',background:'#fff',border:'1px solid #dedde9',borderRadius:14,boxShadow:'0 12px 34px #1a1b2320',overflow:'hidden',fontFamily:'inherit',color:'#1a1b23'},
  row:{display:'flex',alignItems:'center',gap:10,padding:'13px 12px 9px 14px'},
  title:{flex:1,fontSize:13,fontWeight:700,lineHeight:'18px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  btn:{border:0,background:'transparent',color:'#8a8c9a',cursor:'pointer',padding:3,borderRadius:7,display:'flex',flex:'0 0 auto'},
  sub:{margin:0,padding:'0 14px 13px 43px',fontSize:12,lineHeight:'17px',color:'#707281',cursor:'pointer'},
  bar:{display:'block',height:3,background:'#edecf5'},
};

export default function Toast({msg,onClose,seconds=15}:{msg:ToastMsg;onClose:()=>void;seconds?:number}){
  const[left,setLeft]=useState(seconds);
  const[paused,setPaused]=useState(false);
  const[open,setOpen]=useState(true);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{if(paused)return;if(left<=0){closeRef.current();return}
    const t=setTimeout(()=>setLeft(l=>l-1),1000);return()=>clearTimeout(t)},[left,paused]);
  const error=msg.kind==='error';
  const accent=error?'#d3452c':'#159947';
  const Icon=error?AlertTriangle:CheckCircle2;
  return <div style={S.card} role="status">
    <div style={S.row}>
      <Icon style={{width:19,height:19,flex:'0 0 19px',color:accent}}/>
      <b style={S.title}>{msg.title}</b>
      <button style={S.btn} aria-label={open?'Collapse':'Expand'} onClick={()=>setOpen(v=>!v)}>
        <ChevronDown style={{width:16,height:16,transform:open?'none':'rotate(180deg)'}}/>
      </button>
      <button style={S.btn} aria-label="Dismiss" onClick={onClose}><X style={{width:16,height:16}}/></button>
    </div>
    {open&&<p style={S.sub} onClick={()=>setPaused(true)}>
      {paused?'Message kept open.':<>This message will close in <b style={{color:'#4d4f5d'}}>{left}</b> seconds. <b style={{color:'#4d4f5d'}}>Click to stop.</b></>}
    </p>}
    {!paused&&<i style={S.bar}><span style={{display:'block',height:'100%',background:accent,width:(left/seconds)*100+'%',transition:'width 1s linear'}}/></i>}
  </div>;
}
