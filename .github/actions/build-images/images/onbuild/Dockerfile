FROM artifact:main

ONBUILD COPY package* .
ONBUILD RUN npm install
ONBUILD COPY . .
