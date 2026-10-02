import { Client } from '@stomp/stompjs'

const toWebSocketUrl = (baseUrl) => baseUrl.replace(/^http/, 'ws')

export const blueprintTopic = (author, name) => `/topic/blueprints.${author}.${name}`

export function createStompClient(baseUrl, token) {
  return new Client({
    brokerURL: `${toWebSocketUrl(baseUrl)}/ws-blueprints`,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 1000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  })
}

export function subscribeBlueprint(client, author, name, onMessage) {
  return client.subscribe(blueprintTopic(author, name), (message) =>
    onMessage(JSON.parse(message.body)),
  )
}
