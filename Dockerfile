FROM node
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /app/
COPY package.json yarn.lock /app/
RUN yarn install

COPY . /app/

CMD node src
