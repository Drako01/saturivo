package racefixture

import (
	"sync"
	"testing"
)

// This deliberately contains a race to verify detection with real Go evidence.
// It is isolated from the production extension and only used in expected-failure CI.
func TestIntentionalRace(t *testing.T) {
	var counter int
	start := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(2)
	for i := 0; i < 2; i++ {
		go func() {
			defer wg.Done()
			<-start
			for j := 0; j < 1000; j++ {
				counter++
			}
		}()
	}
	close(start)
	wg.Wait()
}
