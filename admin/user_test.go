package admin

import (
	"context"
	"fmt"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/go-redis/redis/v8"
)

func BenchmarkClearUserCache(b *testing.B) {
	s, err := miniredis.Run()
	if err != nil {
		b.Fatal(err)
	}
	defer s.Close()

	client := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})

	ctx := context.Background()

	for i := 0; i < b.N; i++ {
		b.StopTimer()
		// Fill redis with 1000 keys
		for j := 0; j < 1000; j++ {
			client.Set(ctx, fmt.Sprintf("nio:user:%d", j), "value", 0)
		}
		b.StartTimer()

		err := clearUserCache(client)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func TestClearUserCache(t *testing.T) {
	s, err := miniredis.Run()
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()

	client := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})

	ctx := context.Background()

	// Fill redis with some keys
	for j := 0; j < 10; j++ {
		client.Set(ctx, fmt.Sprintf("nio:user:%d", j), "value", 0)
	}
	client.Set(ctx, "other:key", "value", 0)

	err = clearUserCache(client)
	if err != nil {
		t.Fatal(err)
	}

	// Check if keys are deleted
	for j := 0; j < 10; j++ {
		exists, err := client.Exists(ctx, fmt.Sprintf("nio:user:%d", j)).Result()
		if err != nil {
			t.Fatal(err)
		}
		if exists != 0 {
			t.Errorf("key nio:user:%d should have been deleted", j)
		}
	}

	// Check if other key is still there
	exists, err := client.Exists(ctx, "other:key").Result()
	if err != nil {
		t.Fatal(err)
	}
	if exists == 0 {
		t.Errorf("key other:key should NOT have been deleted")
	}
}
