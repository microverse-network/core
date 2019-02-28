# Microverse Network

See [quickstart](https://github.com/szkl/microverse-quickstart) for a
brief application implementation.

## Modules

- [core](#core)
- [environment](#environment)
- [config](#config)
- [transport](#transport)
  - [WebRTC](#webrtc)
  - [WebSocket](#websocket)
  - [wrtc](#wrtc)
- [Module](#module)
- [Tracker](#tracker)

### core

`core` module is the place for essential dependencies required to
implement basic modules for microverse runtime environment.

#### class `Base`

`Base` class extends
[`EventEmitter`](https://www.npmjs.com/package/eventemitter3) and
implements a `ready` method which returns a promise that is resolved
once the instance emits `ready` event.

`Base` class implements some utility methods.

- `handleReady`: called once `ready` event is emitted.
- `bindEventListeners`: called by `handleReady` method.

`bindEventListeners` represents a general purpose event subscription
process.

#### class `Network`

`Network` class is the base implementation of a node in the
network. Its main responsibility is to establish transports and manage
connections.

### environment

#### class `Environment`

`Environment` class represents the runtime which basically consists of
a `Network` and `Module` instances.

Modules instantiated in an environment are announced with a `module`
and `module.$name` event.

Environment can instantiate plugins which are basically module
constructors read from the configuration object.

### config

`config` module exports a singleton configuration object for the
running environment. You can customize the environment by accessing
the configuration object by requiring this module before the
environment is instantiated.

## Transport

Transports are the underlying mechanisms to establish communication
between nodes. General structure is a transport class implementing
`connect` and `handleConnection` methods and a corresponding
connection class.

### Connection

A connection instance is mainy responsible for providing streams to
modules instantiated in the environment. Base `Connection` class wraps
the connection channel with
[`mux-demux`](https://www.npmjs.com/package/mux-demux) to provide
multiple streams.

Connection subclasses must implement a `_createStream` method if
connection channel is not wrapped.

## Module

`Module` class is the entry point for applications. Modules receive
connections by subscribing to `connection` event of the node
instance. Base `Module` class utilizes a
[`mux-demux`](https://www.npmjs.com/package/mux-demux) per connection
to provide multiple streams for the application.

Remote module instances peer with each other based on the connection
stream name.

### RPC

`RPC` is the first application module implementation. It basically
pipes the [dnode](https://www.npmjs.com/package/dnode) stream through
a substream named `dnode`. Remotes are registered to the `remotes`
list and announced with `remote` and `remote.$nodeId` events.

Remote API is the return value of the `getProtocol` method.

Remote instances will have a `remote` property to invoke methods on
the other end when needed.

## Tracker

`Tracker` is the component required to establish a connection between
nodes. It acts like a intermediary signal server.

`tracker-plugin` module is the client implementation. It subscribes to
`module` event of the environment. If module is discoverable then
queries the tracker server for the modules having the same stream
name and tries to connect to each available nodes based on their
transport descriptions.
