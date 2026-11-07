package main

import (
	"fmt"
	_ "expvar"
	"net"
	"net/http"
	_ "net/http/pprof"
	"runtime"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

var fixtureMutex sync.Mutex
var waiting = make(chan struct{})
var growthCount atomic.Int32

func main() {
	runtime.SetMutexProfileFraction(1)
	runtime.SetBlockProfileRate(1)
	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	// Intentionally contended critical section with a maximum duration.
	http.HandleFunc("/contend", func(w http.ResponseWriter, _ *http.Request) {
		fixtureMutex.Lock()
		time.Sleep(5 * time.Millisecond)
		fixtureMutex.Unlock()
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	// Deliberate bounded goroutine growth in a disposable local-only fixture.
	http.HandleFunc("/grow", func(w http.ResponseWriter, r *http.Request) {
		count, _ := strconv.Atoi(r.URL.Query().Get("count"))
		if count < 1 || count > 8 || growthCount.Load()+int32(count) > 16 {
			http.Error(w, "growth fixture quota exceeded", http.StatusBadRequest)
			return
		}
		for i := 0; i < count; i++ {
			growthCount.Add(1)
			go func() { <-waiting }()
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil { panic(err) }
	fmt.Printf("SATURIVO_PORT=%d\n", listener.Addr().(*net.TCPAddr).Port)
	if err := http.Serve(listener, nil); err != nil { panic(err) }
}
