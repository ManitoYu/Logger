;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.Logger = factory()
}(this, (function () { 'use strict'

class LocalStoragePersistenceEngine {
	onRestore(prefix, cb) {
		keys(localStorage).forEach(k => {
			if (k.indexOf(prefix) === -1) return
			cb({ id: k.replace(prefix, ''), log: JSON.parse(localStorage.getItem(k)) })
		})
	}

	onPersist(prefix, logId, log) {
		localStorage.setItem(`${prefix}${logId}`, JSON.stringify(log))
	}

	onClear(prefix, logId) {
		localStorage.removeItem(`${prefix}${logId}`)
	}
}

class SessionStoragePersistenceEngine {
	onRestore(prefix, cb) {
		keys(sessionStorage).forEach(k => {
			if (k.indexOf(prefix) === -1) return
			cb(JSON.parse(sessionStorage.getItem(k)))
		})
	}

	onPersist(prefix, logId, log) {
		sessionStorage.setItem(`${prefix}${logId}`, JSON.stringify(log))
	}

	onClear(prefix, logId) {
		sessionStorage.removeItem(`${prefix}${logId}`)
	}
}

let timer = null

class Logger {
	constructor() {
		const buffer = []

		let batchSize_ = 10
		let batchTimeout_ = 10000
		let logLevel_ = this.Level.Info
		let source_ = this.Source.Web
		let version_ = ''
		let mode_ = this.Mode.Console
		let isPersistence_ = false
		let storagePrefix_ = ''
		let persistenceEngine_ = null

		let onSendCallback_ = null
		let onFormatCallback_ = null

		Object.defineProperty(this, 'buffer', { value: buffer })

		Object.defineProperty(this, 'batchSize', {
			set(size) {
				assert(isNumber(size), 'size must be a number')
				assert(String(size).indexOf('.') === -1, 'size must be an integer')
				assert(size > 0, 'size must be greater then 0')
				batchSize_ = size
			},
			get() {
				return batchSize_
			}
		})

		Object.defineProperty(this, 'batchTimeout', {
			set(time) {
				assert(isNumber(time), 'time must be a number')
				assert(String(time).indexOf('.') === -1, 'time must be an integer')
				assert(time >= 0, 'time must be greater then or equal to 0')
				batchTimeout_ = time
			},
			get() {
				return batchTimeout_
			}
		})

		Object.defineProperty(this, 'logLevel', {
			set(level) {
				assert(values(this.Level).some(v => level == v), 'invalid logger level')
				logLevel_ = level
			},
			get() {
				return logLevel_
			}
		})

		Object.defineProperty(this, 'source', {
			set(source) {
				assert(values(this.Source).some(v => source == v), 'invalid logger source')
				source_ = source
			},
			get() {
				return source_
			}
		})

		Object.defineProperty(this, 'version', {
			set(version) {
				assert(isString(version), 'logger version must be a string')
				version_ = version
			},
			get() {
				return version_
			}
		})

		Object.defineProperty(this, 'mode', {
			set(mode) {
				assert(values(this.Mode).some(v => mode == v), 'invalid logger mode')
				mode_ = mode
			},
			get() {
				return mode_
			}
		})

		Object.defineProperty(this, 'onSendCallback', {
			set(cb) {
				assert(isFunction(cb), 'cb must be a function')
				onSendCallback_ = cb
			},
			get() {
				return onSendCallback_
			}
		})

		Object.defineProperty(this, 'onFormatCallback', {
			set(cb) {
				assert(isFunction(cb), 'cb must be a function')
				onFormatCallback_ = cb
			},
			get() {
				return onFormatCallback_
			}
		})

		Object.defineProperty(this, 'storagePrefix', {
			set(storagePrefix) {
				assert(isString(storagePrefix), 'storagePrefix must be a string')
				storagePrefix_ = storagePrefix
			},
			get() {
				return storagePrefix_
			}
		})

		Object.defineProperty(this, 'isPersistence', {
			set(isPersistence) {
				assert(isBoolean(isPersistence), 'isPersistence must be a boolean')
				isPersistence_ = isPersistence
			},
			get() {
				return isPersistence_
			}
		})

		Object.defineProperty(this, 'persistenceEngine', {
			set(persistenceEngine) {
				assert(isFunction(persistenceEngine), 'persistenceEngine must be a class')
				assert(isFunction(persistenceEngine.prototype.onPersist), 'persistenceEngine.prototype.onPersist must be a function')
				assert(isFunction(persistenceEngine.prototype.onClear), 'persistenceEngine.prototype.onClear must be a function')
				assert(isFunction(persistenceEngine.prototype.onRestore), 'persistenceEngine.prototype.onRestore must be a function')
				persistenceEngine_ = new persistenceEngine()
			},
			get() {
				return persistenceEngine_
			}
		})

		setTimeout(() => {
			if (this.isPersistence) {
				assert(!isNull(this.persistenceEngine), 'persistenceEngine must not be null')
				this.restoreFromStorage()
			}
		})
	}

	setLogLevel(level) {
		this.logLevel = level
		return this
	}

	setBatchSize(size) {
		this.batchSize = size
		return this
	}

	setBatchTimeout(time) {
		this.batchTimeout = time
		return this
	}

	setSource(source) {
		this.source = source
		return this
	}

	setVersion(version) {
		this.version = version
		return this
	}

	setMode(mode) {
		this.mode = mode
		return this
	}

	debug(...contents) {
		this.log(this.Level.Debug, ...contents)
	}

	info(...contents) {
		this.log(this.Level.Info, ...contents)
	}

	notice(...contents) {
		this.log(this.Level.Notice, ...contents)
	}

	warning(...contents) {
		this.log(this.Level.Warning, ...contents)
	}

	error(...contents) {
		this.log(this.Level.Error, ...contents)
	}
	
	critical(...contents) {
		this.log(this.Level.Critical, ...contents)
	}

	alert(...contents) {
		this.log(this.Level.Alert, ...contents)
	}

	emergency(...contents) {
		this.log(this.Level.Emergency, ...contents)
	}

	log(level, ...contents) {
		if (level.level < this.logLevel.level) return

		const log = this.makeLog(
			level.levelStr,
			time(),
			contents,
			this.source,
			this.version
		)

		if (this.mode == this.Mode.Console) {
			console.log(log)
		}

		if (this.mode == this.Mode.Server) {
			this.writeLog(log)
		}
	}

	makeLog(level, time, contents, source, version) {
		const ctx = {
			time,
			version,
			source,
			level
		}

		let log = null

		if (isNull(this.onFormatCallback)) {
			log = Object.assign(ctx, { contents })
		} else {
			log = this.onFormatCallback(ctx, contents)
		}

		return { id: Math.random().toString(36).slice(2), log }
	}

	writeLog(log) {
		this.buffer.push(log)
		
		if (this.isPersistence) {
			this.persistToStorage(log.id, log.log)
		}

		if (this.buffer.length >= this.batchSize) {
			const logs = this.buffer.slice(0, this.batchSize)
			this.buffer.splice(0, this.batchSize)
			this.send(logs)
		}

		if (!timer) {
			if (this.batchTimeout == 0) return
			if (this.buffer.length == 0) return
			timer = setTimeout(() => {
				const logs = this.buffer.slice()
				this.buffer.splice(0, this.buffer.length)
				this.send(logs)
				timer = null
			}, this.batchTimeout)
		}
	}

	restoreFromStorage() {
		this.persistenceEngine.onRestore(this.storagePrefix, this.writeLog.bind(this))
	}

	persistToStorage(logId, log) {
		this.persistenceEngine.onPersist(this.storagePrefix, logId, log)
	}

	clearFromStorage(logId) {
		this.persistenceEngine.onClear(this.storagePrefix, logId)
	}

	onFormat(cb) {
		this.onFormatCallback = cb
		return this
	}

	onSend(cb) {
		this.onSendCallback = cb
		return this
	}

	setPersistence(isPersistence) {
		this.isPersistence = isPersistence
		return this
	}

	setPersistenceEngine(persistenceEngine) {
		this.persistenceEngine = persistenceEngine
		return this
	}

	setStoragePrefix(storagePrefix) {
		this.storagePrefix = storagePrefix
		return this
	}

	send(logs) {
		if (logs.length === 0) return
		if (isNull(this.onSendCallback)) return
		this.onSendCallback(logs.map(log => log.log)).then(() => {
			if (this.isPersistence) {
				logs.forEach(log => this.clearFromStorage(log.id))
			}
		})
	}
}

Object.defineProperty(Logger.prototype, 'Level', {
	value: {
		All: { level: -9007199254740991, levelStr: 'all' } ,
		Debug: { level: 100, levelStr: 'debug' },
		Info: { level: 200, levelStr: 'info' },
		Notice: { level: 300, levelStr: 'notice' },
		Warning: { level: 400, levelStr: 'warning' },
		Error: { level: 500, levelStr: 'error' },
		Critical: { level: 600, levelStr: 'critical' },
		Alert: { level: 700, levelStr: 'alert' },
		Emergency: { level: 800, levelStr: 'emergency' },
		Off: { level: 9007199254740991, levelStr: 'off' }
	}
})

Object.defineProperty(Logger.prototype, 'Source', {
	value: {
		Web: 'web',
		WebMobile: 'web-mobile',
		WebWeChat: 'web-wechat',
		App: 'app'
	}
})

Object.defineProperty(Logger.prototype, 'Mode', {
	value: {
		Console: 'console',
		Server: 'server'
	}
})

Object.defineProperty(Logger.prototype, 'PersistenceEngine', {
	value: {
		LocalStorage: LocalStoragePersistenceEngine,
		SessionStorage: SessionStoragePersistenceEngine
	}
})

Logger.sharedInstance = new Logger()

function assert(value, message = '') {
	if (!value) throw new Error(message)
}

function isString(obj) {
	return typeof obj === 'string'
}

function isNumber(value) {
	return typeof value === 'number'
}

function isFunction(fn) {
	return typeof fn === 'function'
}

function isNull(obj) {
	return obj === null
}

function isBoolean(value) {
	return typeof value === 'boolean'
}

function isPlainObject(obj) {
	return Object.prototype.toString.call(obj) == '[object Object]'
}

function time() {
	const date = new Date()

	return date.getFullYear() + '-'
		+ (date.getMonth() + 1) + '-'
		+ ('0' + date.getDate()).slice(-2) + ' '
		+ date.getHours() + ':'
		+ date.getMinutes() + ':'
		+ date.getSeconds()
}

function values(obj) {
	const arr = []
	for (let pro in obj) {
		if (obj.hasOwnProperty(pro)) {
			arr.push(obj[pro])
		}
	}
	return arr
}

function keys(obj) {
	const arr = []
	for (let pro in obj) {
		if (obj.hasOwnProperty(pro)) {
			arr.push(pro)
		}
	}
	return arr
}

return Logger.sharedInstance

})))



