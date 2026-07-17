# Imagen base ligera de Node.js
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos primero los manifiestos para aprovechar la cache de capas
COPY package*.json ./

# Instalamos solo dependencias de produccion
RUN npm install --omit=dev

# Copiamos el resto del codigo
COPY . .

# Puerto que expone la app
EXPOSE 3000

# Variable de entorno por defecto
ENV PORT=3000

# Comando de arranque
CMD ["npm", "start"]
