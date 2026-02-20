# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Configure nginx to listen on port 3000 and handle SPA routing
RUN echo 'server { \
    listen 3000; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
