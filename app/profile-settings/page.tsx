'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, Bell, Check, CloudSun, Edit3, Leaf, Mail, Plus, Search, ShieldCheck, UserCog, Users, X } from 'lucide-react';
import './profile-settings.css';

type User = { id:number; name:string; email:string; role:string; status:'Active'|'Invited'|'Suspended'; initials:string };
const seed:User[]=[
  {id:1,name:'Kenneth Owori',email:'kenneth@trustandtrade.org',role:'Administrator',status:'Active',initials:'KO'},
  {id:2,name:'Sarah Nakato',email:'sarah.nakato@trustandtrade.org',role:'Farm Manager',status:'Active',initials:'SN'},
  {id:3,name:'David Okello',email:'david.okello@trustandtrade.org',role:'Field Officer',status:'Active',initials:'DO'},
  {id:4,name:'Mercy Achieng',email:'mercy.achieng@trustandtrade.org',role:'Data Analyst',status:'Invited',initials:'MA'},
  {id:5,name:'Ivan Mugisha',email:'ivan.mugisha@trustandtrade.org',role:'Viewer',status:'Suspended',initials:'IM'},
];
const blank={name:'',email:'',role:'Viewer',status:'Active' as const};

export default function ProfileSettings(){
  const [users,setUsers]=useState(seed); const [query,setQuery]=useState(''); const [editing,setEditing]=useState<User|null>(null); const [open,setOpen]=useState(false); const [form,setForm]=useState(blank); const [saved,setSaved]=useState(false);
  const filtered=useMemo(()=>users.filter(u=>(u.name+u.email+u.role).toLowerCase().includes(query.toLowerCase())),[users,query]);
  function startCreate(){setEditing(null);setForm(blank);setOpen(true)}
  function startEdit(u:User){setEditing(u);setForm({name:u.name,email:u.email,role:u.role,status:u.status as 'Active'});setOpen(true)}
  function submit(e:FormEvent){e.preventDefault();const initials=form.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();if(editing)setUsers(v=>v.map(u=>u.id===editing.id?{...u,...form,initials}:u));else setUsers(v=>[{id:Date.now(),...form,initials},...v]);setOpen(false);setSaved(true);setTimeout(()=>setSaved(false),1800)}
  return <main className="profile-app">
    <aside className="profile-side"><a className="profile-brand" href="/"><b><Leaf/></b>Farmer<span>Link</span></a><a className="back" href="/"><ArrowLeft/>Back to dashboard</a><p>SETTINGS</p><nav><button className="selected"><UserCog/>Profile & account</button><button><Users/>User management</button><button><ShieldCheck/>Roles & permissions</button><button><Bell/>Notifications</button></nav><footer><i>KO</i><div><b>Kenneth Owori</b><small>Administrator</small></div></footer></aside>
    <section className="profile-content"><header><label><Search/><input placeholder="Search settings..."/></label><div className="header-cluster"><button className="weather" aria-label="Current weather"><CloudSun/><span>24°C</span></button><button className="notice" aria-label="Notifications"><Bell/><i/></button><button className="profile-chip" aria-label="Open account menu">KO</button></div></header>
      <div className="profile-page"><div className="profile-heading"><div><span>ORGANIZATION SETTINGS</span><h1>Profile & users</h1><p>Manage your personal details, team access, roles and account status.</p></div><button className="add-user" onClick={startCreate}><Plus/>Add user</button></div>
        {saved&&<div className="toast"><Check/>Changes saved successfully</div>}
        <section className="identity-card"><div className="identity-avatar">KO</div><div><h2>Kenneth Owori</h2><p>kenneth@trustandtrade.org</p><span>Administrator</span></div><button onClick={()=>startEdit(users[0])}><Edit3/>Edit profile</button></section>
        <section className="user-section"><div className="section-top"><div><h2>Organization users</h2><p>{users.length} people have access to Trust&amp;Trade pilot</p></div><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search users..."/></label></div>
          <div className="user-table"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last active</th><th></th></tr></thead><tbody>{filtered.map((u,i)=><tr key={u.id}><td><div className="user-cell"><i>{u.initials}</i><div><b>{u.name}</b><span>{u.email}</span></div></div></td><td><span className="role">{u.role}</span></td><td><span className={'user-status '+u.status.toLowerCase()}><i/>{u.status}</span></td><td>{i===0?'Just now':i===1?'12 min ago':i===2?'Yesterday':'—'}</td><td><button onClick={()=>startEdit(u)} aria-label={`Edit ${u.name}`}><Edit3/></button></td></tr>)}</tbody></table>{filtered.length===0&&<div className="empty">No users match your search.</div>}</div>
        </section>
      </div>
    </section>
    {open&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><form className="user-modal" onSubmit={submit}><div className="modal-top"><div><span>{editing?'EDIT USER':'NEW USER'}</span><h2>{editing?'Update team member':'Add a team member'}</h2></div><button type="button" onClick={()=>setOpen(false)}><X/></button></div><label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Grace Namusoke"/></label><label>Email address<div className="email-input"><Mail/><input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@organization.org"/></div></label><div className="form-row"><label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option>Administrator</option><option>Farm Manager</option><option>Field Officer</option><option>Data Analyst</option><option>Viewer</option></select></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as any})}><option>Active</option><option>Invited</option><option>Suspended</option></select></label></div><div className="modal-actions"><button type="button" onClick={()=>setOpen(false)}>Cancel</button><button className="save" type="submit">{editing?'Save changes':'Create user'}</button></div></form></div>}
  </main>
}
