# ---- etapa 1: compilar o frontend ----
FROM node:22-alpine AS front
WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ---- etapa 2: compilar o Go ----
FROM golang:1.26-alpine AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o /anideck ./cmd/web

# ---- etapa 3: imagem final ----
FROM alpine:3.22
RUN apk add --no-cache ca-certificates
WORKDIR /app

COPY --from=builder /anideck /app/anideck
COPY --from=front /app/dist /app/client/dist
COPY sql /app/sql

EXPOSE 8080
CMD ["/app/anideck"]