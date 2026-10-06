// Sin URL: se conecta automáticamente al servidor que sirvió la página
// (funciona en localhost y también con la IP pública de AWS)
var socket = io();

var persona = document.getElementById('persona'),
    appChat = document.getElementById('app-chat'),
    panelBienvenida = document.getElementById('panel-bienvenida'),
    usuario = document.getElementById('usuario'),
    mensaje = document.getElementById('mensaje'),
    botonEnviar = document.getElementById('enviar'),
    botonAdjuntar = document.getElementById('adjuntar'),
    inputArchivo = document.getElementById('archivo'),
    escribiendoMensaje = document.getElementById('escribiendo-mensaje'),
    output = document.getElementById('output'),
    ventana = document.getElementById('ventana-mensajes');

var MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/* ---------- Sonido (Web Audio API, no requiere archivos) ---------- */
var audioCtx = null;
function sonido() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) { /* si el navegador no soporta audio, se ignora */ }
}

/* ---------- Enviar mensaje de texto ---------- */
function enviarMensaje() {
    if (mensaje.value.trim()) {
        socket.emit('chat', {
            mensaje: mensaje.value,
            usuario: usuario.value
        });
        socket.emit('typing', { nombre: usuario.value, texto: '' });
    }
    mensaje.value = '';
}

botonEnviar.addEventListener('click', enviarMensaje);

mensaje.addEventListener('keyup', function (e) {
    if (e.key === 'Enter') { enviarMensaje(); return; }
    if (persona.value) {
        socket.emit('typing', {
            nombre: usuario.value,
            texto: mensaje.value
        });
    }
});

/* ---------- Enviar archivo ---------- */
botonAdjuntar.addEventListener('click', function () { inputArchivo.click(); });

inputArchivo.addEventListener('change', function () {
    var file = inputArchivo.files[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
        alert('El archivo es demasiado grande (máximo 25 MB).');
        inputArchivo.value = '';
        return;
    }
    var reader = new FileReader();
    reader.onload = function () {
        socket.emit('archivo', {
            usuario: usuario.value,
            nombre: file.name,
            tipo: file.type || 'application/octet-stream',
            buffer: reader.result // ArrayBuffer (socket.io lo envía como binario)
        });
        inputArchivo.value = '';
    };
    reader.readAsArrayBuffer(file);
});

/* ---------- Recibir ---------- */
function agregarMensaje(p) {
    output.appendChild(p);
    ventana.scrollTop = ventana.scrollHeight;
    sonido();
}

socket.on('chat', function (data) {
    escribiendoMensaje.innerHTML = '';
    var p = document.createElement('p');
    var strong = document.createElement('strong');
    strong.textContent = data.usuario + ': ';
    p.appendChild(strong);
    p.appendChild(document.createTextNode(data.mensaje)); // textNode evita inyección HTML
    agregarMensaje(p);
});

socket.on('archivo', function (data) {
    escribiendoMensaje.innerHTML = '';
    var blob = new Blob([data.buffer], { type: data.tipo });
    var url = URL.createObjectURL(blob);

    var p = document.createElement('p');
    var strong = document.createElement('strong');
    strong.textContent = data.usuario + ': ';
    p.appendChild(strong);
    p.appendChild(document.createTextNode('📎 ' + data.nombre));

    if (data.tipo.indexOf('image/') === 0) {
        var img = document.createElement('img');
        img.src = url;
        p.appendChild(img);
    } else if (data.tipo.indexOf('video/') === 0) {
        var video = document.createElement('video');
        video.src = url;
        video.controls = true;
        p.appendChild(video);
    } else if (data.tipo.indexOf('audio/') === 0) {
        var audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        p.appendChild(audio);
    }

    var a = document.createElement('a');
    a.href = url;
    a.download = data.nombre;
    a.className = 'descarga';
    a.textContent = '⬇ Descargar';
    p.appendChild(document.createElement('br'));
    p.appendChild(a);

    agregarMensaje(p);
});

socket.on('typing', function (data) {
    if (data.texto) {
        escribiendoMensaje.innerHTML = '';
        var p = document.createElement('p');
        var em = document.createElement('em');
        em.textContent = data.nombre + ' está escribiendo un mensaje...';
        p.appendChild(em);
        escribiendoMensaje.appendChild(p);
    } else {
        escribiendoMensaje.innerHTML = '';
    }
});

/* ---------- Entrar al chat ---------- */
function ingresarAlChat() {
    if (persona.value.trim()) {
        panelBienvenida.style.display = 'none';
        appChat.style.display = 'block';
        usuario.value = persona.value.trim();
        usuario.readOnly = true;
        sonido(); // el clic activa el audio del navegador
    }
}
