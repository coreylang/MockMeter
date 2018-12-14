# Mx50 Mock Webserver

## Notes

### Response headers

CherryPy allows detailed configuration of the response headers.  So, the mock
web server can be a fairly close approximation of the embedded web server.  A
thorough comparison has not yet been done.  For example,

Meter:

    Connection: Keep-Alive
    Content-Type: text/plain
    Transfer-Encoding: chunked

CherryPy:

    Accept-Ranges: bytes
    Content-Length: 64
    Content-Type: text/html
    Date: Wed, 28 Nov 2018 15:08:13 GMT
    Last-Modified: Wed, 28 Nov 2018 14:43:06 GMT
    Server: CherryPy/18.0.1

Response header differences can be reconciled with:
`@cherrypy.tools.response_headers(headers=[('Content-Type','text/plain')])`

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
* [ ] Add support for folder specification
