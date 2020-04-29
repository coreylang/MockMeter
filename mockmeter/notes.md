# Mx50 Mock Webserver

## Notes

### Response headers

CherryPy allows detailed configuration of the response headers.  So, the mock
web server can be a fairly close approximation of the embedded web server.  A
thorough comparison has not yet been done.  For example,

Meter:

``` generic
Connection: Keep-Alive
Content-Type: text/plain
Transfer-Encoding: chunked
```

CherryPy:

``` generic
  Accept-Ranges: bytes
  Content-Length: 64
  Content-Type: text/html
  Date: Wed, 28 Nov 2018 15:08:13 GMT
  Last-Modified: Wed, 28 Nov 2018 14:43:06 GMT
  Server: CherryPy/18.0.1
```

Response header differences can be reconciled with:

``` python
@cherrypy.tools.response_headers(headers=[('Content-Type','text/plain')])
```

### install commands

#### from github commit

``` cmd
pip install -e git+https://github.com/bitronics-llc/MockMeter#egg=mockmeter
```

#### from local commit

``` cmd
pip install -e git+file:\\c:\dev\wkone\mockmeter\mockmeter#egg=mockmeter --src .
```

#### from local working without source copy

``` cmd
pip install -e file:\\c:\dev\wkone\mockmeter\mockmeter
```

### Emulating TUC protocol maps

The ord object is passed to tuc.js:serCollection(), JSON.stringify(ord) looks like

``` js
{"name":"mbOrder_3","version":"0.1.0","lists":[{"type":"REGS","desc":"Modbus Registers","address":40001,"serdes":["dbIdx","calcType"],"vec":[{"dbIdx":2070,"calcType":79},{"dbIdx":5,"calcType":37},{"dbIdx":6,"calcType":37},{"dbIdx":7,"calcType":37},{"dbIdx":1,"calcType":40},{"dbIdx":2,"calcType":40},{"dbIdx":3,"calcType":40},{"dbIdx":15,"calcType":46},{"dbIdx":19,"calcType":46},{"dbIdx":38,"calcType":35},{"dbIdx":145,"calcType":82},{"dbIdx":145,"calcType":83},{"dbIdx":146,"calcType":82},{"dbIdx":146,"calcType":83}]}]}
```

while the string output of serCollection() looks like

``` js
var mbOrder = [
["mbOrder_3", "0.1.0"],
[
["REGS", "Modbus Registers", 40001],
["dbIdx", "calcType"],
[2070,79],[5,37],[6,37],[7,37],[1,40],[2,40],[3,40],[15,46],[19,46],[38,35],[145,82],[145,83],[146,82],[146,83]
]
];
```

## Issues

### 001

When pressing apply after editing point list, the following is unhandled
`"POST /protocol1.html HTTP/1.1" 200 24032 "http://localhost:4249/protocol1.html"`
Causes a lengthy timeout, and creates a cgi/protocol-html

``` python
params = {'serCollection':
    'var mbOrder = [\r\n["mbOrder_3", "0.1.0"],\r\n[\r\n["REGS", "Modbus Registers", 40001],\r\n["dbIdx", "calcType"],\r\n[2070,79],\r\n[5,37], ...'
}
```

### 002

File uploads to the webserver are not properly forwarded to the meter.

## Todos

* [X] ~~*Resolve Issue 001*~~ [2018-12-13]
* [X] ~~*Resolve Issue 002*~~ [2018-12-14]
* [X] ~~*Add support for folder specification*~~ [2018-12-27]
* [X] ~~*Cleanup log formats*~~ [2018-12-26]
* [X] ~~*Convert prints to log*~~ [2018-12-26]
* [X] ~~*Create distribution method*~~ [2018-12-26]
  * consider [vcs distribution](https://pip.pypa.io/en/latest/reference/pip_install/#vcs-support)
* [X] ~~*Add [signal handler](http://docs.cherrypy.org/en/latest/pkg/cherrypy.process.html#cherrypy.process.plugins.SignalHandler) for shutdown*~~ [2018-12-26]
* [X] ~~*Add cli() entry point.*~~ [2018-12-27]
* [ ] Make README.md example more interesting
  * once we have more than the default cgi
