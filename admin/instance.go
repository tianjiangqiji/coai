package admin

import "chat/globals"

var MarketInstance *Market

func InitInstance() {
	MarketInstance = NewMarket()
	globals.SetVisionModels(MarketInstance.VisionModelIDs())
}
