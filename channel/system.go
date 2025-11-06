package channel

import (
	"chat/globals"
	"chat/utils"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

type ApiInfo struct {
	Title              string   `json:"title"`
	Logo               string   `json:"logo"`
	File               string   `json:"file"`
	Docs               string   `json:"docs"`
	Announcement       string   `json:"announcement"`
	BuyLink            string   `json:"buylink"`
	Contact            string   `json:"contact"`
	Footer             string   `json:"footer"`
	AuthFooter         bool     `json:"authfooter"`
	Mail               bool     `json:"mail"`
	Article            []string `json:"article"`
	Generation         []string `json:"generation"`
	RelayPlan          bool     `json:"relayplan"`
	Payment            []string `json:"payment"`
	PaymentAggregation bool     `json:"payment_aggregation"`
	PaymentMinAmount   float64  `json:"payment_minamount"`
	PaymentEnabled     bool     `json:"payment_enabled"`
}

type generalState struct {
	Title       string `json:"title" mapstructure:"title"`
	Logo        string `json:"logo" mapstructure:"logo"`
	Backend     string `json:"backend" mapstructure:"backend"`
	File        string `json:"file" mapstructure:"file"`
	Docs        string `json:"docs" mapstructure:"docs"`
	PWAManifest string `json:"pwamanifest" mapstructure:"pwamanifest"`
	DebugMode   bool   `json:"debugmode" mapstructure:"debugmode"`
}

type siteState struct {
	CloseRegister bool    `json:"closeregister" mapstructure:"closeregister"`
	CloseRelay    bool    `json:"closerelay" mapstructure:"closerelay"`
	RelayPlan     bool    `json:"relayplan" mapstructure:"relayplan"`
	Quota         float64 `json:"quota" mapstructure:"quota"`
	BuyLink       string  `json:"buylink" mapstructure:"buylink"`
	Announcement  string  `json:"announcement" mapstructure:"announcement"`
	Contact       string  `json:"contact" mapstructure:"contact"`
	Footer        string  `json:"footer" mapstructure:"footer"`
	AuthFooter    bool    `json:"authfooter" mapstructure:"authfooter"`
}

type whiteList struct {
	Enabled   bool     `json:"enabled" mapstructure:"enabled"`
	Custom    string   `json:"custom" mapstructure:"custom"`
	WhiteList []string `json:"whitelist" mapstructure:"whitelist"`
}

type mailState struct {
	Host      string    `json:"host" mapstructure:"host"`
	Protocol  bool      `json:"protocol" mapstructure:"protocol"`
	Port      int       `json:"port" mapstructure:"port"`
	Username  string    `json:"username" mapstructure:"username"`
	Password  string    `json:"password" mapstructure:"password"`
	From      string    `json:"from" mapstructure:"from"`
	WhiteList whiteList `json:"whitelist" mapstructure:"whitelist"`
}

type SearchState struct {
	Endpoint   string   `json:"endpoint" mapstructure:"endpoint"`
	Crop       bool     `json:"crop" mapstructure:"crop"`
	CropLen    int      `json:"croplen" mapstructure:"croplen"`
	Engines    []string `json:"engines" mapstructure:"engines"`
	ImageProxy bool     `json:"imageproxy" mapstructure:"imageproxy"`
	SafeSearch int      `json:"safesearch" mapstructure:"safesearch"`
}

type commonState struct {
	Article     []string `json:"article" mapstructure:"article"`
	Generation  []string `json:"generation" mapstructure:"generation"`
	Cache       []string `json:"cache" mapstructure:"cache"`
	Expire      int64    `json:"expire" mapstructure:"expire"`
	Size        int64    `json:"size" mapstructure:"size"`
	ImageStore  bool     `json:"imagestore" mapstructure:"imagestore"`
	PromptStore bool     `json:"promptstore" mapstructure:"promptstore"`
}

type stripeState struct {
	Enabled       bool   `json:"enabled" mapstructure:"enabled"`
	PublicKey     string `json:"publickey" mapstructure:"publickey"`
	SecretKey     string `json:"secretkey" mapstructure:"secretkey"`
	WebhookSecret string `json:"webhooksecret" mapstructure:"webhooksecret"`
}

type epayState struct {
	Domain      string   `json:"domain" mapstructure:"domain"`
	BusinessID  string   `json:"businessid" mapstructure:"businessid"`
	BusinessKey string   `json:"businesskey" mapstructure:"businesskey"`
	CallbackURL string   `json:"callbackurl" mapstructure:"callbackurl"`
	Enabled     bool     `json:"enabled" mapstructure:"enabled"`
	Methods     []string `json:"methods" mapstructure:"methods"`
	Aggregation bool     `json:"aggregation" mapstructure:"aggregation"`
	MinAmount   float64  `json:"minamount" mapstructure:"minamount"`
}

type affiliateState struct {
	Enabled           bool    `json:"enabled" mapstructure:"enabled"`
	CommissionRate    float64 `json:"commissionrate" mapstructure:"commissionrate"`
	MinWithdraw       float64 `json:"minwithdraw" mapstructure:"minwithdraw"`
	AllowExistingBind bool    `json:"allowexistingbind" mapstructure:"allowexistingbind"`
}

type paymentState struct {
	Stripe    stripeState    `json:"stripe" mapstructure:"stripe"`
	Epay      epayState      `json:"epay" mapstructure:"epay"`
	Affiliate affiliateState `json:"affiliate" mapstructure:"affiliate"`
}

type SystemConfig struct {
	General generalState `json:"general" mapstructure:"general"`
	Site    siteState    `json:"site" mapstructure:"site"`
	Mail    mailState    `json:"mail" mapstructure:"mail"`
	Search  SearchState  `json:"search" mapstructure:"search"`
	Common  commonState  `json:"common" mapstructure:"common"`
	Payment paymentState `json:"payment" mapstructure:"payment"`
}

func (p *paymentState) sanitize() {
	if p.Epay.MinAmount <= 0 {
		p.Epay.MinAmount = 1
	}

	if p.Epay.Methods == nil {
		p.Epay.Methods = []string{}
	}
}

func NewSystemConfig() *SystemConfig {
	conf := &SystemConfig{}
	if err := viper.UnmarshalKey("system", conf); err != nil {
		panic(err)
	}

	// backward compatibility: older configs used keys without underscores
	if strings.TrimSpace(conf.Payment.Epay.BusinessID) == "" {
		conf.Payment.Epay.BusinessID = strings.TrimSpace(viper.GetString("system.payment.epay.businessid"))
	}
	if strings.TrimSpace(conf.Payment.Epay.BusinessKey) == "" {
		conf.Payment.Epay.BusinessKey = strings.TrimSpace(viper.GetString("system.payment.epay.businesskey"))
	}
	if strings.TrimSpace(conf.Payment.Epay.CallbackURL) == "" {
		conf.Payment.Epay.CallbackURL = strings.TrimSpace(viper.GetString("system.payment.epay.callbackurl"))
	}

	conf.Payment.sanitize()
	conf.Load()
	return conf
}

func (c *SystemConfig) Load() {
	c.Payment.sanitize()

	globals.NotifyUrl = c.GetBackend()
	globals.DebugMode = c.General.DebugMode

	globals.CloseRegistration = c.Site.CloseRegister
	globals.CloseRelay = c.Site.CloseRelay

	globals.ArticlePermissionGroup = c.Common.Article
	globals.GenerationPermissionGroup = c.Common.Generation
	globals.CacheAcceptedModels = c.Common.Cache

	globals.CacheAcceptedExpire = c.GetCacheAcceptedExpire()
	globals.CacheAcceptedSize = c.GetCacheAcceptedSize()
	globals.AcceptImageStore = c.AcceptImageStore()

	globals.AcceptPromptStore = c.Common.PromptStore

	if c.General.PWAManifest == "" {
		c.General.PWAManifest = utils.ReadPWAManifest()
	}

	globals.SearchEndpoint = c.Search.Endpoint
	globals.SearchCrop = c.Search.Crop
	globals.SearchCropLength = c.GetSearchCropLength()
	globals.SearchEngines = c.GetSearchEngines()
	globals.SearchImageProxy = c.GetImageProxy()
	globals.SearchSafeSearch = c.Search.SafeSearch

	methods := append([]string{}, c.Payment.Epay.Methods...)
	for i := range methods {
		methods[i] = strings.TrimSpace(methods[i])
	}

	callback := strings.TrimSpace(c.Payment.Epay.CallbackURL)
	if callback != "" {
		callback = strings.TrimSuffix(callback, "/")
		lower := strings.ToLower(callback)
		if !strings.HasSuffix(lower, "/payment/epay/notify") {
			callback = callback + "/payment/epay/notify"
		}
	}

	if len(callback) == 0 && len(globals.NotifyUrl) > 0 {
		callback = fmt.Sprintf("%s/payment/epay/notify", strings.TrimSuffix(globals.NotifyUrl, "/"))
	}

	globals.PaymentEpay = globals.EpayConfig{
		Enabled:     c.Payment.Epay.Enabled,
		Domain:      strings.TrimSuffix(strings.TrimSpace(c.Payment.Epay.Domain), "/"),
		BusinessID:  strings.TrimSpace(c.Payment.Epay.BusinessID),
		BusinessKey: strings.TrimSpace(c.Payment.Epay.BusinessKey),
		CallbackURL: callback,
		Methods:     methods,
		Aggregation: c.Payment.Epay.Aggregation,
		MinAmount:   c.Payment.Epay.MinAmount,
	}
}

func (c *SystemConfig) SaveConfig() error {
	payload, err := json.Marshal(c)
	if err != nil {
		return err
	}

	var conf map[string]interface{}
	if err := json.Unmarshal(payload, &conf); err != nil {
		return err
	}

	viper.Set("system", conf)
	c.Load()

	return viper.WriteConfig()
}

func (c *SystemConfig) AsInfo() ApiInfo {
	minAmount := c.Payment.Epay.MinAmount
	if minAmount <= 0 {
		minAmount = 1
	}

	return ApiInfo{
		Title:              c.General.Title,
		Logo:               c.General.Logo,
		File:               c.General.File,
		Docs:               c.General.Docs,
		Announcement:       c.Site.Announcement,
		Contact:            c.Site.Contact,
		Footer:             c.Site.Footer,
		AuthFooter:         c.Site.AuthFooter,
		BuyLink:            c.Site.BuyLink,
		Mail:               c.IsMailValid(),
		Article:            c.Common.Article,
		Generation:         c.Common.Generation,
		RelayPlan:          c.Site.RelayPlan,
		Payment:            append([]string{}, c.Payment.Epay.Methods...),
		PaymentAggregation: c.Payment.Epay.Aggregation,
		PaymentMinAmount:   minAmount,
		PaymentEnabled:     c.Payment.Epay.Enabled,
	}
}

func (c *SystemConfig) UpdateConfig(data *SystemConfig) error {
	c.General = data.General
	c.Site = data.Site
	c.Mail = data.Mail
	c.Search = data.Search
	c.Common = data.Common
	c.Payment = data.Payment

	utils.ApplySeo(c.General.Title, c.General.Logo)
	utils.ApplyPWAManifest(c.General.PWAManifest)

	return c.SaveConfig()
}

func (c *SystemConfig) GetInitialQuota() float64 {
	return c.Site.Quota
}

func (c *SystemConfig) GetBackend() string {
	return strings.TrimSuffix(c.General.Backend, "/")
}

func (c *SystemConfig) GetMail() *utils.SmtpPoster {
	return utils.NewSmtpPoster(
		c.Mail.Host,
		c.Mail.Protocol,
		c.Mail.Port,
		c.Mail.Username,
		c.Mail.Password,
		c.Mail.From,
	)
}

func (c *SystemConfig) IsMailValid() bool {
	return c.GetMail().Valid()
}

func (c *SystemConfig) GetMailSuffix() []string {
	if c.Mail.WhiteList.Enabled {
		return c.Mail.WhiteList.WhiteList
	}

	return []string{}
}

func (c *SystemConfig) IsValidMailSuffix(suffix string) bool {
	if c.Mail.WhiteList.Enabled {
		return utils.Contains(suffix, c.Mail.WhiteList.WhiteList)
	}

	return true
}

func (c *SystemConfig) IsValidMail(email string) error {
	segment := strings.Split(email, "@")
	if len(segment) != 2 {
		return fmt.Errorf("invalid email format")
	}

	if suffix := segment[1]; !c.IsValidMailSuffix(suffix) {
		return fmt.Errorf("email suffix @%s is not allowed to register", suffix)
	}

	return nil
}

func (c *SystemConfig) SendVerifyMail(email string, code string) error {
	type Temp struct {
		Title string `json:"title"`
		Logo  string `json:"logo"`
		Code  string `json:"code"`
	}

	return c.GetMail().RenderMail(
		"code.html",
		Temp{Title: c.GetAppName(), Logo: c.GetAppLogo(), Code: code},
		email,
		fmt.Sprintf("%s | OTP Verification", c.GetAppName()),
	)
}

func (c *SystemConfig) GetSearchCropLength() int {
	if c.Search.CropLen <= 0 {
		return 1000
	}

	return c.Search.CropLen
}

func (c *SystemConfig) GetSearchEngines() string {
	return strings.Join(c.Search.Engines, ",")
}

func (c *SystemConfig) GetImageProxy() string {
	// return "True" or "False"
	if c.Search.ImageProxy {
		return "True"
	}

	return "False"
}

func (c *SystemConfig) GetAppName() string {
	title := strings.TrimSpace(c.General.Title)
	if len(title) == 0 {
		return "Chat Nio"
	}

	return title
}

func (c *SystemConfig) GetAppLogo() string {
	logo := strings.TrimSpace(c.General.Logo)
	if len(logo) == 0 {
		return "https://chatnio.net/favicon.ico"
	}

	return logo
}

func (c *SystemConfig) GetCacheAcceptedModels() []string {
	return c.Common.Cache
}

func (c *SystemConfig) GetCacheAcceptedExpire() int64 {
	if c.Common.Expire <= 0 {
		// default 1 hour
		return 3600
	}

	return c.Common.Expire
}

func (c *SystemConfig) GetCacheAcceptedSize() int64 {
	if c.Common.Size < 1 {
		return 1
	}

	return c.Common.Size
}

func (c *SystemConfig) AcceptImageStore() bool {
	// if notify url is empty, then image store is not allowed
	if len(strings.TrimSpace(globals.NotifyUrl)) == 0 {
		return false
	}

	return c.Common.ImageStore
}

func (c *SystemConfig) SupportRelayPlan() bool {
	return c.Site.RelayPlan
}
