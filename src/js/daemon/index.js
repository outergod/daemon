let sequence = 0
const callbacks = {}

const handlers = {
  ack (response, id) {
    if (callbacks[id]) {
      callbacks[id].resolve(response)
      delete callbacks[id]
    }    
  }
}

function handleMessage ({ data:message }) {
  console.log(`Received ${message}`)
  try {
    const { op, data, 'seq-id': id } = JSON.parse(message)
    const handler = handlers[op] || (() => {
      console.log(`Received unknown op ${op}`)
    })
    handler(data, id)
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.log(`Received unparsable JSON: ${e.message}`)
    } else {
      console.log(`Unexpected error in handleMessage: ${e.message}`)
    }
  }
}

export default {
  create ({ url }) {
    const { host, pathname, protocol } = new URL(url)
    const ws = protocol === 'https' ? 'wss' : 'ws'
    const socket = new WebSocket(`${ws}://${host}${pathname}socket`)

    function send (op, data) {
      const ret = new Promise((resolve, reject) => {
        callbacks[sequence] = { resolve, reject }
      })
      
      socket.send(JSON.stringify({ op, data, 'seq-id': sequence }))
      sequence++

      return ret
    }

    socket.addEventListener('message', handleMessage)

    return new Promise(resolve => {
      socket.addEventListener('open', () => {
        send('hello', { version: '0.1' })
        resolve({
          install (Vue/*, options*/) {
            Vue.prototype.$daemon = {
              send
            }
          }
        })
      })
    })
  }
}
