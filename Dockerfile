FROM node:14-alpine

# App directory
WORKDIR /usr/src
COPY package.json package-lock.json /usr/src/
RUN npm install --only=prod

# Copy all and build ts files
COPY . .
RUN npm run build

# Run app
CMD ["npm", "start"]
