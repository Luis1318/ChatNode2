# ChatNodeAlex – Chat con Socket.IO

## Correr en local
    npm install
    npm start          # http://localhost:4000
    npm run dev        # con nodemon (reinicio automático)

## Subir a Git
    git init
    git add .
    git commit -m "Chat con socket.io"
    git branch -M main
    git remote add origin https://github.com/TU_USUARIO/ChatNodeAlex.git
    git push -u origin main

## Desplegar en AWS EC2 (Ubuntu)
1. EC2 → Launch instance → Ubuntu 22.04/24.04, t2.micro/t3.micro, crea/descarga tu llave .pem.
2. Security Group → Inbound rules: SSH (22) y **Custom TCP 4000** desde 0.0.0.0/0.
3. Conéctate:
       ssh -i tu-llave.pem ubuntu@IP_PUBLICA
4. Instala Node.js y Git:
       sudo apt update && sudo apt install -y git
       curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
       sudo apt install -y nodejs
5. Clona y arranca:
       git clone https://github.com/TU_USUARIO/ChatNodeAlex.git
       cd ChatNodeAlex
       npm install
       npm start
6. Abre `http://IP_PUBLICA:4000` en el navegador.
7. (Opcional) Que siga corriendo al cerrar la terminal:
       sudo npm install -g pm2
       pm2 start index.js --name chat
       pm2 save && pm2 startup
