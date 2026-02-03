package channel

import (
	"chat/globals"
	"chat/utils"
	"fmt"
	"testing"
)

func TestCacheHitRateBaseline(t *testing.T) {
	globals.CacheAcceptedSize = 10

	// Simulate StoreCache which would have used some index
	// In the current implementation, it's what PreflightCache returned on the first call
	storedIndex := utils.Intn64(globals.CacheAcceptedSize)

	iterations := 10000
	hits := 0
	for i := 0; i < iterations; i++ {
		// Current implementation of PreflightCache picks a random index
		idx := utils.Intn64(globals.CacheAcceptedSize)
		if idx == storedIndex {
			hits++
		}
	}

	hitRate := float64(hits) / float64(iterations)
	t.Logf("Baseline Hit Rate with size %d: %f", globals.CacheAcceptedSize, hitRate)

	// Expected hit rate is approx 1/Size = 0.1
	if hitRate > 0.15 {
		t.Errorf("Hit rate too high for probabilistic cache: %f", hitRate)
	}
}

func TestCacheHitRateDeterministic(t *testing.T) {
	globals.CacheAcceptedSize = 10
	hash := "5d41402abc4b2a76b9719d911017c592" // md5 for "hello"

	// Implementation should be deterministic
	storedIndex := getHashIndex(hash, globals.CacheAcceptedSize)

	iterations := 10000
	hits := 0
	for i := 0; i < iterations; i++ {
		idx := getHashIndex(hash, globals.CacheAcceptedSize)
		if idx == storedIndex {
			hits++
		}
	}

	hitRate := float64(hits) / float64(iterations)
	t.Logf("Deterministic Hit Rate with size %d: %f", globals.CacheAcceptedSize, hitRate)

	if hitRate != 1.0 {
		t.Errorf("Hit rate should be 1.0 for deterministic cache, got %f", hitRate)
	}
}

func TestCacheDistribution(t *testing.T) {
	globals.CacheAcceptedSize = 10
	counts := make(map[int64]int)
	iterations := 10000
	for i := 0; i < iterations; i++ {
		hash := utils.Md5Encrypt(fmt.Sprintf("test-%d", i))
		idx := getHashIndex(hash, globals.CacheAcceptedSize)
		counts[idx]++
	}
	t.Logf("Distribution over %d shards: %v", globals.CacheAcceptedSize, counts)

	// Check if all shards are used
	if len(counts) < int(globals.CacheAcceptedSize) {
		t.Errorf("Not all shards were used: got %d, expected %d", len(counts), globals.CacheAcceptedSize)
	}
}
