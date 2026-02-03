package utils

import (
	"reflect"
	"testing"
)

func TestExtractImagesFromMarkdown(t *testing.T) {
	tests := []struct {
		name     string
		data     string
		expected []string
	}{
		{
			name:     "single image",
			data:     "![image](https://example.com/image.png)",
			expected: []string{"https://example.com/image.png"},
		},
		{
			name:     "multiple images",
			data:     "![image1](https://example.com/image1.png) and ![image2](http://example.com/image2.jpg)",
			expected: []string{"https://example.com/image1.png", "http://example.com/image2.jpg"},
		},
		{
			name:     "with query params",
			data:     "![image](https://example.com/image.png?width=100&height=200)",
			expected: []string{"https://example.com/image.png?width=100&height=200"},
		},
		{
			name:     "no images",
			data:     "some text without images",
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ExtractImagesFromMarkdown(tt.data); !reflect.DeepEqual(got, tt.expected) {
				t.Errorf("ExtractImagesFromMarkdown() = %v, want %v", got, tt.expected)
			}
		})
	}
}
