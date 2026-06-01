# ==========================================
# STAGE 1: COMPILE PRODUCTION ASSETS
# ==========================================
FROM node:20-slim AS build-stage

WORKDIR /app

# Enable cached layer installs
COPY package.json ./
RUN npm install

COPY . .

# Run production compilation
RUN npm run build

# ==========================================
# STAGE 2: PRODUCTION SERVER
# ==========================================
FROM nginx:1.25-alpine

# Copy compiled SPA static assets
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Overwrite default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
