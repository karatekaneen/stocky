# OS
FROM node:14.4.0-slim

WORKDIR /app
COPY . /app

# Env-variables etc.
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Start the app
CMD [ "npm", "start" ]
