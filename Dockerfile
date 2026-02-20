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
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s CMD wget -q http://localhost:80/ -O /dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
