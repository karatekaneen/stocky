FROM node:14.4.0-slim
WORKDIR /app
COPY . /app
CMD [ "npm", "start" ]