# Dockerfile
FROM node:22-slim

# Crie o diretório de trabalho
WORKDIR /usr/src/app

# Copie o package.json e package-lock.json
COPY package*.json ./

# Instale as dependências
RUN npm install

# Instale a AWS CLI
RUN apt-get update && \
  apt-get install -y curl unzip && \
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
  unzip awscliv2.zip && \
  ./aws/install && \
  rm -rf awscliv2.zip aws

# Copie o restante do código da aplicação
COPY . .

# Comando para iniciar a aplicação
CMD ["npm", "run", "start"]
