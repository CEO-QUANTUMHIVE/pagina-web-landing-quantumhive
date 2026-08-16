FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/

# Copy landing files
COPY . /usr/share/nginx/html/

# Remove unnecessary files from image
RUN rm -f /usr/share/nginx/html/Dockerfile \
         /usr/share/nginx/html/nginx.conf \
         /usr/share/nginx/html/.gcloudignore

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
