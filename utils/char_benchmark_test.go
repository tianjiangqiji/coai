package utils

import (
	"testing"
)

func BenchmarkExtractImagesFromMarkdown(b *testing.B) {
	data := `
# Hello
![image1](https://example.com/image1.png)
Some text
![image2](http://example.com/image2.jpg?width=100)
More text
![not an image](ftp://example.com/not-image.png)
`
	for i := 0; i < b.N; i++ {
		ExtractImagesFromMarkdown(data)
	}
}
