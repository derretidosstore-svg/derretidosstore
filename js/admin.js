const SUPABASE_URL = 'https://yilebxkruckgixmzqxbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbGVieGtydWNrZ2l4bXpxeGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjM2NTUsImV4cCI6MjA4MDc5OTY1NX0.6Q9zFMGtuIUdt5hnsT_FL24Zoptsf9dJuoGNJQMGjek';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) showDashboard(session.user);
    else showLogin();

    supabase.auth.onAuthStateChange((event, session) => {
        if (session) showDashboard(session.user);
        else showLogin();
    });
});

function showLogin() {
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
}

function showDashboard(user) {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('admin-email-display').innerText = user.email;
    fetchAdminProducts();
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');
    const errorMsg = document.getElementById('login-error');

    btn.disabled = true;
    btn.innerText = "Verificando...";
    errorMsg.style.display = 'none';

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorMsg.innerText = "Error: " + error.message;
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.innerText = "Ingresar";
    }
}

async function handleLogout() { await supabase.auth.signOut(); }

function switchAdminTab(tabName) {
    ['products', 'orders', 'config', 'social'].forEach(tab => {
        const content = document.getElementById(`tab-${tab}`);
        const btn = document.getElementById(`btn-tab-${tab}`);
        
        if (content) content.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const content = document.getElementById(`tab-${tabName}`);
    const btn = document.getElementById(`btn-tab-${tabName}`);

    if (content) content.classList.remove('hidden');
    if (btn) btn.classList.add('active');

    if (tabName === 'products') fetchAdminProducts();
    if (tabName === 'orders') loadOrders();
    if (tabName === 'config') loadConfigRenderer(GENERAL_CONFIG, 'config-list');
    if (tabName === 'social') loadConfigRenderer(SOCIAL_CONFIG, 'social-list');
}

window.addImageInput = function(value = '') {
    const container = document.getElementById('image-inputs-container');
    const div = document.createElement('div');
    div.className = 'image-input-group';
    div.innerHTML = `
        <input type="url" name="images_url[]" class="form-control" placeholder="https://..." value="${value}" >
        <button type="button" onclick="this.parentElement.remove()" style="color:red; background:none; font-size:1.2rem;">&times;</button>
    `;
    container.appendChild(div);
}

async function fetchAdminProducts() {
    const tbody = document.getElementById('admin-product-table');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });

    if(error) return console.error(error);
    
    tbody.innerHTML = '';
    data.forEach(p => {
        const mainImage = (p.images && p.images.length > 0) ? p.images[0] : p.image;
        tbody.innerHTML += `
            <tr>
                <td><img src="${mainImage}" class="preview-img-small"></td>
                <td>${p.name}</td>
                <td>$${p.price}</td>
                <td>
                    <button onclick="editProduct(${p.id})" style="color: var(--color-choco); background:none; font-weight:bold; margin-right: 0.5rem;">Editar</button>
                    <button onclick="deleteProduct(${p.id})" style="color:red; background:none;">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function editProduct(id) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) return alert('Error al cargar producto');

    const form = document.getElementById('add-product-form');

    form.product_id.value = data.id;
    form.name.value = data.name;
    form.price.value = data.price;
    form.description.value = data.description;
    form.type.value = data.type;

    const container = document.getElementById('image-inputs-container');
    container.innerHTML = ''; 

    let images = data.images || [];
    if (images.length === 0 && data.image) images = [data.image]; 

    if (images.length > 0) {
        images.forEach(url => window.addImageInput(url));
    } else {
        window.addImageInput(); 
    }

    document.getElementById('form-product-title').innerText = 'Editar Producto: ' + data.name;
    document.getElementById('btn-submit-product').innerText = 'Actualizar Producto';
    document.getElementById('btn-cancel-edit').classList.remove('hidden');

    form.scrollIntoView({ behavior: 'smooth' });
}

window.resetProductForm = function() {
    const form = document.getElementById('add-product-form');
    form.reset();
    form.product_id.value = '';

    const container = document.getElementById('image-inputs-container');
    container.innerHTML = '';
    window.addImageInput();

    document.getElementById('form-product-title').innerText = '+ Nuevo Producto';
    document.getElementById('btn-submit-product').innerText = 'Guardar Producto';
    document.getElementById('btn-cancel-edit').classList.add('hidden');
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const form = e.target;
    const productId = form.product_id.value;

    const imageInputs = document.getElementsByName('images_url[]');
    const imagesArray = [];
    for(let input of imageInputs) {
        if(input.value.trim() !== "") imagesArray.push(input.value.trim());
    }

    const productData = {
        name: form.name.value,
        price: parseInt(form.price.value),
        description: form.description.value,
        type: form.type.value,
        images: imagesArray, 
        image: imagesArray[0]
    };

    let error;

    if (productId) {
        const { error: updateError } = await supabase
            .from('products')
            .update(productData)
            .eq('id', productId);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from('products')
            .insert([productData]);
        error = insertError;
    }

    if (!error) {
        alert(productId ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
        window.resetProductForm();
        fetchAdminProducts();
    } else {
        alert('Error: ' + error.message);
    }
}

async function deleteProduct(id) {
    if(confirm('¿Eliminar producto?')) {
        await supabase.from('products').delete().eq('id', id);
        fetchAdminProducts();
    }
}

async function loadOrders() {
    const tbody = document.getElementById('admin-orders-table');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if(!data) return;
    tbody.innerHTML = '';
    data.forEach(order => {
        tbody.innerHTML += `
            <tr>
                <td>#${order.id}</td>
                <td><strong>${order.customer_name}</strong><br><small>${order.customer_commune}</small></td>
                <td>$${order.total.toLocaleString('es-CL')}</td>
                <td><span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></td>
                <td><select onchange="updateOrderStatus(${order.id}, this.value)"><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option><option value="Completado">Completado</option></select></td>
            </tr>
        `;
    });
}
async function updateOrderStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id); loadOrders();
}

const GENERAL_CONFIG = [
    { title: "Portada Principal", items: [
        { key: 'hero_bg', label: '1. Foto Banner Principal (Hero)' }
    ]},
    { title: "Sección Ventajas", items: [
        { key: 'feature_1', label: '2. Foto Ventaja: Ingredientes' },
        { key: 'feature_2', label: '3. Foto Ventaja: Baño María' },
        { key: 'feature_3', label: '4. Foto Ventaja: Experiencia' }
    ]},
    { title: "Sección Clientes Felices (Fotos)", items: [
        { key: 'testi_1', label: '5. Foto Cliente 1' },
        { key: 'testi_2', label: '6. Foto Cliente 2' },
        { key: 'testi_3', label: '7. Foto Cliente 3' }
    ]}
];

const SOCIAL_CONFIG = [
    { title: "Galería Instagram (3 Fotos)", items: [
        { key: 'insta_1', label: 'Post Instagram 1' },
        { key: 'insta_2', label: 'Post Instagram 2' },
        { key: 'insta_3', label: 'Post Instagram 3' }
    ]},
    { title: "Galería TikTok - Video 1", items: [
        { key: 'tiktok_1', label: '1. Portada (Imagen)' },
        { key: 'tiktok_1_video', label: '1. Video (Enlace MP4)' }
    ]},
    { title: "Galería TikTok - Video 2", items: [
        { key: 'tiktok_2', label: '2. Portada (Imagen)' },
        { key: 'tiktok_2_video', label: '2. Video (Enlace MP4)' }
    ]},
    { title: "Galería TikTok - Video 3", items: [
        { key: 'tiktok_3', label: '3. Portada (Imagen)' },
        { key: 'tiktok_3_video', label: '3. Video (Enlace MP4)' }
    ]}
];

async function loadConfigRenderer(structure, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<p>Cargando configuración...</p>';

    const { data } = await supabase.from('site_config').select('*');
    const dbConfig = {};
    if(data) {
        data.forEach(item => { dbConfig[item.key] = item.value; });
    }

    container.innerHTML = '';
    structure.forEach(group => {
        container.innerHTML += `<h3 class="config-group-title">${group.title}</h3>`;
        
        group.items.forEach(item => {
            const currentValue = dbConfig[item.key] || '';
            const isVideo = item.key.includes('_video');
            const previewImg = isVideo ? 'https://placehold.co/120x80?text=VIDEO' : currentValue;
            
            container.innerHTML += `
                <div class="config-item">
                    <div class="config-label-container">
                        <span class="config-label">${item.label}</span>
                        <span class="config-key">ID: ${item.key}</span>
                    </div>
                    
                    ${!isVideo ? `<img src="${previewImg}" class="config-preview" onerror="this.src='https://placehold.co/120x80?text=Sin+Foto'">` : ''}
                    
                    <div style="flex-grow: 1;">
                        <input type="url" id="input-${item.key}" class="form-control" 
                               value="${currentValue}" 
                               placeholder="${isVideo ? 'Pega el enlace directo al .mp4' : 'Pega aquí la URL de la imagen...'}"
                               style="font-size: 0.9rem;">
                    </div>
                    
                    <button onclick="updateConfig('${item.key}', '${item.label}')" class="card-btn" style="width: auto; padding: 0.5rem 1.5rem;">
                        Guardar
                    </button>
                </div>
            `;
        });
    });
}

async function updateConfig(key, label) {
    const val = document.getElementById(`input-${key}`).value;
    
    const { error } = await supabase
        .from('site_config')
        .upsert({ key: key, value: val, label: label }, { onConflict: 'key' });

    if(error) alert('Error: ' + error.message);
    else {
        if(!key.includes('_video')) {
            const imgPreview = document.querySelector(`#input-${key}`).parentElement.previousElementSibling;
            if(imgPreview && imgPreview.tagName === 'IMG') imgPreview.src = val;
        }
        alert('Guardado correctamente');
    }
}