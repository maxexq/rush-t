.PHONY: proto build run clean

proto:
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		../proto/inventory.proto
	mkdir -p pkg/proto/inventory
	mv inventory.pb.go pkg/proto/inventory/
	mv inventory_grpc.pb.go pkg/proto/inventory/

build:
	go build -o bin/core-service ./cmd/server

run:
	go run ./cmd/server/main.go

clean:
	rm -rf bin/
	rm -rf pkg/proto/

