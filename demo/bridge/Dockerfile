FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bridge ./cmd/bridge

FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=builder /bridge /bridge

EXPOSE 4318

ENTRYPOINT ["/bridge"]
