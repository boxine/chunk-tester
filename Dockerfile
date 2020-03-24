# To build: docker build -t chunk-tester .
# To run: docker run --rm -p 3005:3005 chunk-tester -4 https://meine.dev.tonie.cloud/

FROM node:lts-alpine

WORKDIR /chunk-tester/
ADD package-lock.json package.json ./ 
RUN npm install

ADD . .

EXPOSE 3005
ENTRYPOINT ["./run"]
