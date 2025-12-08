import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- FIREBASE CONFIG (Hardcoded for your ease) ---
const config = {
    apiKey: "AIzaSyChkSQg-wBbNSOsm3iDn4UxPMACe8lfMj0",
    authDomain: "elgreensyde-ef4f0.firebaseapp.com",
    projectId: "elgreensyde-ef4f0",
    storageBucket: "elgreensyde-ef4f0.firebasestorage.app",
    messagingSenderId: "92942793442",
    appId: "1:92942793442:web:77f4a3a0c9d391c4b7bcbb",
    measurementId: "G-QSGLWJPS6N"
};

const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);
let currentUser = null;

// --- GLOBAL VARIABLES ---
window.appData = { inventory: [], finance: [], transactions: [] };
window.isOffline = false;
let orderQueue = [];
let currentCart = [];
let currentReceiptId = null;

// --- AUTH LOGIC ---
window.cloudLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch(e) { alert("Login failed: " + e.message); console.error(e); }
};

window.cloudLogout = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, (user) => {
    const dot = document.getElementById('cloud-indicator');
    if(user) {
        currentUser = user;
        if(dot) { dot.classList.remove('bg-gray-400'); dot.classList.add('bg-green-500'); }
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('cloud-login-view').classList.add('hidden');
        document.getElementById('cloud-user-view').classList.remove('hidden');
        document.getElementById('user-email').innerText = user.email;

        // HOT SYNC (Instant Update)
        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if(snap.exists()) {
                window.appData = snap.data();
                window.refreshUI(); 
            }
        });
    } else {
       if(dot) { dot.classList.remove('bg-green-500'); dot.classList.add('bg-gray-400'); }
       if(!window.isOffline) {
           document.getElementById('auth-overlay').classList.remove('hidden');
           document.getElementById('main-app').classList.add('hidden');
       }
       document.getElementById('cloud-login-view').classList.remove('hidden');
       document.getElementById('cloud-user-view').classList.add('hidden');
    }
});

// Save (Local + Cloud)
window.saveData = (d) => {
    window.appData = d;
    localStorage.setItem('eg_offline_data', JSON.stringify(d));
    if(currentUser) {
        setDoc(doc(db, "users", currentUser.uid), window.appData).catch(console.error);
    }
    window.refreshUI();
    showToast();
};

function getData() { return window.appData; }
function showToast(m="Saved") { 
    const t=document.getElementById('toast'); 
    t.innerText=m; 
    t.style.display='block'; 
    setTimeout(()=>t.style.display='none',2000); 
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const local = localStorage.getItem('eg_offline_data');
    if(local) window.appData = JSON.parse(local);
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
    fetchWeather();
    
    // Daily Verse
    const verses = ["Genesis 2:15 - Keep the garden.", "Isaiah 58:11 - Like a watered garden.", "Psalm 1:3 - Like a tree planted by water."];
    document.getElementById('daily-verse').innerText = "\"" + verses[Math.floor(Math.random() * verses.length)] + "\"";
});

window.enableOfflineMode = function() {
    window.isOffline = true;
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    window.refreshUI();
};

// --- CORE UI REFRESH ---
window.refreshUI = function() {
    const d = getData();
    const rev = (d.transactions||[]).reduce((a,b)=>a+b.total,0);
    const exp = (d.finance||[]).reduce((a,b)=>a+b.amount,0);
    
    document.getElementById('dash-rev').innerText = rev.toLocaleString();
    document.getElementById('dash-exp').innerText = exp.toLocaleString();
    document.getElementById('dash-net').innerText = (rev-exp).toLocaleString();
    
    renderInventory();
    renderFinance();
    renderSalesLog();
    renderBestSellers();
    initPOS();
};

// --- UI HELPERS ---
window.nav = function(id) {
    document.querySelectorAll('.view-section').forEach(e => e.classList.add('hidden'));
    document.getElementById('view-'+id).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-'+id).classList.add('active');
    if(id==='sales') initPOS();
};

window.finNav = function(id) {
    document.querySelectorAll('.fin-view').forEach(e => e.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.fin-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-'+id).classList.add('active');
};

window.openModal = function(id, add) { 
    document.getElementById(id).classList.remove('hidden');
    if(add && id === 'modal-add-item') {
        document.getElementById('edit-id').value = '';
        document.getElementById('new-name').value = '';
        document.getElementById('new-price').value = '';
        document.getElementById('new-stock').value = '';
        document.getElementById('new-cost').value = '';
    }
};
window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); };
window.openCloudModal = function() { document.getElementById('cloud-modal').classList.remove('hidden'); };


// --- FEATURES ---

// 1. Weather (Fixed API)
function fetchWeather() {
    // Current=temperature_2m is the modern API call for Open-Meteo
    fetch('https://api.open-meteo.com/v1/forecast?latitude=7.9066&longitude=125.0945&current=temperature_2m,weather_code&daily=precipitation_probability_max&timezone=auto')
    .then(r=>r.json())
    .then(d=>{
        if(d.current){
            document.getElementById('w-temp').innerText = Math.round(d.current.temperature_2m) + "°C";
            document.getElementById('w-desc').innerText = "Live Update";
            if(d.daily) document.getElementById('w-rain').innerText = d.daily.precipitation_probability_max[0] + "%";
        }
    }).catch(()=>{ document.getElementById('w-desc').innerText = "Offline"; });
}

// 2. Inventory
function renderInventory() {
    const d = getData();
    const f = document.getElementById('inv-filter').value;
    const list = f === 'All' ? d.inventory : d.inventory.filter(i => i.cat === f);
    
    document.getElementById('inventory-list').innerHTML = (list||[]).map(i => {
        let badge = '';
        if(i.status === 'Sowing') badge = '<span class="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold ml-2">GROWING</span>';
        else if(i.stock <= 0) badge = '<span class="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold ml-2">SOLD</span>';
        
        return `
        <div class="bg-white dark:bg-secondary-800 p-5 rounded-3xl shadow-sm border border-secondary-100 dark:border-secondary-700 relative group hover:-translate-y-1 transition">
            <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onclick="window.editItem(${i.id})" class="text-gray-400 hover:text-blue-500"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.deleteItem(${i.id})" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="flex items-center mb-2"><span class="text-[10px] font-extrabold uppercase text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">${i.cat}</span>${badge}</div>
            <h3 class="font-bold text-lg dark:text-white mb-3">${i.name}</h3>
            <div class="flex justify-between items-end">
                <span class="text-2xl font-bold dark:text-white">${i.stock}</span>
                <span class="font-mono text-secondary-500 font-bold">₱${i.price}</span>
            </div>
        </div>`;
    }).join('');
}

window.saveItem = function() {
    const idVal = document.getElementById('edit-id').value;
    const id = idVal ? parseInt(idVal) : Date.now();
    const item = {
        id,
        name: document.getElementById('new-name').value,
        cat: document.getElementById('new-cat').value,
        price: parseFloat(document.getElementById('new-price').value)||0,
        stock: parseFloat(document.getElementById('new-stock').value)||0,
        status: document.getElementById('new-status').value,
        cost: parseFloat(document.getElementById('new-cost').value)||0,
        last: new Date().toLocaleDateString()
    };
    const d = getData();
    const idx = d.inventory.findIndex(x=>x.id==id);
    if(idx !== -1) d.inventory[idx]=item; else d.inventory.push(item);
    window.saveData(d); window.closeModal('modal-add-item');
};

window.editItem = function(id) {
    const i=getData().inventory.find(x=>x.id==id); if(!i)return;
    document.getElementById('edit-id').value=i.id;
    document.getElementById('new-name').value=i.name;
    document.getElementById('new-price').value=i.price;
    document.getElementById('new-stock').value=i.stock;
    document.getElementById('new-cost').value=i.cost||'';
    document.getElementById('new-cat').value=i.cat;
    document.getElementById('new-status').value=i.status;
    window.openModal('modal-add-item');
};

window.deleteItem = function(id) {
    if(confirm('Delete?')){ const d=getData(); d.inventory=d.inventory.filter(x=>x.id!=id); window.saveData(d); }
};

// 3. Finance
window.addExpense = function() {
    const desc = document.getElementById('fin-desc').value;
    const amt = parseFloat(document.getElementById('fin-amt').value);
    if(!desc || !amt) return;
    const d = getData();
    d.finance.push({id:Date.now(), date:new Date().toLocaleDateString(), desc, amount:amt});
    window.saveData(d);
    document.getElementById('fin-desc').value = '';
    document.getElementById('fin-amt').value = '';
};

function renderFinance() {
    document.getElementById('ledger-table').innerHTML = (getData().finance||[]).slice().reverse().map(f=>`
        <tr class="border-b dark:border-secondary-700">
            <td class="p-3"><input type="checkbox" class="fin-check accent-primary-600" value="${f.id}"></td>
            <td class="p-3 text-xs text-secondary-500">${f.date}</td>
            <td class="p-3 font-bold text-secondary-800 dark:text-white">${f.desc}</td>
            <td class="p-3 text-right font-mono text-red-500">-₱${f.amount.toFixed(2)}</td>
        </tr>
    `).join('');
}

window.deleteSelectedFinance = function() {
    const checks = document.querySelectorAll('.fin-check:checked');
    if(!checks.length || !confirm("Delete selected?")) return;
    const ids = Array.from(checks).map(c=>parseInt(c.value));
    const d = getData();
    d.finance = d.finance.filter(f => !ids.includes(f.id));
    window.saveData(d);
};

window.deleteAllFinance = function() {
    if(confirm("DELETE ALL HISTORY?")) {
        const d = getData();
        d.finance = [];
        window.saveData(d);
    }
};

// 4. Sales Log & Receipt
function renderSalesLog() {
    document.getElementById('sales-table').innerHTML = (getData().transactions||[]).slice().reverse().map(t=>`
        <tr class="border-b dark:border-secondary-700">
            <td class="p-3 text-xs text-secondary-500">#${t.id}</td>
            <td class="p-3 text-sm">${t.date}</td>
            <td class="p-3 font-bold">${t.customer}</td>
            <td class="p-3 text-right font-mono text-primary-600">₱${t.total}</td>
            <td class="p-3 text-center flex justify-center gap-2">
                <button onclick="window.viewReceipt(${t.id})" class="text-xs bg-secondary-100 px-2 py-1 rounded font-bold hover:bg-secondary-200">View</button>
                <button onclick="window.deleteTransaction(${t.id})" class="text-xs text-red-400 hover:text-red-600"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.deleteTransaction = function(id) {
    if(!confirm("Delete this record?")) return;
    const d = getData();
    d.transactions = d.transactions.filter(t => t.id !== id);
    window.saveData(d);
};

window.viewReceipt = function(id) {
    const t = getData().transactions.find(x => x.id === id); if(!t) return;
    currentReceiptId = id;
    let html = `
    <div style="font-family:'Courier Prime'; color:black;">
        <p class="border-b border-dashed border-black pb-2 mb-2 font-bold">ID: #${t.id}</p>
        <p class="text-xs mb-2">Date: ${t.date} <span class="float-right">${t.customer}</span></p>
    `;
    t.items.forEach(i => { 
        html += `<div class="flex justify-between text-xs mb-1"><span>${i.qty} x ${i.name}</span><span>${i.price}</span></div>`; 
    });
    html += `<div class="border-top border-dashed border-black pt-2 mt-2 flex justify-between font-bold text-lg"><span>Total</span><span>₱${t.total}</span></div></div>`;
    
    document.getElementById('receipt-content').innerHTML = html;
    window.openModal('modal-receipt');
};

window.printCurrentReceipt = function() {
    if(!currentReceiptId) return;
    const t = getData().transactions.find(x => x.id === currentReceiptId);
    const quotes = ["Thank you for growing with us!", "Plant happiness!", "Keep growing!", "Support local!", "Nature in your hands."];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    const printArea = document.getElementById('batch-print-area');
    printArea.innerHTML = `
        <div style="font-family:'Courier Prime'; text-align:center; padding:10px; width:80mm; margin:0 auto;">
            <h2 style="margin:0; font-size:16px; font-weight:bold;">ELGREENSYDE</h2>
            <p style="font-size:10px; margin:0;">VALENCIA CITY, BUKIDNON</p>
            <p style="font-size:10px; margin:0 0 10px 0;">0991 417 2982</p>
            <div style="text-align:left; border-top:1px dashed black; padding-top:5px;">
                <p style="margin:2px 0; font-size:12px;">ID: #${t.id}</p>
                <p style="margin:2px 0; font-size:12px;">Date: ${t.date}</p>
                <p style="margin:2px 0; font-size:12px;">Cust: ${t.customer}</p>
            </div>
            <div style="border-top:1px dashed black; padding:5px 0; margin-top:5px;">
                ${t.items.map(i => `<div style="display:flex; justify-content:space-between; font-size:12px;"><span>${i.qty} x ${i.name}</span><span>${i.price}</span></div>`).join('')}
            </div>
            <div style="border-top:1px dashed black; padding-top:5px; margin-top:5px; display:flex; justify-content:space-between; font-weight:bold; font-size:14px;">
                <span>TOTAL</span><span>₱${t.total}</span>
            </div>
            <div style="margin-top:15px; font-size:10px; font-style:italic;">
                "${randomQuote}"
            </div>
        </div>
    `;
    setTimeout(() => window.print(), 300);
};

// 5. Best Sellers
function renderBestSellers() {
    const sales = {};
    (getData().transactions||[]).forEach(t => { t.items.forEach(i => { sales[i.name] = (sales[i.name] || 0) + (i.qty || 1); }); });
    const sorted = Object.entries(sales).sort((a,b)=>b[1]-a[1]).slice(0,5);
    document.getElementById('best-sellers-list').innerHTML = sorted.length ? sorted.map((s, i) => `
        <div class="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-900 rounded-xl">
            <div class="flex items-center gap-3"><span class="w-6 h-6 bg-primary-100 text-primary-700 text-xs font-bold rounded flex items-center justify-center">${i+1}</span><span class="font-bold text-sm">${s[0]}</span></div>
            <span class="text-xs font-bold text-secondary-400">${s[1]} sold</span>
        </div>
    `).join('') : '<p class="text-sm text-secondary-400">No sales yet.</p>';
}

// 6. POS Logic
function initPOS() {
    const inv = getData().inventory.filter(i=>i.stock>0 && i.status==='Ready');
    document.getElementById('pos-item').innerHTML = inv.map(i=>`<option value="${i.id}">${i.name} (₱${i.price})</option>`).join('');
}
window.addToCart = function() {
    const id=parseInt(document.getElementById('pos-item').value);
    const item=getData().inventory.find(x=>x.id==id);
    const qty=parseInt(document.getElementById('pos-qty').value)||1;
    if(item) { currentCart.push({id:item.id, name:item.name, price:item.price, qty}); renderCart(); }
};
window.addShipping = function() {
    const fee=parseFloat(document.getElementById('pos-ship-fee').value);
    if(fee){currentCart.push({id:'SHIP', name:'Shipping', price:fee, qty:1}); renderCart();}
};
function renderCart() {
    const total = currentCart.reduce((a,b)=>a+(b.price*(b.qty||1)),0);
    document.getElementById('cart-total').innerText = total.toFixed(2);
    document.getElementById('cart-table').innerHTML = currentCart.map((i,x)=>`<tr><td class="py-2 text-xs">${i.name}</td><td class="text-right">₱${i.price}</td><td class="text-right"><button onclick="currentCart.splice(${x},1);renderCart()" class="text-red-500">x</button></td></tr>`).join('');
    window.updatePosPreview();
}
window.checkout = function() {
    if(!currentCart.length || !confirm("Confirm?")) return;
    const d = getData();
    const total = currentCart.reduce((a,b)=>a+(b.price*(b.qty||1)),0);
    currentCart.forEach(c => { if(typeof c.id==='number'){ const i=d.inventory.find(x=>x.id==c.id); if(i) i.stock-=c.qty; } });
    d.transactions.push({id:Date.now(), date:new Date().toLocaleDateString(), customer:document.getElementById('pos-cust').value||'Guest', total, items:currentCart});
    window.saveData(d); currentCart=[]; renderCart(); alert("Saved");
};
window.undoLastSale = function() {
    const d=getData(); 
    if(d.transactions.length && confirm('Undo last?')) { 
        const l=d.transactions.pop(); 
        l.items.forEach(i=>{if(typeof i.id==='number'){const p=d.inventory.find(x=>x.id==i.id); if(p) p.stock+=i.qty;}}); 
        window.saveData(d); 
        showToast("Undone"); 
    } 
};
window.updatePosPreview = function() {
    const s=document.getElementById('pos-item');
    if(!s.value) return;
    const i=getData().inventory.find(x=>x.id==s.value);
    if(i) document.getElementById('pos-profit-preview').innerText = `Profit: ₱${(i.price - (i.cost||0)).toFixed(2)}`;
};
window.queueOrder = function() { 
    const c=document.getElementById('pos-cust').value||"Guest"; 
    const t=currentCart.reduce((a,b)=>a+(b.price*(b.qty||1)),0); 
    orderQueue.push({customer:c, total:t, items:JSON.parse(JSON.stringify(currentCart))}); 
    currentCart=[]; renderCart(); renderQueue(); showToast("Queued"); 
};
function renderQueue() { 
    document.getElementById('order-queue-list').innerHTML = orderQueue.map((o,i)=>`<div class="bg-secondary-50 p-2 rounded mb-1 flex justify-between"><div><b>${o.customer}</b><br><span class="text-xs">₱${o.total}</span></div><button onclick="orderQueue.splice(${i},1);renderQueue()" class="text-red-500">x</button></div>`).join(''); 
}
window.printBatch = function() { window.print(); };

// 7. Poster Generator
window.openPosterModal = function() {
    document.getElementById('modal-poster').classList.remove('hidden');
    window.generatePoster();
};
window.generatePoster = function() {
    const d = getData();
    const items = d.inventory.sort((a,b)=>b.stock-a.stock);
    const cats = [...new Set(items.map(i=>i.cat))];
    const showPrice = document.getElementById('poster-show-price').checked;
    const showSold = document.getElementById('poster-show-sold').checked;
    
    const quotes = ["Thank you for growing with us!", "Plant happiness!", "Keep growing!", "Support local!", "Nature in your hands."];
    document.getElementById('poster-footer-random').innerText = quotes[Math.floor(Math.random()*quotes.length)];

    let html = "";
    let hasGrowing = false;
    cats.forEach(cat => {
        const catItems = items.filter(i=>i.cat===cat);
        if(catItems.length){
            html += `<div style="font-weight:bold; border-bottom:1px dashed #000; margin-top:15px; font-family:'Courier Prime';">${cat.toUpperCase()}</div><table style="width:100%; font-family:'Courier Prime'; font-size:12px; margin-top:5px;">`;
            catItems.forEach(i => {
                if(!showSold && i.stock<=0 && i.status !== 'Sowing') return;
                let price = `₱${i.price}`;
                if(i.stock<=0) price = "SOLD OUT";
                if(i.status === 'Sowing') { price = "GROWING"; hasGrowing = true; }
                if(!showPrice && price.includes('₱')) price = "DM";
                html += `<tr><td style="padding:2px 0;">${i.name}</td><td style="text-align:right;">${price}</td></tr>`;
            });
            html += `</table>`;
        }
    });
    document.getElementById('poster-items').innerHTML = html;
    document.getElementById('poster-date').innerText = "Date: " + new Date().toLocaleDateString();
    
    const footnote = document.getElementById('poster-footer-note');
    if(hasGrowing) {
        footnote.style.display = 'block';
        footnote.innerText = "* GROWING items are in early stages.";
    } else {
        footnote.style.display = 'none';
    }
};
window.downloadPoster = function(type) {
    const node = document.getElementById('poster-node');
    html2canvas(node, {scale:3}).then(c => {
        const img = c.toDataURL('image/png');
        if(type === 'png') { const a = document.createElement('a'); a.download = 'Menu.png'; a.href = img; a.click(); }
        else { const pdf = new window.jspdf.jsPDF({unit:'mm',format:[105, 148]}); pdf.addImage(img, 'PNG', 0, 0, 105, 148); pdf.save('Menu.pdf'); }
    });
};

// Utils
window.exportBackup = function() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(getData())], {type:'application/json'}));
    a.download = `Backup_${Date.now()}.json`;
    a.click();
};