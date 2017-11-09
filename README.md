# Logger
This is a logger lib written by vanilla JS. You just need config it with some code,
and it will provide you with reliable, automatic, intelligent function.

## API Reference

- [setMode](#setMode)
- [setLogLevel](#setLogLevel)
- [setSource](#setSource)
- [setVersion](#setVersion)
- [setBatchSize](#setBatchSize)
- [setBatchTimeout](#setBatchTimeout)
- [setPersistence](#setPersistence)
- [setPersistenceEngine](#setPersistenceEngine)
- [setStoragePrefix](#setStoragePrefix)
- [onFormat](#onFormat)
- [onSend](#onSend)

### `setMode`
+ `mode` *(`Enum`)*
    + `Server` Once logs prepare for sending, will call the `onSend`
    + `Console` Only print logs on the console, but not call `onSend`

### `setLogLevel`
+ `level` *(`Enum`)*
    + `All` print logs of any level
    + `Debug`
    + `Info`
    + `Notice`
    + `Warning`
    + `Error`
    + `Critical`
    + `Alert`
    + `Emergency`
    + `Off` print none

### `setSource`
+ `source` *(`Enum`)*
    + `Web`
    + `WebMobile`
    + `WebWeChat`
    + `App`

### `setVersion`
+ `version` *(`String`)*

Optional version info.

### `setBatchSize`
+ `size` *(`Number`)*

If number of logs in buffer reached the size, will call `onSend`.

### `setBatchTimeout`
+ `time` *(`Number`)*

If time interval reached, will call `onSend`.

### `setPersistence`
+ `isPersistence` *(`Boolean`)*

Whether or not persistence function is open.

### `setPersistenceEngine`
+ `engine` *(`PersistenceEngine`)*
    + `LocalStorage` built-in
    + `SessionStorage` built-in

Persists logs in storage. Certainly, you can provide engine yourself.

### `setStoragePrefix`
+ `prefix` *(`String`)*

Key prefix.

### `onFormat`
+ `onFormatCallbak` *(`Function`)*

You can define the callbak to format your log.

Arguments:
    
`context` *(`Object`)* Contains some info such as version, source, time, level.

`contents` *(`Array`)* All contents printed by calling Logger.xxx().

### `onSend`
+ `onSendCallbak` *(`Function`)*

You can define the callbak to send your logs.

Arguments:

`logs` *(`Array`)* The logs will be sent to server.

`cb` *(`Function`)* If you finish sending logs, remembering to call it.

## Example
See index.html.

```js
Logger
  .setMode(Logger.Mode.Server)
  .setLogLevel(Logger.Level.Debug)
  .setSource(Logger.Source.Web)
  .setVersion('2.0.0')
  .setBatchSize(10)
  .setBatchTimeout(10000)
  .setPersistence(true)
  .setPersistenceEngine(Logger.PersistenceEngine.LocalStorage)
  .setStoragePrefix('log_')
  .onFormat((ctx, contents) => {
    return {
      level: ctx.level,
      time: ctx.time,
      message: contents,
      source: ctx.source,
      version: ctx.version
    }
  })
  .onSend((logs, cb) => {
    console.log(logs)
    cb()
  })
```

## License
MIT


