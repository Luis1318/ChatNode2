var socket = io();

var persona = document.getElementById('persona'),
    appChat = document.getElementById('app-chat'),
    panelBienvenida = document.getElementById('panel-bienvenida'),
    usuario = document.getElementById('usuario'),
    mensaje = document.getElementById('mensaje'),
    botonEnviar = document.getElementById('enviar'),
    botonAudio = document.getElementById('adjuntar-audio'),
    botonArchivo = document.getElementById('adjuntar-archivo'),
    botonMultimedia = document.getElementById('adjuntar-multimedia'),
    inputArchivo = document.getElementById('input-archivo'),
    inputMultimedia = document.getElementById('input-multimedia'),
    escribiendoMensaje = document.getElementById('escribiendo-mensaje'),
    output = document.getElementById('output'),
    ventana = document.getElementById('ventana-mensajes');

var MAX_BYTES = 25 * 1024 * 1024; // 25 MB

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
    } catch (e) {}
}

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

/* ---------- Enviar documentos generales (PDF, Word, Excel, etc.) ---------- */
botonArchivo.addEventListener('click', function () { inputArchivo.click(); });

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
            buffer: reader.result
        });
        inputArchivo.value = '';
    };
    reader.readAsArrayBuffer(file);
});

/* ---------- Enviar Fotos y Videos ---------- */
botonMultimedia.addEventListener('click', function () { inputMultimedia.click(); });

inputMultimedia.addEventListener('change', function () {
    var file = inputMultimedia.files[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
        alert('El archivo multimedia es demasiado grande (máximo 25 MB).');
        inputMultimedia.value = '';
        return;
    }
    var reader = new FileReader();
    reader.onload = function () {
        socket.emit('archivo', {
            usuario: usuario.value,
            nombre: file.name,
            tipo: file.type || 'application/octet-stream',
            buffer: reader.result
        });
        inputMultimedia.value = '';
    };
    reader.readAsArrayBuffer(file);
});

/* ---------- Audio en Vivo / Selector de Audio alternativo ---------- */
var mediaRecorder;
var audioChunks = [];
var grabando = false;

botonAudio.addEventListener('click', async function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        inputArchivo.click();
        return;
    }

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
            botonAudio.textContent = '⏹ Detener';
            botonAudio.style.background = '#ff007f';
            botonAudio.style.color = '#fff';
        } catch (err) {
            // Si el navegador bloquea el micrófono por HTTP, abre el selector de archivos generales para enviar un audio guardado
            inputArchivo.click();
        }
    } else {
        mediaRecorder.stop();
        grabando = false;
        botonAudio.textContent = '🎤 Audio';
        botonAudio.style.background = '';
        botonAudio.style.color = '';
    }
});

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

function ingresarAlChat() {
    if (persona.value.trim()) {
        panelBienvenida.style.display = 'none';
        appChat.style.display = 'block';
        usuario.value = persona.value.trim();
        usuario.readOnly = true;
        sonido();
    }
}
