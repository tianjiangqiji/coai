该项目是开源 AI 平台 Coai 的定制分支。此版本与 Coai 官方团队没有任何关联，亦非由其维护。
本项目新增了使用日志与支付系统；修复了较新模型无法使用图像识别的问题；修复了图像以及视频逆向模型输出格式不正常的问题；取消了工具栏的隐藏功能（个人认为这是负面功能容易让人找不到）
本人喜欢直接部署因此并没有准备docker部署相关设置，热心同志可以自行组建镜像。
广告：`https://api.ccode.vip/`是本人自建API中转服务，欢迎使用，与本项目无任何关联
本人运营站：`https://www.ccode.vip/`注册赠送一点积分供演示使用
官方文档：https://www.chatnio.com/docs
提前准备：
go mod vendor

Windows下编译为Linux debine AMD64 方法：
docker run --rm -v "${PWD}:/src" -w /src golang:1.21-bullseye bash -lc "apt-get update && apt-get install -y build-essential libwebp-dev && CGO_ENABLED=1 GOOS=linux GOARCH=amd64 /usr/local/go/bin/go build -mod=vendor -v -o chatnio"
或使用清华源加速下载
docker run --rm -v "${PWD}:/src" -w /src golang:1.21-bullseye bash -lc "sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list && apt-get update && apt-get install -y build-essential libwebp-dev && CGO_ENABLED=1 GOOS=linux GOARCH=amd64 /usr/local/go/bin/go build -mod=vendor -v -o chatnio"
