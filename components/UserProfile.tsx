'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Bell, Check, Eye, EyeOff, KeyRound, Lock, Mail, MapPin, Phone, ShieldCheck, UserCircle, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import '../app/profile-settings/profile-settings.css';
import '../app/profile/profile.css';

const initial={name:'Kenneth Owori',email:'kenneth@trustandtrade.org',phone:'+256 772 000 000',location:'Kampala, Uganda',role:'Administrator',organization:'Trust&Trade pilot',bio:'Coordinates farmer onboarding and traceability for the pilot program.'};
const PROFILE_ID='me';
const COLS='name,email,phone,location,role,organization,bio';

export default function UserProfile({embedded=false}:{embedded?:boolean}){
  const [profile,setProfile]=useState(initial); const [form,setForm]=useState(initial); const [saved,setSaved]=useState(false);
  const [sec,setSec]=useState({email:'',currentPassword:'',newPassword:'',confirm:''}); const [secError,setSecError]=useState(''); const [secSaved,setSecSaved]=useState(false); const [secBusy,setSecBusy]=useState(false); const [showPw,setShowPw]=useState(false);
  const initials=profile.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  useEffect(()=>{if(!supabase)return;let alive=true;(async()=>{const{data}=await supabase!.from('user_profiles').select(COLS).eq('id',PROFILE_ID).maybeSingle();if(alive&&data){setProfile(data as typeof initial);setForm(data as typeof initial)}})();return()=>{alive=false}},[]);
  useEffect(()=>{let alive=true;(async()=>{try{const res=await fetch('/api/account');const d=await res.json();if(alive&&d.email)setSec(s=>({...s,email:d.email}))}catch{/* offline */}})();return()=>{alive=false}},[]);
  async function submit(e:FormEvent){e.preventDefault();setProfile(form);setSaved(true);setTimeout(()=>setSaved(false),1800);if(supabase)await supabase.from('user_profiles').upsert({id:PROFILE_ID,...form}).then(({error})=>{if(error)console.error('Profile save failed:',error.message)})}
  async function submitSecurity(e:FormEvent){e.preventDefault();setSecError('');if(!sec.currentPassword)return setSecError('Enter your current password to save changes.');if(sec.newPassword||sec.confirm){if(sec.newPassword.length<8)return setSecError('New password must be at least 8 characters.');if(sec.newPassword!==sec.confirm)return setSecError('New passwords do not match.')}setSecBusy(true);try{const res=await fetch('/api/account',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:sec.currentPassword,email:sec.email,newPassword:sec.newPassword||undefined})});const d=await res.json();if(!d.ok)return setSecError(d.reason||'Could not save changes.');setSec(s=>({email:d.email??s.email,currentPassword:'',newPassword:'',confirm:''}));setSecSaved(true);setTimeout(()=>setSecSaved(false),1800)}catch{setSecError('Could not reach the server. Try again.')}finally{setSecBusy(false)}}
  const field=(k:keyof typeof initial)=>({value:form[k],onChange:(e:{target:{value:string}})=>setForm({...form,[k]:e.target.value})});
  const body=<><div className="profile-page">
      <div className="profile-heading"><div><span>MY ACCOUNT</span><h1>User profile</h1><p>View and update your personal information.</p></div></div>
      {saved&&<div className="toast"><Check/>Profile updated</div>}
      <section className="identity-card"><div className="identity-avatar">{initials}</div><div><h2>{profile.name}</h2><p>{profile.email}</p><span>{profile.role}</span></div></section>
      <div className="profile-grid">
        <section className="user-section"><h2>About</h2><ul className="profile-facts"><li><Mail/>{profile.email}</li><li><Phone/>{profile.phone}</li><li><MapPin/>{profile.location}</li><li><ShieldCheck/>{profile.role} · {profile.organization}</li><li><Bell/>Email notifications on</li></ul><p className="profile-bio">{profile.bio}</p></section>
        <form className="user-section profile-form" onSubmit={submit}><h2>Edit details</h2>
          <div className="form-row"><label>Full name<input required {...field('name')}/></label><label>Email<input required type="email" {...field('email')}/></label></div>
          <div className="form-row"><label>Phone<input {...field('phone')}/></label><label>Location<input {...field('location')}/></label></div>
          <label>Bio<textarea rows={3} {...field('bio')}/></label>
          <div className="modal-actions"><button type="button" onClick={()=>setForm(profile)}>Reset</button><button className="save" type="submit">Save profile</button></div>
        </form>
      </div>
      <form className="user-section profile-form security-section" onSubmit={submitSecurity}>
        <div className="section-top"><div><span className="sec-eyebrow"><Lock/>SIGN-IN &amp; SECURITY</span><h2>Login email &amp; password</h2><p>Change the email and password you use to sign in to the dashboard.</p></div></div>
        <label>Sign-in email<div className="email-input"><Mail/><input required type="email" value={sec.email} onChange={e=>setSec({...sec,email:e.target.value})} placeholder="name@organization.org"/></div></label>
        <div className="form-row">
          <label>New password<div className="pw-input"><input type={showPw?'text':'password'} autoComplete="new-password" value={sec.newPassword} onChange={e=>setSec({...sec,newPassword:e.target.value})} placeholder="Leave blank to keep current"/><button type="button" onClick={()=>setShowPw(v=>!v)} aria-label={showPw?'Hide password':'Show password'}>{showPw?<EyeOff/>:<Eye/>}</button></div></label>
          <label>Confirm new password<input type={showPw?'text':'password'} autoComplete="new-password" value={sec.confirm} onChange={e=>setSec({...sec,confirm:e.target.value})}/></label>
        </div>
        <label>Current password <em className="req">required to save</em><div className="pw-input"><input required type={showPw?'text':'password'} autoComplete="current-password" value={sec.currentPassword} onChange={e=>setSec({...sec,currentPassword:e.target.value})} placeholder="Enter your current password"/></div></label>
        {secError&&<p className="form-error">{secError}</p>}
        <div className="modal-actions"><button className="save" type="submit" disabled={secBusy}><KeyRound/>{secBusy?'Saving…':'Update credentials'}</button></div>
      </form>
    </div>
    {secSaved&&<div className="toast"><Check/>Sign-in details updated</div>}
  </>;
  if(embedded)return body;
  return <main className="profile-app">
    <aside className="profile-side"><a className="profile-brand" href="/"><img src="/farmerlink.svg" alt="FarmerLink"/></a><a className="back" href="/"><ArrowLeft/>Back to dashboard</a><p>SETTINGS</p><nav><a href="/settings/users"><button><Users/>User management</button></a><button className="selected"><UserCircle/>User profile</button></nav><footer><i>{initials}</i><div><b>{profile.name}</b><small>{profile.role}</small></div></footer></aside>
    <section className="profile-content">{body}</section></main>
}
