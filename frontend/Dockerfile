FROM node:20-alpine

ENV PNPM_HOME=/usr/local/share/pnpm \
    PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
