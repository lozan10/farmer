'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, Settings2, ShieldCheck, UserCog, Users } from 'lucide-react';
import Dashboard from '../page';
import './settings-menu.css';

export default function DashboardWithSettings(){
  const [open,setOpen]=useState(false); const menu=useRef<HTMLDivElement>(null);
  useEffect(()=>{const close=(e:MouseEvent)=>{if(menu.current&&!menu.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
  return <><Dashboard/><div className="settings-switcher" ref={menu}>
    {open&&<div className="settings-dropdown" role="menu"><div className="settings-dropdown-head"><small>SETTINGS</small><strong>Workspace controls</strong></div><a href="/profile-settings"><UserCog/>Profile &amp; account</a><a href="/settings/users"><Users/>User management<span>5</span></a><button><ShieldCheck/>Roles &amp; permissions</button><button><Bell/>Notifications</button></div>}
    <button className={open?'settings-trigger is-open':'settings-trigger'} onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-haspopup="menu"><Settings2/><span>Settings</span><ChevronDown/></button>
  </div></>
}
