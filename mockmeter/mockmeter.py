from pathlib import Path
import random
import string

import cherrypy
from cherrypy._cpdispatch import Dispatcher

""" Crude attempt at capturing missed URLs using a Tool hook.  This might be workable,
but it seems like a lot of manual intervention for what might be more straightforward.

Better solution might exist with a custom Dispatch(), or
Cascading WSGI middleware apps.

Handling the need to serve static files from more than one local dir to /
by pipelining a second CherryPy app
"""

@cherrypy.tools.register('before_finalize', priority=90)
def logit():
    if cherrypy.response.status == 404:
        print('Whoa -->', cherrypy.response.status, cherrypy.request.path_info)
        # if 'network.cgi' in cherrypy.request.path_info:
        #     cherrypy.response.status = None
        #     cherrypy.response.body = bytes('\n'.join([
        #         "0",
        #         "hostname",
        #         "192.168.0.172",
        #         "192.168.0.1",
        #         "255.255.255.0",
        #         "0",
        #     ]),'utf-8')
        #     del cherrypy.response.headers['content-length']



@cherrypy.tools.logit()
@cherrypy.tools.staticdir(dir='./cgi', root=Path.cwd()/'resources/mx50')
class Test1App(object):
    @cherrypy.expose
    def test1(self):
        return """<html>
          <body>
          Hello from Test 1
          </body>
        </html>"""
    
    @cherrypy.expose
    def network_cgi(self, ms):
        return bytes('\n'.join([
            "0",
            "hostname",
            "192.168.0.172",
            "192.168.0.1",
            "255.255.255.0",
            "0",
        ]),'utf-8')


class T1Factory(cherrypy.Application):
    def __init__(self, nextapp):
        self.nextapp = nextapp
        super().__init__(Test1App())

    def __call__(self, environ, start_response):
        # relies on nextapp.default() raising InternalRedirect
        try:
            me = self.nextapp(environ, start_response)
            return me
        except:
            me = super().__call__(environ, start_response)
            print('HANDLING EXCEPTION', cherrypy.request.path_info)
            return me

@cherrypy.tools.staticdir(dir='./web_pages', root=Path.cwd()/'resources/mx50', index='index.html')
class StringGenerator(object):
    def __init__(self):
      self.cnt = 0

    @cherrypy.expose
    def demo_index(self):
        return """<html>
          <head>
            <link href="/static/css/style.css" rel="stylesheet">
          </head>
          <body>
            <form method="get" action="generate">
              <input type="text" value="8" name="length" />
              <button type="submit">Give it now!</button>
            </form>
          </body>
        </html>"""

    @cherrypy.expose
    def generate(self, length=8):
        some_string = ''.join(random.sample(string.hexdigits, int(length)))
        cherrypy.session['mystring'] = some_string
        return some_string

    @cherrypy.expose
    def display(self):
        return cherrypy.session['mystring']

    @cherrypy.expose
    def test(self):
        raise cherrypy.HTTPError(500)

    @cherrypy.expose
    def identity_cgi(self, ms):
        self.cnt += 1
        return "0\nMx50_amw\nMx50_desc\nMx50_owner\nct={}\n0".format(self.cnt)

    @cherrypy.expose
    def default(self, attr, *args, **kwargs):
    #     # wont trap if url and method param signatures dont match
    #     # e.g. default(self, attr) wont trap input.cgi?ms=1
    #     # and  default(self, attr, ms) won't trap input.cgi
        raise cherrypy.InternalRedirect('./cgi')


# class Capture404Dispatcher(Dispatcher):
#     def __call__(self, path_info):
#         x= super().__call__(path_info)
#         print(path_info,cherrypy.serving.request.handler)
#         # shows a 404 for any url not exposed in class
#         # but the url may get served from the statics later
#         return x


if __name__ == '__main__':
    conf = {
        '/': {
            # 'request.dispatch': Capture404Dispatcher(),
            'tools.sessions.on': True,
            'wsgi.pipeline': [('cascade', T1Factory)]
        },
        '/favicon.ico': {
            'tools.staticfile.on': True,
            'tools.staticfile.root': Path.cwd()/'resources/mx50',
            'tools.staticfile.filename': './web_pages/favicon.ico'
        }
    }
    cherrypy.config.update({
        'engine.autoreload.on': False,
        'server.socket_host': '127.0.0.1',
        'server.socket_port': 4249
    })
    cherrypy.tree.mount(StringGenerator(), '/', conf)

    cherrypy.engine.start()
    cherrypy.engine.block()