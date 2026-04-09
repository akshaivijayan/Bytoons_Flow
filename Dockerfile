# Use a stable Node.js LTS version on Debian Bullseye (good glibc compatibility)
FROM node:20-bullseye

# Create app directory
WORKDIR /usr/src/app

# Install build dependencies for sqlite3
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies (rebuilds sqlite3 from source automatically)
RUN npm install

# Copy app source
COPY . .

# Expose the port (Render uses PORT env var)
EXPOSE 5000

# Start command
CMD [ "node", "server.js" ]
