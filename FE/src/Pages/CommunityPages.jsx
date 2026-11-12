import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const seedStories = [
  { id: 1, name: "Minh Anh", color: "linear-gradient(145deg,#fb7185,#f59e0b)", seen: false },
  { id: 2, name: "Hoàng Nam", color: "linear-gradient(145deg,#60a5fa,#8b5cf6)", seen: false },
  { id: 3, name: "Thu Hà", color: "linear-gradient(145deg,#34d399,#0ea5e9)", seen: true },
];
const people = [
  { id: 1, name: "Nguyễn Minh Anh", bio: "Yêu thích du lịch và nhiếp ảnh", avatar: "MA" },
  { id: 2, name: "Trần Hoàng Nam", bio: "Chia sẻ những điều tích cực mỗi ngày", avatar: "HN" },
  { id: 3, name: "Lê Thu Hà", bio: "Coffee • Books • Music", avatar: "TH" },
];
const storeKey = "miniSocialMessages";

function Shell({ title, subtitle, children }) {
  return <main className="community-page">
    <header className="community-header">
      <div><Link to="/feed" className="community-back">← Bảng tin</Link><h1>{title}</h1><p>{subtitle}</p></div>
      <Link className="community-home" to="/profile">A</Link>
    </header>{children}
  </main>;
}
export function Stories() {
  const [stories, setStories] = useState(seedStories);
  const [active, setActive] = useState(null);
  const [caption, setCaption] = useState("");
  const addStory = () => {
    const text = window.prompt("Nhập nội dung tin của bạn:");
    if (text?.trim()) setStories([{ id: Date.now(), name: "Bạn", color: "linear-gradient(145deg,#2563eb,#a78bfa)", seen: false, text }, ...stories]);
  };
  return <Shell title="Tin" subtitle="Chia sẻ khoảnh khắc và xem tin mới từ bạn bè.">
    <section className="community-panel"><div className="community-panel-title"><h2>Tin của bạn bè</h2><button onClick={addStory}>＋ Tạo tin</button></div>
      <div className="story-grid">{stories.map(s => <button className="story-tile" key={s.id} onClick={() => setActive(s)}><span style={{background:s.color}}>{s.name.slice(0,1)}</span><b>{s.name}</b><small>{s.text || (s.seen ? "Đã xem" : "Tin mới")}</small></button>)}</div>
    </section>
    {active && <div className="community-modal" onClick={() => setActive(null)}><div className="story-view" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setActive(null)}>×</button><div className="story-art" style={{background:active.color}}>{active.text || active.name}</div><b>{active.name}</b><button onClick={() => setActive(null)}>Đóng tin</button></div></div>}
  </Shell>;
}
export function Explore() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => people.filter(p => `${p.name} ${p.bio}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <Shell title="Khám phá" subtitle="Tìm người bạn mới và nội dung thú vị trên MiniSocial.">
    <section className="community-panel"><input className="community-search" placeholder="Tìm kiếm mọi người..." value={query} onChange={e=>setQuery(e.target.value)}/><div className="people-grid">{results.map(p=><article className="person-card" key={p.id}><div className="person-avatar">{p.avatar}</div><h3>{p.name}</h3><p>{p.bio}</p><button onClick={()=>alert("Đã gửi lời mời kết bạn (demo).")}>＋ Kết bạn</button></article>)}</div>{!results.length && <p className="community-empty">Không tìm thấy kết quả phù hợp.</p>}</section>
  </Shell>;
}
export function Messages() {
  const [messages, setMessages] = useState(()=>{try{return JSON.parse(localStorage.getItem(storeKey))||[]}catch{return []}});
  const [selected, setSelected] = useState("Nguyễn Minh Anh");
  const [draft, setDraft] = useState("");
  const send = e => {e.preventDefault(); if(!draft.trim())return; const next=[...messages,{id:Date.now(),name:selected,text:draft.trim(),mine:true,time:new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}];setMessages(next);localStorage.setItem(storeKey,JSON.stringify(next));setDraft("");};
  return <Shell title="Tin nhắn" subtitle="Trò chuyện và giữ liên lạc với bạn bè.">
    <section className="message-layout"><aside className="message-contacts"><h2>Đoạn chat</h2>{people.map(p=><button className={selected===p.name?"selected":""} key={p.id} onClick={()=>setSelected(p.name)}><span className="person-avatar small">{p.avatar}</span><span><b>{p.name}</b><small>Đang hoạt động</small></span></button>)}</aside>
      <div className="message-conversation"><header><b>{selected}</b><small>Đang hoạt động</small></header><div className="message-list">{messages.filter(m=>m.name===selected).map(m=><div key={m.id} className={`message-bubble ${m.mine?"mine":""}`}>{m.text}<small>{m.time}</small></div>)}{!messages.some(m=>m.name===selected)&&<p className="community-empty">Bắt đầu cuộc trò chuyện với {selected}.</p>}</div><form className="message-compose" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Nhập tin nhắn..." /><button>Gửi</button></form></div>
    </section>
  </Shell>;
}
