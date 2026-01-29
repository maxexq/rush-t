#!/bin/bash

# Install protoc-gen-go and protoc-gen-go-grpc if not present
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generate Go code from proto
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    -I ../proto \
    ../proto/inventory.proto

# Move generated files to proper location
mkdir -p pkg/proto/inventory
mv *.pb.go pkg/proto/inventory/ 2>/dev/null || true

echo "Proto generation complete"

