FROM registry:5000/temp/artifact:main

ONBUILD COPY package* .
ONBUILD RUN npm install
ONBUILD COPY . .
