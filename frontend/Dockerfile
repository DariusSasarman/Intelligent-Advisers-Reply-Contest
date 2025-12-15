# Stage 1: Build Vite app
FROM node:20-alpine AS build
WORKDIR /app

# Copy package.json and package-lock.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build the production-ready frontend
RUN npm run build

# Stage 2: Serve built app with Nginx
FROM nginx:alpine

# Copy your custom Nginx config into the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built frontend files from stage 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
