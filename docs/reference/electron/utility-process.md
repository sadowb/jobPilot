[Skip to main content](https://www.electronjs.org/docs/latest/api/utility-process#__docusaurus_skipToContent_fallback)

On this page

`utilityProcess` creates a child process with
Node.js and Message ports enabled. It provides the equivalent of [`child_process.fork`](https://nodejs.org/dist/latest-v16.x/docs/api/child_process.html#child_processforkmodulepath-args-options) API from Node.js
but instead uses [Services API](https://chromium.googlesource.com/chromium/src/+/main/docs/mojo_and_services.md) from Chromium to launch the child process.

Process: [Main](https://www.electronjs.org/docs/latest/glossary#main-process)

## Methods [​](https://www.electronjs.org/docs/latest/api/utility-process\#methods "Direct link to Methods")

### `utilityProcess.fork(modulePath[, args][, options])` [​](https://www.electronjs.org/docs/latest/api/utility-process\#utilityprocessforkmodulepath-args-options "Direct link to utilityprocessforkmodulepath-args-options")

- `modulePath` string - Path to the script that should run as entrypoint in the child process.
- `args` string\[\] (optional) - List of string arguments that will be available as `process.argv`
in the child process.
- `options`Object (optional)
  - `env` Object (optional) - Environment key-value pairs. Default is `process.env`.
  - `execArgv` string\[\] (optional) - List of string arguments passed to the executable.
  - `cwd` string (optional) - Current working directory of the child process.
  - `session` [Session](https://www.electronjs.org/docs/latest/api/session) (optional) - Sets the session used by the process for network
    requests. By default, network requests from the utility process will use the system network
    context which does not have HTTP cache support. Setting a session enables HTTP caching and
    other session-specific network features. See [session](https://www.electronjs.org/docs/latest/api/session) for more information.
  - `partition` string (optional) - Sets the session used by the process according to the
    session's partition string. If `partition` starts with `persist:`, the process will use a
    persistent session available to all pages in the app with the same `partition`. If there is
    no `persist:` prefix, the process will use an in-memory session. By assigning the same
    `partition`, multiple processes can share the same session. If the `session` option is set,
    this option is ignored.
  - `stdio` (string\[\] \| string) (optional) - Allows configuring the mode for `stdout` and `stderr`
    of the child process. Default is `inherit`.
    String value can be one of `pipe`, `ignore`, `inherit`, for more details on these values you can refer to
    [stdio](https://nodejs.org/dist/latest/docs/api/child_process.html#optionsstdio) documentation from Node.js. Currently this option only supports configuring `stdout` and
    `stderr` to either `pipe`, `inherit` or `ignore`. Configuring `stdin` to any property other than `ignore` is not supported and will result in an error.
    For example, the supported values will be processed as following:
    - `pipe`: equivalent to \['ignore', 'pipe', 'pipe'\]
    - `ignore`: equivalent to \['ignore', 'ignore', 'ignore'\]
    - `inherit`: equivalent to \['ignore', 'inherit', 'inherit'\] (the default)
  - `serviceName` string (optional) - Name of the process that will appear in `name` property of
    [ProcessMetric](https://www.electronjs.org/docs/latest/api/structures/process-metric) returned by [`app.getAppMetrics`](https://www.electronjs.org/docs/latest/api/app#appgetappmetrics)
    and [`child-process-gone` event of `app`](https://www.electronjs.org/docs/latest/api/app#event-child-process-gone).
    Default is `Node Utility Process`.
  - `allowLoadingUnsignedLibraries` boolean (optional) _macOS_ \- With this flag, the utility process will be
    launched via the `Electron Helper (Plugin).app` helper executable on macOS, which can be
    codesigned with `com.apple.security.cs.disable-library-validation` and
    `com.apple.security.cs.allow-unsigned-executable-memory` entitlements. This will allow the utility process
    to load unsigned libraries. Unless you specifically need this capability, it is best to leave this disabled.
    Default is `false`.
  - `disclaim` boolean (optional) _macOS_ \- With this flag, the utility process will disclaim
    responsibility for the child process. This causes the operating system to consider the child
    process as a separate entity for purposes of security policies like Transparency, Consent, and
    Control (TCC). When responsibility is disclaimed, the parent process will not be attributed
    for any TCC requests initiated by the child process. This is useful when launching processes
    that run third-party or otherwise untrusted code. Default is `false`.
  - `respondToAuthRequestsFromMainProcess` boolean (optional) - With this flag, all HTTP 401 and 407 network
    requests created via the [net module](https://www.electronjs.org/docs/latest/api/net) will allow responding to them via the
    [`login`](https://www.electronjs.org/docs/latest/api/utility-process#event-login) event on the `UtilityProcess` instance when a `session` is provided, or via
    the [`app#login`](https://www.electronjs.org/docs/latest/api/app#event-login) event in the main process when using the default system network
    context. This flag also routes client-certificate selection to the
    [`app#select-client-certificate`](https://www.electronjs.org/docs/latest/api/app#event-select-client-certificate) event in the main process; without
    it, `net` requests from the utility process proceed without a client certificate. Without this flag, auth
    challenges are handled by the default [`login`](https://www.electronjs.org/docs/latest/api/client-request#event-login) event on the
    [`ClientRequest`](https://www.electronjs.org/docs/latest/api/client-request) object. Default is `false`.

Returns [`UtilityProcess`](https://www.electronjs.org/docs/latest/api/utility-process#class-utilityprocess)

note

`utilityProcess.fork` can only be called after the `ready` event has been emitted on `App`.

## Class: UtilityProcess [​](https://www.electronjs.org/docs/latest/api/utility-process\#class-utilityprocess "Direct link to Class: UtilityProcess")

> Instances of the `UtilityProcess` represent the Chromium spawned child process
> with Node.js integration.

`UtilityProcess` is an [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter).

### Instance Methods [​](https://www.electronjs.org/docs/latest/api/utility-process\#instance-methods "Direct link to Instance Methods")

#### `child.postMessage(message, [transfer])` [​](https://www.electronjs.org/docs/latest/api/utility-process\#childpostmessagemessage-transfer "Direct link to childpostmessagemessage-transfer")

- `message` any
- `transfer` MessagePortMain\[\] (optional)

Send a message to the child process, optionally transferring ownership of
zero or more [`MessagePortMain`](https://www.electronjs.org/docs/latest/api/message-port-main) objects.

For example:

```js
// Main process

const { port1, port2 } = new MessageChannelMain()

const child = utilityProcess.fork(path.join(__dirname, 'test.js'))

child.postMessage({ message: 'hello' }, [port1])

// Child process

process.parentPort.once('message', (e) => {

  const [port] = e.ports

  // ...

})
```

#### `child.kill()` [​](https://www.electronjs.org/docs/latest/api/utility-process\#childkill "Direct link to childkill")

Returns `boolean`

Terminates the process gracefully. On POSIX, it uses SIGTERM
but will ensure the process is reaped on exit. This function returns
true if the kill is successful, and false otherwise.

### Instance Properties [​](https://www.electronjs.org/docs/latest/api/utility-process\#instance-properties "Direct link to Instance Properties")

#### `child.pid` [​](https://www.electronjs.org/docs/latest/api/utility-process\#childpid "Direct link to childpid")

A `Integer | undefined` representing the process identifier (PID) of the child process.
Until the child process has spawned successfully, the value is `undefined`. When
the child process exits, then the value is `undefined` after the `exit` event is emitted.

```js
const child = utilityProcess.fork(path.join(__dirname, 'test.js'))

console.log(child.pid) // undefined

child.on('spawn', () => {

  console.log(child.pid) // Integer

})

child.on('exit', () => {

  console.log(child.pid) // undefined

})
```

note

You can use the `pid` to determine if the process is currently running.

#### `child.stdout` [​](https://www.electronjs.org/docs/latest/api/utility-process\#childstdout "Direct link to childstdout")

A `NodeJS.ReadableStream | null` that represents the child process's stdout.
If the child was spawned with options.stdio\[1\] set to anything other than 'pipe', then this will be `null`.
When the child process exits, then the value is `null` after the `exit` event is emitted.

```js
// Main process

const { port1, port2 } = new MessageChannelMain()

const child = utilityProcess.fork(path.join(__dirname, 'test.js'))

child.stdout.on('data', (data) => {

  console.log(`Received chunk ${data}`)

})
```

#### `child.stderr` [​](https://www.electronjs.org/docs/latest/api/utility-process\#childstderr "Direct link to childstderr")

A `NodeJS.ReadableStream | null` that represents the child process's stderr.
If the child was spawned with options.stdio\[2\] set to anything other than 'pipe', then this will be `null`.
When the child process exits, then the value is `null` after the `exit` event is emitted.

### Instance Events [​](https://www.electronjs.org/docs/latest/api/utility-process\#instance-events "Direct link to Instance Events")

#### Event: 'spawn' [​](https://www.electronjs.org/docs/latest/api/utility-process\#event-spawn "Direct link to Event: 'spawn'")

Emitted once the child process has spawned successfully.

#### Event: 'error' _Experimental_ [​](https://www.electronjs.org/docs/latest/api/utility-process\#event-error-experimental "Direct link to event-error-experimental")

Returns:

- `type`string - Type of error. One of the following values:
  - `FatalError`
- `location` string - Source location from where the error originated.
- `report` string - [`Node.js diagnostic report`](https://nodejs.org/docs/latest/api/report.html#diagnostic-report).

Emitted when the child process needs to terminate due to non continuable error from V8.

No matter if you listen to the `error` event, the `exit` event will be emitted after the
child process terminates.

#### Event: 'exit' [​](https://www.electronjs.org/docs/latest/api/utility-process\#event-exit "Direct link to Event: 'exit'")

Returns:

- `code` number - Contains the exit code for
the process obtained from waitpid on POSIX, or GetExitCodeProcess on Windows.

Emitted after the child process ends.

#### Event: 'message' [​](https://www.electronjs.org/docs/latest/api/utility-process\#event-message "Direct link to Event: 'message'")

Returns:

- `message` any

Emitted when the child process sends a message using [`process.parentPort.postMessage()`](https://www.electronjs.org/docs/latest/api/process#processparentport).

#### Event: 'login' [​](https://www.electronjs.org/docs/latest/api/utility-process\#event-login "Direct link to Event: 'login'")

Returns:

- `event` Event
- `authenticationResponseDetails`Object
  - `url` URL
  - `pid` number
  - `isRequestForNavigation` boolean - Indicates whether the request is for a navigation.
  - `firstAuthAttempt` boolean - Indicates whether this is the first authentication attempt.
  - `responseHeaders` Record<string, string \| string\[\]> (optional) - The headers returned in the response.
- `authInfo`Object
  - `isProxy` boolean
  - `scheme` string
  - `host` string
  - `port` Integer
  - `realm` string
- `callback`Function
  - `username` string (optional)
  - `password` string (optional)

Emitted when the utility process encounters an HTTP 401 or 407 authentication challenge, if the
process was created with both `respondToAuthRequestsFromMainProcess: true` and a `session` option.

The default behavior is to cancel the authentication. To override this you should prevent the
default behavior with `event.preventDefault()` and call `callback(username, password)` with the
credentials. Calling `callback` without arguments will cancel the request.

This behaves the same as the [`login` event on `app`](https://www.electronjs.org/docs/latest/api/app#event-login) but is scoped to the
individual utility process instance.

```js
const { session, utilityProcess } = require('electron')

const ses = session.defaultSession

const child = utilityProcess.fork('./worker.js', [], {

  session: ses,

  respondToAuthRequestsFromMainProcess: true

})

child.on('login', (event, authenticationResponseDetails, authInfo, callback) => {

  event.preventDefault()

  callback('username', 'password')

})
```

- [Methods](https://www.electronjs.org/docs/latest/api/utility-process#methods)
  - [`fork`](https://www.electronjs.org/docs/latest/api/utility-process#utilityprocessforkmodulepath-args-options)
- [Class: UtilityProcess](https://www.electronjs.org/docs/latest/api/utility-process#class-utilityprocess)
  - [Instance Methods](https://www.electronjs.org/docs/latest/api/utility-process#instance-methods)
    - [`postMessage`](https://www.electronjs.org/docs/latest/api/utility-process#childpostmessagemessage-transfer)
    - [`kill`](https://www.electronjs.org/docs/latest/api/utility-process#childkill)
  - [Instance Properties](https://www.electronjs.org/docs/latest/api/utility-process#instance-properties)
    - [`pid`](https://www.electronjs.org/docs/latest/api/utility-process#childpid)
    - [`stdout`](https://www.electronjs.org/docs/latest/api/utility-process#childstdout)
    - [`stderr`](https://www.electronjs.org/docs/latest/api/utility-process#childstderr)
  - [Instance Events](https://www.electronjs.org/docs/latest/api/utility-process#instance-events)
    - [`'spawn'`](https://www.electronjs.org/docs/latest/api/utility-process#event-spawn)
    - [`'error'`](https://www.electronjs.org/docs/latest/api/utility-process#event-error-experimental)
    - [`'exit'`](https://www.electronjs.org/docs/latest/api/utility-process#event-exit)
    - [`'message'`](https://www.electronjs.org/docs/latest/api/utility-process#event-message)
    - [`'login'`](https://www.electronjs.org/docs/latest/api/utility-process#event-login)