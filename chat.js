var socket = io();

var persona = document.getElementById('persona'),
    appChat = document.getElementById('app-chat'),
    panelBienvenida = document.getElementById('panel-bienvenida'),
    usuario = document.getElementById('usuario'),
    mensaje = document.getElementById('mensaje'),
    botonEnviar = document.getElementById('enviar'),
    botonAudio = document.getElementById('adjuntar'),
    escribiendoMensaje = document.getElementById('escribiendo-mensaje'),
    output = document.getElementById('output'),
    ventana = document.getElementById('ventana-mensajes');

var MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/* ---------- Sonido (Web Audio API) ---------- */
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
    } catch (e) { /* ignorar si no hay soporte */ }
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

/* ---------- Grabación de Audio en Vivo ---------- */
var mediaRecorder;
var audioChunks = [];
var grabando = false;

botonAudio.addEventListener('click', async function () {
    if (!grabando) {
        try {
            var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = function (event) {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = function () {
                var audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                if (audioBlob.size > MAX_BYTES) {
                    alert('El audio es demasiado grande.');
                    return;
                }
                var reader = new FileReader();
                reader.onload = function () {
                    socket.emit('archivo', {
                        usuario: usuario.value,
                        nombre: 'nota_de_voz.webm',
                        tipo: 'audio/webm',
                        buffer: reader.result
                    });
                };
                reader.readAsArrayBuffer(audioBlob);
            };

            mediaRecorder.start();
            grabando = true;
            botonAudio.textContent = '⏹ Detener y Enviar';
            botonAudio.style.background = '#ff007f';
        } catch (err) {
            alert('No se pudo acceder al micrófono.');
        }
    } else {
        mediaRecorder.stop();
        grabando = false;
        botonAudio.textContent = '🎤 Grabar Audio';
        botonAudio.style.background = '';
    }
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
    p.appendChild(document.createTextNode(data.mensaje));
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
    p.appendChild(document.createTextNode('🎙 Nota de voz / Archivo: ' + data.nombre));

    if (data.tipo.indexOf('audio/') === 0) {
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
        sonido();
    }
}
