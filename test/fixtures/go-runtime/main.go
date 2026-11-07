package main

import (
	"fmt"
	"net"
	"net/http"
	_ "net/http/pprof"
)

func main() {
	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic(err)
	}
	fmt.Printf("SATURIVO_PORT=%d\n", listener.Addr().(*net.TCPAddr).Port)
	if err := http.Serve(listener, nil); err != nil {
		panic(err)
	}
}
