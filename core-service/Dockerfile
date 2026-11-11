FROM golang:1.24-alpine AS builder
RUN apk add --no-cache protobuf-dev
WORKDIR /app
COPY core-service/go.mod core-service/go.sum ./
RUN go mod download
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
COPY proto/inventory.proto ./proto/
COPY core-service/ ./
RUN protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    -I ./proto \
    ./proto/inventory.proto && \
    mkdir -p pkg/proto/inventory && \
    mv *.pb.go pkg/proto/inventory/ || true
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 3000
CMD ["./server"]
