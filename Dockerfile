# Build stage
FROM node:14-alpine AS ts-build-stage
WORKDIR /usr/src
COPY . .
RUN npm install
RUN npm run build

# Prod stage
FROM node:14-alpine AS ts-prod-stage
WORKDIR /usr/src
COPY --from=ts-build-stage ./usr/src/build ./build
COPY package* ./
RUN npm install --production
CMD ["npm", "start"]
