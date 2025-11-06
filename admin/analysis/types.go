package analysis

type ModelData struct {
	Model string  `json:"model"`
	Data  []int64 `json:"data"`
}

type ModelChartForm struct {
	Date  []string    `json:"date"`
	Value []ModelData `json:"value"`
}

type RequestChartForm struct {
	Date  []string `json:"date"`
	Value []int64  `json:"value"`
}

type BillingChartForm struct {
	Date  []string  `json:"date"`
	Value []float32 `json:"value"`
}

type ErrorChartForm struct {
	Date  []string `json:"date"`
	Value []int64  `json:"value"`
}
