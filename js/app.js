/* 1 */
// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'https://yilebxkruckgixmzqxbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpbGVieGtydWNrZ2l4bXpxeGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjM2NTUsImV4cCI6MjA4MDc5OTY1NX0.6Q9zFMGtuIUdt5hnsT_FL24Zoptsf9dJuoGNJQMGjek';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- CONSTANTES ---
// Definimos el envío como un producto más para manejarlo fácil en el carrito
const SHIPPING_PRODUCT = {
    id: 'shipping_fee',
    name: 'Costo de Envío',
    price: 2000,
    type: 'service', // Identificador para no mostrar foto o tratar distinto
    image: 'https://cdn-icons-png.flaticon.com/512/759/759238.png' // Icono opcional
};

// --- ESTADO ---
let cart = [];
let localProducts = [];

// Lista de comunas con reparto a domicilio (Línea 4 y aledañas)
const DOMICILIO_COMMUNES = [
    "Peñalolén", "La Reina", "Ñuñoa", "Macul", 
    "La Florida", "Puente Alto", "Providencia", "Las Condes"
];

// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    loadSiteConfigAndImages();
    fetchProducts();
    updateCartCount();
    setupVideoHover();
    // Inicializar estado de campos (esto validará si hay que agregar envío por defecto o no)
    toggleDeliveryFields(); 
});

// --- UI HELPERS & LOGICA DE ENVIO ---
function toggleDeliveryFields() {
    const deliveryRadio = document.querySelector('input[name="delivery_type"]:checked');
    const deliveryType = deliveryRadio ? deliveryRadio.value : 'retiro';
    
    const shippingFields = document.getElementById('shipping-fields');
    const shippingDisclaimer = document.getElementById('shipping-disclaimer');
    const addressInput = document.getElementById('cust-address');
    const communeSelect = document.getElementById('cust-commune');

    if (deliveryType === 'envio') {
        // Mostrar campos
        shippingFields.classList.remove('hidden');
        shippingDisclaimer.classList.remove('hidden');
        addressInput.required = true;
        communeSelect.required = true;

        // AGREGAR PRODUCTO DE ENVÍO AL CARRO (Si no existe ya)
        const hasShipping = cart.some(item => item.id === SHIPPING_PRODUCT.id);
        if (!hasShipping) {
            cart.push(SHIPPING_PRODUCT);
        }

    } else {
        // Ocultar campos
        shippingFields.classList.add('hidden');
        shippingDisclaimer.classList.add('hidden');
        addressInput.required = false;
        communeSelect.required = false;

        // ELIMINAR PRODUCTO DE ENVÍO DEL CARRO
        cart = cart.filter(item => item.id !== SHIPPING_PRODUCT.id);
    }

    // Actualizar visualmente el carro y contadores
    renderCartItems();
    updateCartCount();
}

// --- CARGAR IMÁGENES DINÁMICAS ---
async function loadSiteConfigAndImages() {
    const { data } = await supabase.from('site_config').select('*');
    if (!data) return;
    const config = {};
    data.forEach(item => { config[item.key] = item.value; });

    const hero = document.querySelector('.hero');
    if (hero && config['hero_bg']) hero.style.backgroundImage = `linear-gradient(rgba(62, 39, 35, 0.7), rgba(62, 39, 35, 0.7)), url('${config['hero_bg']}')`;

    ['feature_1', 'feature_2', 'feature_3', 'testi_1', 'testi_2', 'testi_3'].forEach(k => {
        const id = k.replace('_', '-img-'); 
        const el = document.getElementById(id);
        if(el && config[k]) el.src = config[k];
    });

    ['insta_1', 'insta_2', 'insta_3', 'tiktok_1', 'tiktok_2', 'tiktok_3'].forEach(k => {
        const id = k.replace('_', '-img-');
        const el = document.getElementById(id);
        if(el && config[k]) el.src = config[k];
    });

    ['tiktok_1_video', 'tiktok_2_video', 'tiktok_3_video'].forEach(k => {
        const id = k.replace('_', '-vid-').replace('_video', '');
        const el = document.getElementById(id);
        if(el && config[k]) el.src = config[k];
    });
}

function setupVideoHover() {
    const tiktokCards = document.querySelectorAll('.tiktok-card');
    tiktokCards.forEach(card => {
        const video = card.querySelector('video');
        if(!video) return;
        card.addEventListener('mouseenter', () => { if(video.src) video.play().catch(e => {}); });
        card.addEventListener('mouseleave', () => { if(video.src) { video.pause(); video.currentTime = 0; } });
    });
}

// --- PRODUCTOS ---
async function fetchProducts() {
    const listMain = document.getElementById('product-list');
    const listExtra = document.getElementById('extra-list');
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });

    if (error) { console.error(error); return; }
    localProducts = data;
    renderProducts(data);
}

function renderProducts(products) {
    const listMain = document.getElementById('product-list');
    const listExtra = document.getElementById('extra-list');
    listMain.innerHTML = ''; listExtra.innerHTML = '';

    if(products.length === 0) listMain.innerHTML = '<p>No hay productos disponibles.</p>';

    products.forEach(p => {
        // Filtramos para que no muestre el producto de envío en el catálogo principal si estuviera en la BD
        if (p.id === 'shipping_fee') return;

        const mainImg = (p.images && p.images.length > 0) ? p.images[0] : p.image;
        const cardHTML = `
            <div class="product-card">
                <div class="card-img-container" onclick="openProductModal(${p.id})">
                    <img src="${mainImg}" alt="${p.name}" class="card-img">
                </div>
                <div class="card-body">
                    <h3 class="card-title">${p.name}</h3>
                    <div class="card-price">$${p.price.toLocaleString('es-CL')}</div>
                    <button class="btn-outline" onclick="openProductModal(${p.id})">Ver detalle</button>
                    <button class="card-btn" onclick="addToCart(${p.id})">Agregar</button>
                </div>
            </div>
        `;
        if(p.type === 'main') listMain.innerHTML += cardHTML;
        else listExtra.innerHTML += cardHTML;
    });
}

// --- CARRITO & CHECKOUT ---
function addToCart(id) {
    const product = localProducts.find(p => p.id === id);
    if(product) { cart.push(product); updateCartCount(); openCart(); }
}

function updateCartCount() { 
    document.getElementById('cart-count').innerText = cart.length; 
}

function removeFromCart(index) {
    const removedItem = cart[index];
    cart.splice(index, 1);
    
    // Si el usuario borra manualmente el envío del carrito
    if (removedItem.id === SHIPPING_PRODUCT.id) {
        // Marcamos el radio button como "Retiro" visualmente
        const retiroRadio = document.querySelector('input[name="delivery_type"][value="retiro"]');
        if (retiroRadio) {
            retiroRadio.checked = true;
            // Llamamos a toggle para que oculte los campos
            toggleDeliveryFields(); 
            // toggleDeliveryFields ya llama a renderCartItems, así que no es necesario llamarlo de nuevo aquí
            return;
        }
    }

    renderCartItems();
    updateCartCount();
}

function openCart() { renderCartItems(); document.getElementById('cart-modal').classList.add('active'); }

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-amount');
    
    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999;">Tu carrito está vacío</p>';
    } else {
        cart.forEach((item, index) => {
            total += item.price;
            
            // Estilo especial si es el envío
            const isShipping = item.id === SHIPPING_PRODUCT.id;
            const itemStyle = isShipping ? 'background-color: #f0f7ff; border: 1px dashed #1976D2;' : '';
            const icon = isShipping ? '<i class="ph ph-moped" style="color: #1976D2; margin-right:5px;"></i> ' : '';

            container.innerHTML += `
                <div class="cart-item" style="${itemStyle}">
                    <div>
                        <strong>${icon}${item.name}</strong><br>
                        <small>$${item.price.toLocaleString('es-CL')}</small>
                    </div>
                    <button onclick="removeFromCart(${index})" style="color:red; background:none; border:none; cursor:pointer;">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            `;
        });
    }
    
    if(totalEl) totalEl.innerText = total.toLocaleString('es-CL');
}

async function processOrder(e) {
    e.preventDefault();
    if (cart.length === 0) return alert("Carrito vacío");
    const btn = document.getElementById('btn-confirm-order');
    btn.disabled = true; btn.innerText = "Procesando...";
    
    const name = document.getElementById('cust-name').value;
    const deliveryType = document.querySelector('input[name="delivery_type"]:checked').value;
    
    let address = "Retiro en tienda (Peñalolén)";
    let commune = "Peñalolén";
    let deliveryMessage = "🏠 *Retiro en Tienda*\nPillán 6383, Peñalolén.";

    if (deliveryType === 'envio') {
        address = document.getElementById('cust-address').value;
        commune = document.getElementById('cust-commune').value;
        
        if (DOMICILIO_COMMUNES.includes(commune)) {
            deliveryMessage = `🛵 *Solicitud Envío a Domicilio*\n📍 Dirección: ${address}, ${commune}.`;
        } else {
            deliveryMessage = `🚇 *Solicitud Entrega en Metro*\n📍 Comuna: ${commune}.\n🚇 Referencia/Estación: ${address}`;
        }
    }
    
    let total = 0;
    const itemSummary = [];
    const itemCounts = {};
    
    cart.forEach(item => {
        total += item.price;
        itemSummary.push({ name: item.name, price: item.price });
        // Contamos items para el mensaje
        itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
    });

    const { data, error } = await supabase.from('orders').insert([{
        customer_name: name, customer_address: address, customer_commune: commune, total: total, items: itemSummary, status: 'pendiente'
    }]).select();

    if (error) { alert("Error al guardar pedido."); btn.disabled = false; return; }

    const orderId = data[0].id;
    let message = `Hola Derretidos! 👋 Soy *${name}*.\nPedido #${orderId}\n\n`;
    
    // Construimos la lista del mensaje
    for (const [itemName, count] of Object.entries(itemCounts)) { 
        message += `▪️ ${count}x ${itemName}\n`; 
    }
    
    message += `\n*TOTAL A PAGAR: $${total.toLocaleString('es-CL')}*\n\n`;
    message += deliveryMessage;
    message += `\n\n🧾 *Adjunto comprobante:*`;
    
    const phone = "56912345678"; 
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    
    // Resetear todo
    cart = []; 
    updateCartCount(); 
    closeModal('cart-modal'); 
    document.getElementById('checkout-form').reset();
    
    // Volver a opción de retiro por defecto
    const retiroRadio = document.querySelector('input[name="delivery_type"][value="retiro"]');
    if(retiroRadio) {
        retiroRadio.checked = true;
        toggleDeliveryFields();
    }

    btn.disabled = false; btn.innerText = "Finalizar en WhatsApp";
}

// --- MODALES & GALERIA ---
function openProductModal(id) {
    const p = localProducts.find(item => item.id === id);
    const modalBody = document.getElementById('modal-body-content');
    
    if (p) {
        let images = [];
        if(p.images && p.images.length > 0) {
            images = p.images;
        } else if (p.image) {
            images = [p.image];
        }

        const mainImg = images[0];
        
        let thumbnailsHTML = '';
        if(images.length > 1) {
            thumbnailsHTML = '<div class="thumbnail-row">';
            images.forEach((img, index) => {
                const activeClass = index === 0 ? 'active' : '';
                thumbnailsHTML += `<img src="${img}" onclick="changeModalImage(this)" class="thumbnail ${activeClass}">`;
            });
            thumbnailsHTML += '</div>';
        }

        modalBody.innerHTML = `
            <div class="detail-image-col">
                <img id="modal-main-img" src="${mainImg}" alt="${p.name}" class="detail-main-img">
                ${thumbnailsHTML}
            </div>
            <div class="detail-info-col">
                <h2 class="detail-title">${p.name}</h2>
                <div class="detail-price">$${p.price.toLocaleString('es-CL')}</div>
                <p class="detail-desc">${p.description}</p>
                <button class="card-btn" onclick="addToCart(${p.id}); closeModal('product-modal')">Agregar al Pedido</button>
            </div>
        `;
        document.getElementById('product-modal').classList.add('active');
    }
}

window.changeModalImage = function(thumbElement) {
    const mainImg = document.getElementById('modal-main-img');
    mainImg.src = thumbElement.src;
    document.querySelectorAll('.thumbnail').forEach(el => el.classList.remove('active'));
    thumbElement.classList.add('active');
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }
window.onclick = function(e) { if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('active'); }