package palm2

import (
	adaptercommon "chat/adapter/common"
	"chat/globals"
	"chat/utils"
	"fmt"
	"strings"
)

type ImageProps struct {
	Model  string
	Prompt string
	Proxy  globals.ProxyConfig
}

func (c *ChatInstance) GetImageEndpoint(model string) string {
	return fmt.Sprintf("%s/v1beta/models/%s:predict?key=%s", c.Endpoint, model, c.ApiKey)
}

// CreateImageRequest will create a gemini imagen from prompt, return base64 of image and error
func (c *ChatInstance) CreateImageRequest(props ImageProps) (string, error) {
	res, err := utils.Post(
		c.GetImageEndpoint(props.Model),
		map[string]string{
			"Content-Type": "application/json",
		},
		ImageRequest{
			Instances: []ImageInstance{
				{
					Prompt: props.Prompt,
				},
			},
			Parameters: ImageParameters{
				SampleCount:      1,
				AspectRatio:      "1:1",
				PersonGeneration: "allow_adult",
			},
		},
		props.Proxy,
	)

	if err != nil || res == nil {
		return "", fmt.Errorf("gemini error: %s", err.Error())
	}

	data := utils.MapToStruct[ImageResponse](res)
	if data == nil {
		return "", fmt.Errorf("gemini error: cannot parse response")
	}

	if len(data.Predictions) == 0 {
		return "", fmt.Errorf("gemini error: no image generated")
	}

	return data.Predictions[0].BytesBase64Encoded, nil
}

// CreateImage will create a gemini imagen from prompt, return markdown of image
func (c *ChatInstance) CreateImage(props *adaptercommon.ChatProps) (string, error) {
	if !globals.IsGoogleImagenModel(props.Model) {
		return "", nil
	}

	base64Data, err := c.CreateImageRequest(ImageProps{
		Model:  props.Model,
		Prompt: c.GetLatestPrompt(props),
		Proxy:  props.Proxy,
	})

	if err != nil {
		if strings.Contains(err.Error(), "safety") {
			return err.Error(), nil
		}
		return "", err
	}

	// Convert base64 to data URL format
	dataUrl := fmt.Sprintf("data:image/png;base64,%s", base64Data)
	url := utils.StoreImage(dataUrl)
	return utils.GetImageMarkdown(url), nil
}
