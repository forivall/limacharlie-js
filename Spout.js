const request = require('request')
const JSONStream = require('JSONStream')

class Spout {
    constructor(man, dataType, dataCb, invId, tag, cat) {
        this._man = man
        this._dataType = dataType
        this._invId = invId
        this._tag = tag
        this._cat = cat
        this._spoutUrl = null
        this._dataCb = dataCb

        let url = `https://output.limacharlie.io/output/${this._man._oid}`
        let spoutConf = {
            api_key: this._man._secretApiKey,
            type: this._dataType,
        }

        if(this._invId) {
            spoutConf['inv_id'] = this._invId
        }
        if(this._tag) {
            spoutConf['tag'] = this._tag
        }
        if(this._cat) {
            spoutConf['cat'] = this._cat
        }

        var isNode = false;
        if (typeof window === 'undefined') {
            isNode = true;
        }

        // The Node HTTP POST and the browser one behave differently.
        // It is IMPOSSIBLE to prevent the browser from following the
        // redirect and since a stream is at that redirect we would
        // hang forever.
        if(isNode) {
            request
            .post(url)
            .form(spoutConf)
            .on('response', (response) => {
                this._spoutUrl = response.headers.location
                this.resume()
            })
        } else {
            // This does mean that in the browser we cannot stop
            // and resume the Spout.
            request
            .post(url)
            .form(spoutConf)
            .pipe(JSONStream.parse())
            .on('data', data => {
                this._dataCb(data)
            })
        }
    }

    shutdown() {
        if(this._stream) {
            this._stream.abort()
            this._stream = null
        }
    }

    resume() {
        if(this._stream) {
            console.error("Stream already running.")
            throw new Error("Stream already running.")
        }
        if(!this._spoutUrl) {
            console.error("Spout not initialized.")
            throw new Error("Spout not initialized.")
        }

        this._stream = request.get(this._spoutUrl)
        this._stream.pipe(JSONStream.parse())
        .on('data', data => {
            this._dataCb(data)
        })
    }
}

module.exports = Spout