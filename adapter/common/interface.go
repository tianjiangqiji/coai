package adaptercommon

import (
	"chat/globals"
)

type Factory interface {
	CreateStreamChatRequest(props *ChatProps, hook globals.Hook) error
}

type VideoFactory interface {
	CreateVideoRequest(props *VideoProps, hook globals.Hook) error
}

type FactoryCreator func(globals.ChannelConfig) Factory
