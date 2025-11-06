package admin

import (
	"chat/globals"
	"fmt"

	"github.com/spf13/viper"
)

type ModelTag []string
type MarketModel struct {
	Id              string   `json:"id" mapstructure:"id" required:"true"`
	Name            string   `json:"name" mapstructure:"name" required:"true"`
	Description     string   `json:"description" mapstructure:"description"`
	Free            bool     `json:"free" mapstructure:"free"`
	Auth            bool     `json:"auth" mapstructure:"auth"`
	Default         bool     `json:"default" mapstructure:"default"`
	HighContext     bool     `json:"high_context" mapstructure:"highcontext"`
	FunctionCalling bool     `json:"function_calling" mapstructure:"functioncalling"`
	VisionModel     bool     `json:"vision_model" mapstructure:"visionmodel"`
	ThinkingModel   bool     `json:"thinking_model" mapstructure:"thinkingmodel"`
	OCRModel        bool     `json:"ocr_model" mapstructure:"ocrmodel"`
	ReverseModel    bool     `json:"reverse_model" mapstructure:"reversemodel"`
	Avatar          string   `json:"avatar" mapstructure:"avatar"`
	Tag             ModelTag `json:"tag" mapstructure:"tag"`
}
type MarketModelList []MarketModel

type Market struct {
	Models MarketModelList `json:"models" mapstructure:"models"`
}

func NewMarket() *Market {
	var models MarketModelList
	if err := viper.UnmarshalKey("market", &models); err != nil {
		globals.Warn(fmt.Sprintf("[market] read config error: %s, use default config", err.Error()))
		models = MarketModelList{}
	}

	return &Market{
		Models: models,
	}
}

func (m *Market) GetModels() MarketModelList {
	return m.Models
}

func (m *Market) GetModel(id string) *MarketModel {
	for _, model := range m.Models {
		if model.Id == id {
			return &model
		}
	}
	return nil
}

func (m *Market) VisionModelIDs() []string {
	var result []string
	for _, model := range m.Models {
		if model.VisionModel && len(model.Id) > 0 {
			result = append(result, model.Id)
		}
	}
	return result
}

func (m *Market) SaveConfig() error {
	viper.Set("market", m.Models)
	return viper.WriteConfig()
}

func (m *Market) SetModels(models MarketModelList) error {
	m.Models = models
	if err := m.SaveConfig(); err != nil {
		return err
	}

	globals.SetVisionModels(m.VisionModelIDs())
	return nil
}
