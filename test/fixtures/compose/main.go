package main

import (
    "fmt"
    "net/http"
    "sync/atomic"
    "time"
)

var requests atomic.Uint64

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet && r.Method != http.MethodHead {
            w.WriteHeader(http.StatusMethodNotAllowed)
            return
        }
        requests.Add(1)
        w.Header().Set("Content-Type", "text/plain")
        _, _ = w.Write([]byte("ok"))
    })
    mux.HandleFunc("/requests", func(w http.ResponseWriter, _ *http.Request) {
        _, _ = fmt.Fprint(w, requests.Load())
    })
    server := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 3 * time.Second}
    if err := server.ListenAndServe(); err != nil { panic(err) }
}
