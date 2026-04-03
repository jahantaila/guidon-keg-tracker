import { useState, useEffect } from 'react'
import './App.css'

const KEG_SIZES = ['1/2bbl', '1/4bbl', '1/6bbl']
const STORAGE_KEY = 'guidon_keg_data'

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { customers: [], invoices: [] }
  } catch { return { customers: [], invoices: [] } }
}
function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

function getTallies(invoices, custId) {
  const t = {}; KEG_SIZES.forEach(s => t[s] = 0)
  invoices.filter(i => i.customerId === custId).forEach(inv =>
    inv.items.forEach(item => {
      if (item.type === 'deposit') t[item.size] = (t[item.size]||0) + item.qty
      if (item.type === 'return') t[item.size] = (t[item.size]||0) - item.qty
    })
  )
  return t
}

function CustomerForm({ onAdd }) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  return (
    <div className="card">
      <h3>Add Customer</h3>
      <input placeholder="Customer name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Contact info" value={contact} onChange={e => setContact(e.target.value)} />
      <button onClick={() => { if(name.trim()) { onAdd({id:genId(),name:name.trim(),contact:contact.trim()}); setName(''); setContact('') }}}>Add Customer</button>
    </div>
  )
}

function InvoiceForm({ customers, onAdd }) {
  const [custId, setCustId] = useState('')
  const [items, setItems] = useState([])
  const [size, setSize] = useState(KEG_SIZES[0])
  const [type, setType] = useState('deposit')
  const [qty, setQty] = useState(1)
  const addItem = () => { if(qty>0) setItems([...items, {size, type, qty:parseInt(qty)}]) }
  const submit = () => {
    if(!custId || !items.length) return
    onAdd({id:genId(), customerId:custId, date:new Date().toISOString().slice(0,10), items})
    setItems([])
  }
  return (
    <div className="card">
      <h3>Create Invoice</h3>
      <select value={custId} onChange={e => setCustId(e.target.value)}>
        <option value="">Select customer</option>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="row">
        <select value={size} onChange={e => setSize(e.target.value)}>
          {KEG_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="deposit">Keg Deposit</option>
          <option value="return">Keg Return</option>
        </select>
        <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} style={{width:60}} />
        <button onClick={addItem}>+ Add Line</button>
      </div>
      {items.length > 0 && (
        <table className="mini-table">
          <thead><tr><th>Size</th><th>Type</th><th>Qty</th><th></th></tr></thead>
          <tbody>{items.map((it,i) => (
            <tr key={i}><td>{it.size}</td><td>{it.type}</td><td>{it.qty}</td>
            <td><button className="btn-sm" onClick={() => setItems(items.filter((_,j) => j!==i))}>x</button></td></tr>
          ))}</tbody>
        </table>
      )}
      <button className="btn-primary" onClick={submit} disabled={!custId||!items.length}>Create Invoice</button>
    </div>
  )
}

function KegReport({ customers, invoices }) {
  if(!customers.length) return <div className="card"><h3>Keg Inventory Report</h3><p>Add customers and create invoices to see the report.</p></div>
  return (
    <div className="card">
      <h3>Keg Inventory Report</h3>
      <table>
        <thead><tr><th>Customer</th>{KEG_SIZES.map(s => <th key={s}>{s}</th>)}<th>Total</th></tr></thead>
        <tbody>{customers.map(c => {
          const t = getTallies(invoices, c.id)
          const total = Object.values(t).reduce((a,b) => a+b, 0)
          return <tr key={c.id}><td>{c.name}</td>{KEG_SIZES.map(s => <td key={s} className={t[s]>0?'positive':t[s]<0?'negative':''}>{t[s]}</td>)}<td className="total">{total}</td></tr>
        })}</tbody>
      </table>
    </div>
  )
}

function InvoiceHistory({ invoices, customers }) {
  if(!invoices.length) return null
  const getName = id => customers.find(c => c.id === id)?.name || 'Unknown'
  return (
    <div className="card">
      <h3>Invoice History</h3>
      <table>
        <thead><tr><th>Date</th><th>Customer</th><th>Items</th></tr></thead>
        <tbody>{[...invoices].reverse().map(inv => (
          <tr key={inv.id}><td>{inv.date}</td><td>{getName(inv.customerId)}</td>
          <td>{inv.items.map((it,i) => <span key={i} className={`tag ${it.type}`}>{it.qty}x {it.size} {it.type}</span>)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(loadData)
  const [tab, setTab] = useState('dashboard')
  useEffect(() => { saveData(data) }, [data])
  const addCustomer = c => setData(d => ({...d, customers:[...d.customers, c]}))
  const addInvoice = inv => setData(d => ({...d, invoices:[...d.invoices, inv]}))
  return (
    <div className="app">
      <header><h1>🍺 Guidon Brewing - Keg Tracker</h1><p className="subtitle">Wholesale Keg Management System</p></header>
      <nav>
        {['dashboard','invoice','customers','history'].map(t => (
          <button key={t} className={tab===t?'active':''} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </nav>
      <main>
        {tab==='dashboard' && <KegReport customers={data.customers} invoices={data.invoices} />}
        {tab==='invoice' && <InvoiceForm customers={data.customers} onAdd={addInvoice} />}
        {tab==='customers' && <><CustomerForm onAdd={addCustomer} />
          <div className="card"><h3>Customer List</h3>
            {!data.customers.length ? <p>No customers yet.</p> :
              <ul>{data.customers.map(c => <li key={c.id}><strong>{c.name}</strong> {c.contact && `- ${c.contact}`}</li>)}</ul>}
          </div></>}
        {tab==='history' && <InvoiceHistory invoices={data.invoices} customers={data.customers} />}
      </main>
    </div>
  )
}
